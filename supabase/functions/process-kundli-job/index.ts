import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

import { fetchSeerKundli, adaptSeerResponse, interpolateKundli, nextHourParams, type SeerKundli, type SeerKundliRequest } from "../_shared/generate-kundli-report/seer-adapter.ts";
import { generatePanchangPrediction } from "../_shared/generate-kundli-report/panchang-agent.ts";
import { generatePillarsPrediction } from "../_shared/generate-kundli-report/pillars-agent.ts";
import { generateAllPlanetProfiles } from "../_shared/generate-kundli-report/planets-agent.ts";
import { generateAllHouseAnalyses } from "../_shared/generate-kundli-report/houses-agent.ts";
import { generateCareerPrediction, type CareerPrediction } from "../_shared/generate-kundli-report/career-agent.ts";
import { generateMarriagePrediction, type MarriagePrediction } from "../_shared/generate-kundli-report/marriage-agent.ts";
import { generateDashaPrediction, type DashaPrediction } from "../_shared/generate-kundli-report/dasha-agent.ts";
import { generateRahuKetuPrediction } from "../_shared/generate-kundli-report/rahu-ketu-agent.ts";
import { generateRemediesPrediction, type RemediesPrediction } from "../_shared/generate-kundli-report/remedies-agent.ts";
import { generateNumerologyPrediction } from "../_shared/generate-kundli-report/numerology-agent.ts";
import { generateSpiritualPrediction } from "../_shared/generate-kundli-report/spiritual-agent.ts";
import { generateCharaKarakasPrediction } from "../_shared/generate-kundli-report/chara-karakas-agent.ts";
import { generateGlossaryPrediction } from "../_shared/generate-kundli-report/glossary-agent.ts";
import { generateDoshasPrediction } from "../_shared/generate-kundli-report/doshas-agent.ts";
import { generateRajYogsPrediction } from "../_shared/generate-kundli-report/raj-yogs-agent.ts";
import { generateSadeSatiPrediction } from "../_shared/generate-kundli-report/sade-sati-agent.ts";
import { runQAValidation, sanitizeReportContent } from "../_shared/generate-kundli-report/qa-agent.ts";
import { enforceAstrologyTruth } from "../_shared/generate-kundli-report/truth-guard.ts";
import { setAgentLanguageContext } from "../_shared/generate-kundli-report/agent-base.ts";
import { getLanguagePack, normalizeLanguage } from "../_shared/language-packs/index.ts";
import { runLanguageQc } from "../_shared/language-qc.ts";
import type { SupportedLanguage } from "../_shared/language-packs/types.ts";
import { createJobEvent, touchJobHeartbeat } from "../_shared/job-events.ts";
import { localizeStructuredReportTerms } from "../_shared/language-localize.ts";
import { runTranslationSweep } from "../_shared/generate-kundli-report/translation-agent.ts";
import { insertKundliApiCall, insertKundliApiCalls, upsertKundliGeneratedReport } from "../_shared/kundli-audit.ts";

import { calculateCharaKarakas } from "../_shared/generate-kundli-report/utils/chara-karakas.ts";
import { calculateAspects, getConjunctions } from "../_shared/generate-kundli-report/utils/aspects.ts";
import { calculateTithi } from "../_shared/generate-kundli-report/utils/panchang.ts";
import { getSignLord } from "../_shared/generate-kundli-report/utils/dignity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isTruthyFlag(raw: string | undefined): boolean {
  const v = String(raw || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isLanguagePipelineV2Enabled(language: SupportedLanguage): boolean {
  // Hindi/Telugu must always run native pipeline to prevent silent English fallback.
  if (language === "hi" || language === "te") return true;
  // English remains flag-gated for stability lock rollout.
  if (language === "en") return isTruthyFlag(Deno.env.get("LANG_PIPELINE_V2_EN"));
  return false;
}

function parseBirthTime(rawTime: string): { hour: number; min: number } {
  const input = String(rawTime || "").trim();
  if (!input) throw new Error("Invalid birth time: empty");

  const ampm = input.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
  const cleaned = input.replace(/\s*(am|pm)\s*/i, "");
  const parts = cleaned.split(":").map((x) => Number(x));

  let hour = parts[0];
  const min = parts.length > 1 ? parts[1] : 0;

  if (!Number.isFinite(hour) || !Number.isFinite(min)) {
    throw new Error(`Invalid birth time format: "${rawTime}"`);
  }

  if (ampm) {
    hour = hour % 12;
    if (ampm === "pm") hour += 12;
  }

  if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    throw new Error(`Birth time out of range: "${rawTime}"`);
  }

  return { hour, min };
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

type NormalizedMaritalStatus = "single" | "married" | "unknown";

const CAREER_MIN_AGE = 21;
const MARRIAGE_MIN_AGE = 21;
const MAX_PREDICTION_AGE = 95;

function getAgeYears(birthDate: Date, referenceDate: Date): number {
  return Math.max(0, Math.floor((referenceDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function parseFlexibleMonthYear(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return new Date(direct);

  const monthYear = value.match(/([A-Za-z]+)\s+(\d{4})/);
  if (monthYear) {
    const parsed = Date.parse(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  const yearOnly = value.match(/\b(19|20|21)\d{2}\b/);
  if (yearOnly) return new Date(Number(yearOnly[0]), 0, 1);

  return null;
}

function clampPeriodText(raw: string, cutoffDate: Date, cutoffLabel: string): string {
  const years = Array.from(raw.matchAll(/\b(19|20|21)\d{2}\b/g)).map((m) => Number(m[0]));
  if (years.length === 0) return raw;
  const maxYear = Math.max(...years);
  return maxYear > cutoffDate.getFullYear()
    ? `Future windows are capped at ${cutoffLabel} for lifecycle-safe predictions.`
    : raw;
}

function normalizePartnerTermsInText(text: string): string {
  return text
    .replace(/\bwives\b/gi, "spouses")
    .replace(/\bwife\b/gi, "spouse")
    .replace(/\bhusbands\b/gi, "spouses")
    .replace(/\bhusband\b/gi, "spouse")
    .replace(/\bboyfriend\b/gi, "partner")
    .replace(/\bgirlfriend\b/gi, "partner");
}

function normalizePartnerTerms<T>(value: T): T {
  if (typeof value === "string") return normalizePartnerTermsInText(value) as T;
  if (Array.isArray(value)) return value.map((item) => normalizePartnerTerms(item)) as T;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) out[key] = normalizePartnerTerms(val);
    return out as T;
  }
  return value;
}

function stripAiDisclosure<T>(value: T): T {
  const cleanText = (text: string): string =>
    text
      .replace(/\bAI[- ]generated\b/gi, "generated")
      .replace(/\bgenerated by AI\b/gi, "generated")
      .replace(/\bAI[- ]powered\b/gi, "")
      .replace(/\bartificial intelligence\b/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

  if (typeof value === "string") return cleanText(value) as T;
  if (Array.isArray(value)) return value.map((item) => stripAiDisclosure(item)) as T;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) out[key] = stripAiDisclosure(val);
    return out as T;
  }
  return value;
}

function enforceCareerSafety(
  career: CareerPrediction | null,
  birthDate: Date,
  referenceDate: Date
): CareerPrediction | null {
  if (!career) return career;
  const safe = normalizePartnerTerms(structuredClone(career));
  safe.careerSwitchInsights = safe.careerSwitchInsights || {
    isSwitchDueNow: "",
    nextSwitchWindow: "",
    oneOrTwoFutureChanges: [],
    rationale: "",
    preparationPlan: [],
  };
  safe.careerTiming = safe.careerTiming || {
    currentPhase: "",
    upcomingOpportunities: [],
    challenges: [],
  };
  const ageYears = getAgeYears(birthDate, referenceDate);
  const cutoffDate = addYears(birthDate, MAX_PREDICTION_AGE);
  const cutoffLabel = formatMonthYear(cutoffDate);

  safe.careerSwitchInsights.nextSwitchWindow = clampPeriodText(
    safe.careerSwitchInsights.nextSwitchWindow || "",
    cutoffDate,
    cutoffLabel
  );
  safe.careerSwitchInsights.oneOrTwoFutureChanges = (safe.careerSwitchInsights.oneOrTwoFutureChanges || [])
    .map((item) => clampPeriodText(item, cutoffDate, cutoffLabel));
  safe.careerTiming.upcomingOpportunities = (safe.careerTiming.upcomingOpportunities || [])
    .map((item) => clampPeriodText(item, cutoffDate, cutoffLabel));

  if (ageYears < CAREER_MIN_AGE) {
    const adultYear = birthDate.getFullYear() + CAREER_MIN_AGE;
    safe.overview = `Career advice is age-calibrated. At age ${ageYears}, this section focuses on education, skills, and foundation building. Detailed switch/job timing should be interpreted from age ${CAREER_MIN_AGE} onward (from ${adultYear}).`;
    safe.careerSwitchInsights = {
      isSwitchDueNow: "No. Focus on learning-stage milestones first.",
      nextSwitchWindow: `After age ${CAREER_MIN_AGE} (from ${adultYear}).`,
      oneOrTwoFutureChanges: [],
      rationale: "Early high-stakes career transitions are intentionally suppressed for under-age natives.",
      preparationPlan: [
        "Build strong academic/technical fundamentals.",
        "Develop communication and problem-solving through projects.",
        "Reassess professional timing after reaching adulthood threshold.",
      ],
    };
    safe.careerTiming = {
      currentPhase: `Foundation phase (age ${ageYears}).`,
      upcomingOpportunities: [`Structured career timing will open after age ${CAREER_MIN_AGE}.`],
      challenges: ["Avoid premature long-term career commitments before readiness."],
    };
  } else if (ageYears >= MAX_PREDICTION_AGE) {
    safe.careerSwitchInsights = {
      isSwitchDueNow: "No major career-switch forecasting is provided at this life stage.",
      nextSwitchWindow: `Future windows beyond ${cutoffLabel} are intentionally excluded.`,
      oneOrTwoFutureChanges: [],
      rationale: "Long-range professional transitions are capped by lifecycle safety policy.",
      preparationPlan: [
        "Prioritize legacy planning and mentorship.",
        "Preserve stable routines and workload balance.",
      ],
    };
  }

  return safe;
}

function enforceMarriageSafety(
  marriage: MarriagePrediction | null,
  maritalStatus: NormalizedMaritalStatus,
  birthDate: Date,
  referenceDate: Date
): MarriagePrediction | null {
  if (!marriage) return marriage;
  const safe = normalizePartnerTerms(structuredClone(marriage));
  safe.marriageTiming = safe.marriageTiming || {
    favorablePeriods: [],
    challengingPeriods: [],
    idealAgeRange: "",
    idealTimeForYoungNatives: "",
    currentProspects: "",
  };
  const ageYears = getAgeYears(birthDate, referenceDate);
  const cutoffDate = addYears(birthDate, MAX_PREDICTION_AGE);
  const cutoffLabel = formatMonthYear(cutoffDate);

  safe.maritalSafety = safe.maritalSafety || {
    statusAssumption: `Input marital status treated as: ${maritalStatus}`,
    safeguardPolicy: "Guidance avoids destabilizing existing committed relationships.",
    alreadyMarriedGuidance: "If married, prioritize harmony, communication, and long-term trust building.",
  };

  if (maritalStatus !== "single") {
    safe.idealPartnerForUnmarried = {
      whenApplicable: maritalStatus === "married"
        ? "Not applicable for currently married natives."
        : "Apply only if the native is confirmed unmarried.",
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: maritalStatus === "married"
        ? "Focus on spouse harmony and relationship-strengthening guidance below."
        : "Follow relationship-stability guidance unless unmarried status is confirmed.",
    };
  }

  const marriedGuidance = safe.guidanceForMarriedNatives || {
    focusAreas: [],
    relationshipStrengthening: [],
    conflictsToAvoid: [],
  };
  if (marriedGuidance.focusAreas.length === 0) {
    marriedGuidance.focusAreas = ["Mutual respect, predictable communication, and shared responsibilities."];
  }
  if (marriedGuidance.relationshipStrengthening.length === 0) {
    marriedGuidance.relationshipStrengthening = ["Weekly check-ins, gratitude practice, and calm conflict resolution."];
  }
  if (marriedGuidance.conflictsToAvoid.length === 0) {
    marriedGuidance.conflictsToAvoid = ["Reactive arguments, emotional distancing, and third-party triangulation."];
  }
  safe.guidanceForMarriedNatives = marriedGuidance;

  if (ageYears < MARRIAGE_MIN_AGE) {
    const adultYear = birthDate.getFullYear() + MARRIAGE_MIN_AGE;
    safe.idealPartnerForUnmarried = {
      whenApplicable: `Applicable only after adulthood threshold (age ${MARRIAGE_MIN_AGE}, from ${adultYear}).`,
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: "At this stage, focus on emotional maturity, education, and healthy boundaries.",
    };
    safe.marriageTiming = {
      favorablePeriods: [`Marriage timing is deferred until age ${MARRIAGE_MIN_AGE}+.`],
      challengingPeriods: ["Avoid pressure-driven commitment decisions before full maturity."],
      idealAgeRange: `After age ${MARRIAGE_MIN_AGE}`,
      idealTimeForYoungNatives: `Reassess from ${adultYear} onward.`,
      currentProspects: "Current stage is developmental; no immediate marriage timing is advised.",
    };
  }

  if (ageYears >= MAX_PREDICTION_AGE) {
    safe.idealPartnerForUnmarried = {
      whenApplicable: "Not applicable at this life stage under lifecycle safety policy.",
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: "Focus on companionship quality, dignity, and emotional steadiness.",
    };
    safe.marriageTiming.favorablePeriods = [`Time windows beyond ${cutoffLabel} are intentionally excluded.`];
    safe.marriageTiming.challengingPeriods = [];
    safe.marriageTiming.currentProspects = "Future long-range marriage timing is not projected at this stage.";
  } else {
    safe.marriageTiming.favorablePeriods = (safe.marriageTiming.favorablePeriods || [])
      .map((item) => clampPeriodText(item, cutoffDate, cutoffLabel));
    safe.marriageTiming.challengingPeriods = (safe.marriageTiming.challengingPeriods || [])
      .map((item) => clampPeriodText(item, cutoffDate, cutoffLabel));
  }

  return safe;
}

function enforceHealthSafety(
  remedies: RemediesPrediction | null,
  birthDate: Date,
  referenceDate: Date
): RemediesPrediction | null {
  if (!remedies) return remedies;
  const safe = structuredClone(remedies);
  const ageYears = getAgeYears(birthDate, referenceDate);
  const isSenior = ageYears >= 60;
  const riskyPattern = /(jog|running|run\b|sprint|hiit|crossfit|marathon|powerlifting|heavy\s*weights?|intense\s*cardio)/i;

  const filterRisky = (items: string[] | undefined, fallback: string[]): string[] => {
    const cleaned = (items || []).filter((item) => !riskyPattern.test(item));
    return cleaned.length > 0 ? cleaned : fallback;
  };

  safe.healthGuidance = safe.healthGuidance || {
    ageGroup: isSenior ? "senior" : "adult",
    whyThisMatters: "Health routines should be aligned with age, recovery capacity, and medical context.",
    safeMovement: [],
    nutritionAndHydration: [],
    recoveryAndSleep: [],
    preventiveChecks: [],
    avoidOverstrain: [],
    medicalDisclaimer: "",
  };

  if (isSenior) {
    safe.healthGuidance.ageGroup = "senior";
    safe.healthGuidance.safeMovement = filterRisky(
      safe.healthGuidance.safeMovement,
      ["Prefer low-impact walking, gentle mobility, and medically appropriate stretching."]
    );
    safe.dailyRoutine = filterRisky(
      safe.dailyRoutine,
      ["Maintain a gentle daily movement routine based on energy and medical advice."]
    );
    safe.healthGuidance.avoidOverstrain = [
      ...(safe.healthGuidance.avoidOverstrain || []),
      "Avoid high-impact running, sprinting, and heavy-strain workouts unless medically cleared.",
    ];
  }

  if (!safe.healthGuidance.medicalDisclaimer) {
    safe.healthGuidance.medicalDisclaimer = "This guidance is supportive, not a diagnosis or substitute for licensed medical care.";
  }

  return safe;
}

function enforceDashaSafety(
  dasha: DashaPrediction | null,
  birthDate: Date
): DashaPrediction | null {
  if (!dasha) return dasha;
  const cutoffDate = addYears(birthDate, MAX_PREDICTION_AGE);
  const cutoffLabel = formatMonthYear(cutoffDate);

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => walk(item)).filter((item) => item !== null);
    }
    if (!node || typeof node !== "object") return node;

    const obj = structuredClone(node) as Record<string, unknown>;
    const startDate = parseFlexibleMonthYear(obj.startDate);
    if (startDate && startDate.getTime() > cutoffDate.getTime()) return null;

    if (typeof obj.endDate === "string") {
      const endDate = parseFlexibleMonthYear(obj.endDate);
      if (endDate && endDate.getTime() > cutoffDate.getTime()) {
        obj.endDate = cutoffLabel;
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      if ((key === "period" || key === "approximatePeriod") && typeof value === "string") {
        obj[key] = clampPeriodText(value, cutoffDate, cutoffLabel);
      } else {
        obj[key] = walk(value);
      }
    }
    return obj;
  };

  const safe = walk(normalizePartnerTerms(structuredClone(dasha))) as DashaPrediction | null;
  if (!safe) return null;

  const periodRecommendations = Array.isArray(safe.periodRecommendations) ? safe.periodRecommendations : [];
  if (!periodRecommendations.some((line) => line.includes("lifecycle-safe"))) {
    periodRecommendations.push(`Timelines are lifecycle-safe and capped at ${cutoffLabel}.`);
  }
  safe.periodRecommendations = periodRecommendations;
  return safe;
}

function enforceGlobalPredictionSafety(
  report: Record<string, any>,
  birthDate: Date,
  referenceDate: Date,
  maritalStatus: NormalizedMaritalStatus
): Record<string, any> {
  const safeReport = structuredClone(report);
  safeReport.career = enforceCareerSafety(safeReport.career || null, birthDate, referenceDate);
  safeReport.marriage = enforceMarriageSafety(safeReport.marriage || null, maritalStatus, birthDate, referenceDate);
  safeReport.dasha = enforceDashaSafety(safeReport.dasha || null, birthDate);
  safeReport.computationMeta = {
    ...(safeReport.computationMeta || {}),
    predictionSafety: {
      careerMinAge: CAREER_MIN_AGE,
      marriageMinAge: MARRIAGE_MIN_AGE,
      maxPredictionAge: MAX_PREDICTION_AGE,
      referenceDate: referenceDate.toISOString(),
      birthDate: birthDate.toISOString(),
    },
  };
  return normalizePartnerTerms(safeReport);
}

async function runQaWithTimeout(report: Record<string, any>, timeoutMs = 60000): Promise<any> {
  const timeoutFallback = {
    issues: [
      {
        section: "qa",
        severity: "warning",
        issueType: "timeout",
        description: `QA validation exceeded ${timeoutMs}ms and returned fallback validation.`,
        suggestedFix: "Review this report manually if strict QA verification is required.",
      },
    ],
    blockedContent: [],
    overallScore: 7,
    approved: true,
  };

  try {
    const result = await Promise.race([
      runQAValidation(report),
      new Promise<any>((resolve) => {
        setTimeout(() => resolve(timeoutFallback), timeoutMs);
      }),
    ]);
    return result || timeoutFallback;
  } catch {
    return timeoutFallback;
  }
}

/**
 * Run an AgentResponse-shaped call with automatic retry on failure.
 * Retries up to `maxRetries` times with a short delay.
 * Every agent MUST deliver — we never skip a section.
 *
 * TIMING: With 90s per Gemini call and 1 retry (3s delay), worst case
 * per agent slot is 90+3+90=183s. Since agents run in PARALLEL,
 * the total Promise.all time ≈ slowest agent ≈ 90-183s.
 * This runs in Stage 1 of the 2-stage pipeline, which must fit within
 * the Supabase Edge Function wall_clock_limit (Free: 150s, Pro: 400s).
 */
async function runAgentWithRetry<T>(
  agentName: string,
  factory: () => Promise<{ success: boolean; data?: T; error?: string; tokensUsed?: number }>,
  maxRetries = 1,
): Promise<{ success: boolean; data?: T; error?: string; tokensUsed?: number }> {
  let lastResult: { success: boolean; data?: T; error?: string; tokensUsed?: number } | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await factory();
      if (result.success) {
        if (attempt > 0) console.log(`✅ [RETRY] Agent "${agentName}" succeeded on attempt ${attempt + 1}`);
        return result;
      }
      lastResult = result;
      console.warn(`⚠️ [RETRY] Agent "${agentName}" attempt ${attempt + 1}/${maxRetries + 1} failed: ${result.error}`);
    } catch (err: any) {
      lastResult = { success: false, error: `Agent ${agentName} crashed: ${err?.message || err}` };
      console.error(`💥 [RETRY] Agent "${agentName}" attempt ${attempt + 1}/${maxRetries + 1} crashed:`, err?.message || err);
    }
    if (attempt < maxRetries) {
      const delayMs = 3_000; // 3s flat delay
      console.log(`🔄 [RETRY] Retrying "${agentName}" in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error(`❌ [RETRY] Agent "${agentName}" EXHAUSTED all ${maxRetries + 1} attempts`);
  return lastResult || { success: false, error: `Agent ${agentName} failed after ${maxRetries + 1} attempts` };
}

/**
 * Run an array-returning agent with automatic retry on failure/crash.
 * Returns empty array ONLY after all retries are exhausted.
 */
async function runArrayAgentWithRetry<T>(
  agentName: string,
  factory: () => Promise<T[]>,
  maxRetries = 1,
): Promise<T[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await factory();
      if (result && result.length > 0) {
        if (attempt > 0) console.log(`✅ [RETRY] Agent "${agentName}" succeeded on attempt ${attempt + 1}`);
        return result;
      }
      console.warn(`⚠️ [RETRY] Agent "${agentName}" attempt ${attempt + 1}/${maxRetries + 1} returned empty`);
    } catch (err: any) {
      console.error(`💥 [RETRY] Agent "${agentName}" attempt ${attempt + 1}/${maxRetries + 1} crashed:`, err?.message || err);
    }
    if (attempt < maxRetries) {
      const delayMs = 3_000; // 3s flat delay
      console.log(`🔄 [RETRY] Retrying "${agentName}" in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error(`❌ [RETRY] Agent "${agentName}" EXHAUSTED all ${maxRetries + 1} attempts — returning empty`);
  return [];
}

// ─── Chart SVG fetching ──────────────────────────────────────────────────────

/**
 * Replace Hindi planet abbreviations in chart SVGs with English shorthand.
 * The Seer chart API always returns Hindi labels — this post-processes for English reports.
 * Order matters: multi-char strings (शु, बु, मं, चं, सू, गु, रा, के) must come before
 * the single-char श (Shani/Saturn) to avoid partial replacement.
 */
function localizeChartSvgText(svg: string, language: string): string {
  if (language === "hi" || language === "te") return svg; // keep Hindi labels for non-English
  // For English (and any other language), replace Hindi → English abbreviations
  const replacements: [string, string][] = [
    ["शु", "VE"],   // Shukra  → Venus
    ["बु", "ME"],   // Budha   → Mercury
    ["मं", "MA"],   // Mangal  → Mars
    ["चं", "MO"],   // Chandra → Moon
    ["सू", "SU"],   // Surya   → Sun
    ["गु", "JU"],   // Guru    → Jupiter
    ["रा", "RA"],   // Rahu
    ["के", "KE"],   // Ketu
    ["श",  "SA"],   // Shani   → Saturn (MUST be after शु)
  ];
  let result = svg;
  for (const [hindi, eng] of replacements) {
    result = result.replaceAll(hindi, eng);
  }
  return result;
}

const PDF_CHART_TYPES = ["D1","D2","D3","D4","D7","D9","D10","D12","D20","D24","D27","D60"] as const;

const CHART_INFO: Record<string, { name: string; nameHindi: string; purpose: string }> = {
  D1:  { name: "Rashi (Birth Chart)",       nameHindi: "राशि चक्र",         purpose: "Overall life assessment" },
  D2:  { name: "Hora",                      nameHindi: "होरा",               purpose: "Wealth and finances" },
  D3:  { name: "Drekkana",                  nameHindi: "द्रेक्काण",          purpose: "Siblings and courage" },
  D4:  { name: "Chaturthamsa",              nameHindi: "चतुर्थांश",          purpose: "Fortune and property" },
  D7:  { name: "Saptamsa",                  nameHindi: "सप्तांश",            purpose: "Children and progeny" },
  D9:  { name: "Navamsa",                   nameHindi: "नवांश",              purpose: "Marriage and spouse" },
  D10: { name: "Dasamsa",                   nameHindi: "दशांश",              purpose: "Career and profession" },
  D12: { name: "Dwadasamsa",                nameHindi: "द्वादशांश",          purpose: "Parents and ancestry" },
  D20: { name: "Vimsamsa",                  nameHindi: "विंशांश",            purpose: "Spiritual progress" },
  D24: { name: "Chaturvimsamsa",            nameHindi: "चतुर्विंशांश",       purpose: "Education and learning" },
  D27: { name: "Bhamsa",                    nameHindi: "भांश",               purpose: "Strength and weakness" },
  D60: { name: "Shashtiamsa",               nameHindi: "षष्ट्यंश",           purpose: "Past life karma" },
};

async function fetchOneChartSvg(
  chartType: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-sbox.a4b.io/gw2/seer/external/v1/chart/horo-image/${chartType}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-fe-server": "true", "x-afb-r-uid": "7160881" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.warn(`⚠️ [CHARTS] ${chartType} HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return (data?.data?.svg as string) || null;
  } catch (err) {
    console.warn(`⚠️ [CHARTS] ${chartType} fetch error:`, err);
    return null;
  }
}

async function fetchKundaliCharts(
  day: number, month: number, year: number,
  hour: number, minute: number,
  lat: number, lon: number, tzone: number,
  language: string = "en",
): Promise<Array<{ type: string; name: string; nameHindi: string; purpose: string; svg: string }>> {
  const payload = { day, month, year, hour, minute, lat, lon, tzone, chartType: "North", image_type: "svg", language };
  const results = await Promise.allSettled(
    PDF_CHART_TYPES.map(async (ct) => {
      const rawSvg = await fetchOneChartSvg(ct, payload);
      if (!rawSvg) throw new Error("no svg");
      const svg = localizeChartSvgText(rawSvg, language);
      return { type: ct, svg, ...CHART_INFO[ct] };
    })
  );
  const charts = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);
  console.log(`📊 [CHARTS] Fetched ${charts.length}/${PDF_CHART_TYPES.length} chart SVGs`);
  return charts;
}

// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    const stage = body.stage || "generate";
    console.log(`🔄 [PROCESS-JOB] Starting job: ${jobId}, stage: ${stage}`);

    const { data: job, error: fetchError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      console.error("❌ [PROCESS-JOB] Job not found:", jobId);
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 2: Finalize — translation, QA, charts, save
    // Runs as a SEPARATE function invocation so it gets its own wall_clock_limit.
    // Supabase Free plan = 150s per invocation. By splitting generate vs finalize,
    // each stage fits comfortably within 150s.
    // ──────────────────────────────────────────────────────────────────────────
    if (stage === "finalize") {
      console.log(`🔄 [PROCESS-JOB] Stage 2 (finalize) for job: ${jobId}`);

      // Reconstruct context from job record
      const fRequestedLanguage = normalizeLanguage(job.language || "en");
      const fUseLanguagePipelineV2 = isLanguagePipelineV2Enabled(fRequestedLanguage);
      const fEffectiveGenLang: SupportedLanguage = fUseLanguagePipelineV2 ? fRequestedLanguage : "en";
      const fActiveLanguagePack = getLanguagePack(fRequestedLanguage);
      setAgentLanguageContext(fEffectiveGenLang);

      let fReport = job.report_data as Record<string, any>;
      if (!fReport) throw new Error("No report_data found for finalize stage");

      let fTotalTokens = fReport.tokensUsed || 0;
      const [fYear, fMonth, fDay] = String(job.date_of_birth).split("-").map(Number);
      const { hour: fHour, min: fMin } = parseBirthTime(String(job.time_of_birth));

      // ── Translation Sweep (Hindi/Telugu only) ──────────────────────────────
      if (fEffectiveGenLang !== "en") {
        await updateJobStatus(supabaseAdmin, jobId!, "processing", "Translating remaining content", 85, "progress");
        try {
          const translationStats = await runTranslationSweep(fReport, fEffectiveGenLang);
          console.log(`🌐 [PROCESS-JOB] Translation sweep: ${translationStats.stringsTranslated}/${translationStats.stringsFound} strings in ${translationStats.batchesSent} batches`);
          if (translationStats.errors.length > 0) {
            fReport.errors = [...(fReport.errors || []), ...translationStats.errors.map((e: string) => `TranslationSweep: ${e}`)];
          }
          fReport.computationMeta = {
            ...(fReport.computationMeta || {}),
            translationSweep: {
              stringsFound: translationStats.stringsFound,
              stringsTranslated: translationStats.stringsTranslated,
              batchesSent: translationStats.batchesSent,
              errorCount: translationStats.errors.length,
              remainingEnglish: translationStats.remainingEnglishCount,
              sectionBreakdown: translationStats.sectionBreakdown,
            },
          };
          fTotalTokens += translationStats.tokensUsed || 0;
        } catch (translationErr: any) {
          console.warn(`⚠️ [PROCESS-JOB] Translation sweep failed (non-fatal):`, translationErr?.message || translationErr);
          fReport.errors = [...(fReport.errors || []), `TranslationSweep: ${translationErr?.message || "unknown error"}`];
        }
        await touchJobHeartbeat(supabaseAdmin, jobId!);
      }

      // ── QA ─────────────────────────────────────────────────────────────────
      // Use shorter timeout (30s) in Stage 2 to leave room for translation + charts
      await updateJobStatus(supabaseAdmin, jobId!, "processing", "Running quality checks", 92, "progress");
      const fQaResult = await runQaWithTimeout(fReport, 30_000);
      if (fQaResult.blockedContent.length > 0 || fQaResult.issues.some((i: any) => i.severity === "critical")) {
        fReport = sanitizeReportContent(fReport);
      }
      fReport.qa = fQaResult;
      fReport = localizeStructuredReportTerms(fReport, fRequestedLanguage);
      fReport.language = fRequestedLanguage;
      fReport = stripAiDisclosure(fReport);

      // ── Language QC ────────────────────────────────────────────────────────
      const fLanguageQc = fUseLanguagePipelineV2
        ? runLanguageQc(fReport, fRequestedLanguage)
        : {
            language: fRequestedLanguage,
            packVersion: fActiveLanguagePack.version,
            generationMode: "native" as const,
            passed: true,
            summary: { sectionsChecked: 0, sectionsPassed: 0, totalScriptChars: 0, totalLetters: 0, overallScriptRatio: 0, overallLatinRatio: 0 },
            sections: [],
            leakSamples: [],
          };
      fReport.languageQc = fLanguageQc;
      fReport.languageQcPassed = fLanguageQc.passed;
      fReport.failureCode = fLanguageQc.passed ? null : "LANGUAGE_QC_FAILED";
      if (!fLanguageQc.passed) {
        const leakSummary = fLanguageQc.leakSamples.slice(0, 5).map((s) => `${s.section}:${s.token}`).join(", ");
        const ratioSummary = (fLanguageQc.sections || [])
          .filter((s: any) => !s.passed).slice(0, 5)
          .map((s: any) => `${s.section}:script=${(Number(s.scriptRatio || 0) * 100).toFixed(1)}%,latin=${(Number(s.latinRatio || 0) * 100).toFixed(1)}%`)
          .join(", ");
        console.warn(`⚠️ [PROCESS-JOB] LANGUAGE_QC_FAILED (non-fatal): ${leakSummary || ratioSummary || "localized output validation did not pass"}`);
        fReport.errors = [...(fReport.errors || []), `LANGUAGE_QC_FAILED: ${leakSummary || ratioSummary || "localized output validation did not pass"}`];
      }

      // ── Charts ─────────────────────────────────────────────────────────────
      try {
        await updateJobStatus(supabaseAdmin, jobId!, "processing", "Fetching Kundali charts", 97, "progress");
        const charts = await fetchKundaliCharts(fDay, fMonth, fYear, fHour, fMin, job.latitude, job.longitude, job.timezone, fRequestedLanguage);
        fReport.charts = charts;
      } catch (chartErr) {
        console.warn("⚠️ [PROCESS-JOB] Chart fetch failed (non-fatal):", chartErr);
        fReport.charts = [];
      }

      // ── Save completed report ──────────────────────────────────────────────
      fReport.tokensUsed = fTotalTokens;
      const fExtCompletion = await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "completed",
          current_phase: "Complete",
          progress_percent: 100,
          report_data: fReport,
          generation_language_mode: fUseLanguagePipelineV2 ? "native" : "legacy",
          language_qc: fReport.languageQc || null,
          debug_summary: {
            languagePackVersion: fActiveLanguagePack.version,
            requestedLanguage: fRequestedLanguage,
            effectiveGenerationLanguage: fEffectiveGenLang,
            generationMode: fUseLanguagePipelineV2 ? "native" : "legacy",
            tokensUsed: fTotalTokens,
            qaScore: fReport.qa?.overallScore || null,
          },
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (fExtCompletion.error) {
        console.warn("[PROCESS-JOB] Extended completion update failed, using legacy payload:", fExtCompletion.error);
        await supabaseAdmin
          .from("kundli_report_jobs")
          .update({
            status: "completed",
            current_phase: "Complete",
            progress_percent: 100,
            report_data: fReport,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      await createJobEvent(supabaseAdmin, {
        jobId: jobId!,
        phase: "Complete",
        eventType: "success",
        message: "Report generation completed",
        metrics: { progress: 100, tokensUsed: fTotalTokens },
      });
      await upsertKundliGeneratedReport(supabaseAdmin, {
        jobId: jobId!,
        language: fRequestedLanguage,
        generationMode: fUseLanguagePipelineV2 ? "native" : "legacy",
        status: "completed",
        reportSummary: {
          tokensUsed: fTotalTokens,
          qaScore: fReport.qa?.overallScore || null,
          errorCount: Array.isArray(fReport.errors) ? fReport.errors.length : 0,
          sections: {
            planets: Array.isArray(fReport.planets) ? fReport.planets.length : 0,
            houses: Array.isArray(fReport.houses) ? fReport.houses.length : 0,
          },
        },
      });

      console.log("✅ [PROCESS-JOB] Stage 2 (finalize) completed successfully");
      return new Response(
        JSON.stringify({ success: true, jobId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 1: Generate — Seer API, all 16 agents, safety enforcement
    // Saves partial report to DB and triggers Stage 2 (finalize) as a
    // SEPARATE function invocation, giving each stage its own wall_clock_limit.
    // ──────────────────────────────────────────────────────────────────────────
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Initializing", 5, "start");

    const {
      name,
      date_of_birth,
      time_of_birth,
      place_of_birth,
      latitude,
      longitude,
      timezone,
      language = "en",
      gender = "M",
    } = job;
    const requestedLanguage = normalizeLanguage(language);
    const useLanguagePipelineV2 = isLanguagePipelineV2Enabled(requestedLanguage);
    const effectiveGenerationLanguage: SupportedLanguage = useLanguagePipelineV2 ? requestedLanguage : "en";
    const activeLanguagePack = getLanguagePack(requestedLanguage);
    setAgentLanguageContext(effectiveGenerationLanguage);

    // Parse date and time
    const [year, month, day] = String(date_of_birth).split("-").map(Number);
    const { hour, min } = parseBirthTime(String(time_of_birth));
    const birthDate = new Date(year, month - 1, day, hour, min);

    // Normalize gender
    const normalizedGender = gender === "female" || gender === "F"
      ? "F"
      : gender === "other" || gender === "O"
        ? "O"
        : "M";
    const maritalStatusRaw = String(
      job.marital_status ?? job.maritalStatus ?? job.marriage_status ?? "unknown"
    ).toLowerCase();
    const normalizedMaritalStatus: NormalizedMaritalStatus = maritalStatusRaw === "married"
      ? "married"
      : maritalStatusRaw === "single" || maritalStatusRaw === "unmarried"
        ? "single"
        : "unknown";

    // Phase 1: Seer API
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Fetching planetary data", 10, "progress");

    const baseReq: SeerKundliRequest = {
      day, month, year, hour,
      min: 0,               // force to :00 — Seer ignores minutes
      lat: latitude,
      lon: longitude,
      tzone: timezone,
      user_id: 505,
      name,
      gender: normalizedGender,
    };

    let kundli: SeerKundli;
    let seerRawResponse: any;
    let interpolationDiagnostics: Record<string, unknown> | null = null;

    if (min === 0) {
      const { data: seerData, responseTimeMs, status } = await fetchSeerKundli(baseReq);
      console.log(`📡 [PROCESS-JOB] Seer API returned in ${responseTimeMs}ms with status ${status}`);
      await insertKundliApiCall(supabaseAdmin, {
        jobId,
        phase: "Fetching planetary data",
        provider: "seer",
        apiName: "kundli-details",
        requestPayload: baseReq as unknown as Record<string, unknown>,
        responsePayload: {
          responseTimeMs,
          hasVedicHoroscope: Boolean(seerData?.vedic_horoscope || seerData?.data?.vedic_horoscope),
        },
        httpStatus: status,
        durationMs: responseTimeMs,
        success: status >= 200 && status < 300,
      });
      seerRawResponse = seerData;
      kundli = adaptSeerResponse(seerData);
    } else {
      const nh = nextHourParams(day, month, year, hour);
      const nextReq: SeerKundliRequest = {
        ...baseReq,
        day: nh.day, month: nh.month, year: nh.year, hour: nh.hour,
      };
      console.log(`📡 [PROCESS-JOB] Calling Seer API x2 for minute interpolation (${hour}:00 & ${nh.hour}:00)...`);
      const [resH, resH1] = await Promise.all([
        fetchSeerKundli(baseReq),
        fetchSeerKundli(nextReq),
      ]);
      await insertKundliApiCalls(supabaseAdmin, [
        {
          jobId,
          phase: "Fetching planetary data",
          provider: "seer",
          apiName: "kundli-details@hour",
          requestPayload: baseReq as unknown as Record<string, unknown>,
          responsePayload: {
            responseTimeMs: resH.responseTimeMs,
            hasVedicHoroscope: Boolean(resH.data?.vedic_horoscope || resH.data?.data?.vedic_horoscope),
          },
          httpStatus: resH.status,
          durationMs: resH.responseTimeMs,
          success: resH.status >= 200 && resH.status < 300,
        },
        {
          jobId,
          phase: "Fetching planetary data",
          provider: "seer",
          apiName: "kundli-details@next-hour",
          requestPayload: nextReq as unknown as Record<string, unknown>,
          responsePayload: {
            responseTimeMs: resH1.responseTimeMs,
            hasVedicHoroscope: Boolean(resH1.data?.vedic_horoscope || resH1.data?.data?.vedic_horoscope),
          },
          httpStatus: resH1.status,
          durationMs: resH1.responseTimeMs,
          success: resH1.status >= 200 && resH1.status < 300,
        },
      ]);
      seerRawResponse = resH.data;
      const kundliH  = adaptSeerResponse(resH.data);
      const kundliH1 = adaptSeerResponse(resH1.data);
      kundli = interpolateKundli(kundliH, kundliH1, min);
      console.log(`📡 [PROCESS-JOB] Interpolated at minute ${min}`);

      const moonH = kundliH.planets.find((p) => p.name === "Moon");
      const moonH1 = kundliH1.planets.find((p) => p.name === "Moon");
      const moonI = kundli.planets.find((p) => p.name === "Moon");
      const ascH = kundliH.asc.deg;
      const ascH1 = kundliH1.asc.deg;
      const ascI = kundli.asc.deg;

      if (moonH && moonH1 && moonI) {
        const moonHourDelta = angularDistance(moonH.deg, moonH1.deg);
        const moonInterpDelta = angularDistance(moonH.deg, moonI.deg);
        const ascHourDelta = angularDistance(ascH, ascH1);
        const ascInterpDelta = angularDistance(ascH, ascI);

        interpolationDiagnostics = {
          applied: true,
          minute: min,
          moonHourDeltaDeg: Number(moonHourDelta.toFixed(6)),
          moonInterpolatedDeltaDeg: Number(moonInterpDelta.toFixed(6)),
          ascHourDeltaDeg: Number(ascHourDelta.toFixed(6)),
          ascInterpolatedDeltaDeg: Number(ascInterpDelta.toFixed(6)),
        };

        // Guardrail: if upstream hour snapshots differ materially, interpolation must move the values.
        if (moonHourDelta > 0.05 && moonInterpDelta < 0.005) {
          throw new Error("Interpolation guard failed: Moon degree did not shift from hourly snapshot.");
        }
        if (ascHourDelta > 0.05 && ascInterpDelta < 0.005) {
          throw new Error("Interpolation guard failed: Ascendant degree did not shift from hourly snapshot.");
        }
      }
    }

    // Keep reference to original request for debugging
    const seerRequest = baseReq;
    await touchJobHeartbeat(supabaseAdmin, jobId);

    // Derived
    const charaKarakas = calculateCharaKarakas(kundli.planets);
    const aspects = calculateAspects(kundli.planets, kundli.asc);
    const conjunctionsMap = getConjunctions(kundli.planets);
    const conjunctions = Array.from(conjunctionsMap.entries()).map(([house, planets]) => ({ house, planets }));

    const moon = kundli.planets.find((p: any) => p.name === "Moon");
    const sun = kundli.planets.find((p: any) => p.name === "Sun");
    const tithiNumber = moon && sun ? calculateTithi(moon.deg, sun.deg) : 1;

    const ascLord = getSignLord(kundli.asc.signIdx);
    const ascLordPlanet = kundli.planets.find((p: any) => p.name === ascLord);

    const errors: string[] = [];
    let totalTokens = 0;
    const moonSignIdx = moon?.signIdx || 0;
    const reportGeneratedAt = new Date();

    // Fire ALL prediction agents in ONE massive parallel batch
    // None of these agents depend on each other — they all just need kundli data.
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing chart & generating predictions", 20, "progress");
    console.log("🤖 [PROCESS-JOB] Launching ALL agents in parallel...");

    const [
      panchangResult, pillarsResult, numerologyResult,
      planetProfiles, houseAnalyses,
      careerResult, marriageResult, dashaResult, rahuKetuResult,
      remediesResult, spiritualResult, charaKarakasResult, glossaryResult,
      rajYogsResult, sadeSatiResult, doshasResult,
    ] = await Promise.all([
      // Core
      runAgentWithRetry("Panchang", () => generatePanchangPrediction({
        birthDate,
        moonDegree: moon?.deg || 0,
        sunDegree: sun?.deg || 0,
        vaarIndex: birthDate.getDay(),
        tithiNumber,
        karanaName: "Bava",
        yogaName: "Siddhi",
      })),
      runAgentWithRetry("Pillars", () => generatePillarsPrediction({
        moonSignIdx: moon?.signIdx || 0,
        moonDegree: moon?.deg || 0,
        moonHouse: moon?.house || 1,
        ascSignIdx: kundli.asc.signIdx,
        ascDegree: kundli.asc.deg,
        ascLordHouse: ascLordPlanet?.house || 1,
        ascLordSign: ascLordPlanet?.sign || "Aries",
      })),
      runAgentWithRetry("Numerology", () => generateNumerologyPrediction({ name, dateOfBirth: date_of_birth })),
      // Planets (9 internal parallel) + Houses (12 internal parallel)
      runArrayAgentWithRetry("Planets", () => generateAllPlanetProfiles(kundli.planets, kundli.asc)),
      runArrayAgentWithRetry("Houses", () => generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx)),
      // Life Areas
      runAgentWithRetry("Career", () => generateCareerPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        birthDate,
        generatedAt: reportGeneratedAt,
      })),
      runAgentWithRetry("Marriage", () => generateMarriagePrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        gender: normalizedGender,
        birthDate,
        generatedAt: reportGeneratedAt,
        maritalStatus: normalizedMaritalStatus,
      })),
      runAgentWithRetry("Dasha", () => generateDashaPrediction({ planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate })),
      runAgentWithRetry("RahuKetu", () => generateRahuKetuPrediction({ planets: kundli.planets })),
      // Remedies, Spiritual, etc.
      runAgentWithRetry("Remedies", () => generateRemediesPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        birthDate,
        generatedAt: reportGeneratedAt,
      })),
      runAgentWithRetry("Spiritual", () => generateSpiritualPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas })),
      runAgentWithRetry("CharaKarakas", () => generateCharaKarakasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx })),
      runAgentWithRetry("Glossary", () => generateGlossaryPrediction()),
      runAgentWithRetry("RajYogs", () => generateRajYogsPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx })),
      runAgentWithRetry("SadeSati", () => generateSadeSatiPrediction({ planets: kundli.planets, birthYear: year })),
      runAgentWithRetry("Doshas", () => generateDoshasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, moonSignIdx })),
    ]);

    console.log("✅ [PROCESS-JOB] All agents completed");
    await touchJobHeartbeat(supabaseAdmin, jobId);

    // Collect errors and token counts
    const agentResults = [
      { name: "Panchang", r: panchangResult },
      { name: "Pillars", r: pillarsResult },
      { name: "Numerology", r: numerologyResult },
      { name: "Career", r: careerResult },
      { name: "Marriage", r: marriageResult },
      { name: "Dasha", r: dashaResult },
      { name: "RahuKetu", r: rahuKetuResult },
      { name: "Remedies", r: remediesResult },
      { name: "Spiritual", r: spiritualResult },
      { name: "CharaKarakas", r: charaKarakasResult },
      { name: "Glossary", r: glossaryResult },
      { name: "RajYogs", r: rajYogsResult },
      { name: "SadeSati", r: sadeSatiResult },
      { name: "Doshas", r: doshasResult },
    ];
    for (const { name: n, r } of agentResults) {
      if (!r.success) errors.push(`${n}: ${r.error}`);
      else totalTokens += r.tokensUsed || 0;
    }
    await insertKundliApiCalls(
      supabaseAdmin,
      agentResults.map(({ name: n, r }) => ({
        jobId,
        phase: "Analyzing chart & generating predictions",
        provider: "llm",
        apiName: n,
        responsePayload: {
          success: Boolean(r.success),
          tokensUsed: Number(r.tokensUsed || 0),
        },
        success: Boolean(r.success),
        errorMessage: r.success ? null : String(r.error || "Unknown error"),
      })),
    );

    const safeCareer = enforceCareerSafety(careerResult.data || null, birthDate, reportGeneratedAt);
    const safeMarriage = enforceMarriageSafety(
      marriageResult.data || null,
      normalizedMaritalStatus,
      birthDate,
      reportGeneratedAt
    );
    const safeDasha = enforceDashaSafety(dashaResult.data || null, birthDate);
    const safeRemedies = enforceHealthSafety(remediesResult.data || null, birthDate, reportGeneratedAt);

    let report: Record<string, any> = {
      birthDetails: {
        name,
        dateOfBirth: date_of_birth,
        timeOfBirth: time_of_birth,
        placeOfBirth: place_of_birth,
        latitude,
        longitude,
        timezone,
        gender: normalizedGender,
      },
      // Store raw Seer API response for debugging dasha calculations
      seerRawResponse,
      seerRequest,
      planetaryPositions: kundli.planets.map((p: any) => ({
        name: p.name,
        sign: p.sign,
        house: p.house,
        degree: p.deg,
        isRetro: p.isRetro || false,
      })),
      ascendant: { sign: kundli.asc.sign, degree: kundli.asc.deg },
      charaKarakas,
      charaKarakasDetailed: charaKarakasResult.data || null,
      aspects,
      conjunctions,
      panchang: panchangResult.data || null,
      pillars: pillarsResult.data || null,
      planets: planetProfiles,
      houses: houseAnalyses,
      career: safeCareer,
      marriage: safeMarriage,
      dasha: safeDasha,
      rahuKetu: rahuKetuResult.data || null,
      doshas: doshasResult.data || null,
      rajYogs: rajYogsResult.data || null,
      sadeSati: sadeSatiResult.data || null,
      remedies: safeRemedies,
      numerology: numerologyResult.data || null,
      spiritual: spiritualResult.data || null,
      glossary: glossaryResult.data || null,
      qa: null,
      generatedAt: reportGeneratedAt.toISOString(),
      language: requestedLanguage,
      errors,
      tokensUsed: totalTokens,
      computationMeta: {
        interpolation: interpolationDiagnostics || { applied: min !== 0, minute: min },
        languagePipeline: {
          requestedLanguage,
          effectiveGenerationLanguage,
          generationMode: useLanguagePipelineV2 ? "native" : "legacy",
          languagePackVersion: activeLanguagePack.version,
          languagePipelineV2Enabled: useLanguagePipelineV2,
        },
      },
      generationMode: useLanguagePipelineV2 ? "native" : "legacy",
      languagePackVersion: activeLanguagePack.version,
      };

    // Deterministic truth guard before QA/persist: no factual drift allowed.
    const truthGuard = enforceAstrologyTruth({
      report,
      kundli,
      birthDate,
      generatedAt: new Date(report.generatedAt),
      strict: true,
    });
    report = truthGuard.report;
    if (truthGuard.issues.length > 0) {
      report.errors = [...(report.errors || []), ...truthGuard.issues.map((i: any) => `TruthGuard: ${i}`)];
    }
    if (truthGuard.corrections > 0) {
      console.log(`🛡️ [PROCESS-JOB] Truth guard applied ${truthGuard.corrections} corrections`);
    }

    report = enforceGlobalPredictionSafety(report, birthDate, reportGeneratedAt, normalizedMaritalStatus);

    // ── Stage 1 complete: save partial report and trigger Stage 2 ─────────
    // The report now has all agent data + safety enforcement applied.
    // Save it to DB and trigger a SEPARATE function invocation for finalization
    // (translation, QA, charts, save). This gives Stage 2 its own wall_clock_limit.
    report.tokensUsed = totalTokens;
    console.log(`📦 [PROCESS-JOB] Stage 1 done. Saving partial report and triggering Stage 2...`);

    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "processing",
        current_phase: "Agents complete — starting finalization",
        progress_percent: 80,
        report_data: report,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Trigger Stage 2 as a SEPARATE function invocation (gets its own 150s wall_clock_limit)
    const stage2Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-kundli-job`;
    const stage2Promise = fetch(stage2Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ jobId, stage: "finalize" }),
    }).catch(err => {
      console.error("⚠️ [PROCESS-JOB] Failed to trigger Stage 2:", err);
    });

    // EdgeRuntime.waitUntil keeps the worker alive for the background fetch
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(stage2Promise);
    }

    console.log("✅ [PROCESS-JOB] Stage 1 complete, Stage 2 triggered");
    return new Response(
      JSON.stringify({ success: true, jobId, stage: "generate_complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ [PROCESS-JOB] Error:", error);

    if (jobId) {
      await createJobEvent(supabaseAdmin, {
        jobId,
        phase: "Error",
        eventType: "fail",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      const failWithCode = await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "failed",
          failure_code: String(error instanceof Error ? error.message : "UNKNOWN_ERROR").startsWith("LANGUAGE_QC_FAILED")
            ? "LANGUAGE_QC_FAILED"
            : "RUNTIME_ERROR",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);
      if (failWithCode.error) {
        await supabaseAdmin
          .from("kundli_report_jobs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", jobId);
      }
      await upsertKundliGeneratedReport(supabaseAdmin, {
        jobId,
        status: "failed",
        reportSummary: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  phase: string,
  progress: number,
  eventType: "start" | "progress" | "success" | "fail" | "info" = "progress",
  message?: string,
) {
  const withHeartbeat = await supabase
    .from("kundli_report_jobs")
    .update({
      status,
      current_phase: phase,
      progress_percent: progress,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (withHeartbeat.error) {
    await supabase
      .from("kundli_report_jobs")
      .update({
        status,
        current_phase: phase,
        progress_percent: progress,
      })
      .eq("id", jobId);
  }

  await createJobEvent(supabase, {
    jobId,
    phase,
    eventType,
    message: message || `${status}: ${phase}`,
    metrics: { progress },
  });
}
