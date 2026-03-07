import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

import { fetchSeerKundli, adaptSeerResponse, interpolateKundli, nextHourParams, type SeerKundli, type SeerKundliRequest } from "../_shared/generate-kundli-report/seer-adapter.ts";
import { generatePanchangPrediction } from "../_shared/generate-kundli-report/panchang-agent.ts";
import { generatePillarsPrediction } from "../_shared/generate-kundli-report/pillars-agent.ts";
import { generateAllPlanetProfiles } from "../_shared/generate-kundli-report/planets-agent.ts";
import { generateAllHouseAnalyses } from "../_shared/generate-kundli-report/houses-agent.ts";
import { generateCareerPrediction, type CareerPrediction } from "../_shared/generate-kundli-report/career-agent.ts";
import { generateMarriagePrediction, type MarriagePrediction } from "../_shared/generate-kundli-report/marriage-agent.ts";
import { generateDashaMahadashaPrediction, generateDashaAntardashaPrediction, mergeDashaResults, type DashaPrediction } from "../_shared/generate-kundli-report/dasha-agent.ts";
import { generateRahuKetuPrediction } from "../_shared/generate-kundli-report/rahu-ketu-agent.ts";
import { generateRemediesPrediction, type RemediesPrediction } from "../_shared/generate-kundli-report/remedies-agent.ts";
import { generateNumerologyPrediction } from "../_shared/generate-kundli-report/numerology-agent.ts";
import { generateSpiritualPrediction } from "../_shared/generate-kundli-report/spiritual-agent.ts";
import { generateCharaKarakasPrediction } from "../_shared/generate-kundli-report/chara-karakas-agent.ts";
import { generateGlossaryPrediction } from "../_shared/generate-kundli-report/glossary-agent.ts";
import { generateDoshasPrediction } from "../_shared/generate-kundli-report/doshas-agent.ts";
import { generateRajYogsPrediction } from "../_shared/generate-kundli-report/raj-yogs-agent.ts";
import { generateSadeSatiPrediction } from "../_shared/generate-kundli-report/sade-sati-agent.ts";
import { enforceAstrologyTruth } from "../_shared/generate-kundli-report/truth-guard.ts";
import { setAgentLanguageContext, setAgentNativeContext, getAgentLanguage } from "../_shared/generate-kundli-report/agent-base.ts";
import { getLanguagePack, normalizeLanguage } from "../_shared/language-packs/index.ts";
import type { SupportedLanguage } from "../_shared/language-packs/types.ts";
import { safetyText } from "../_shared/safety-i18n.ts";
import { createJobEvent, touchJobHeartbeat } from "../_shared/job-events.ts";
import { insertKundliApiCall, insertKundliApiCalls } from "../_shared/kundli-audit.ts";

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
  // Hindi/Telugu/Kannada/Marathi must always run native pipeline to prevent silent English fallback.
  if (language === "hi" || language === "te" || language === "kn" || language === "mr" || language === "ta" || language === "gu") return true;
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
  const lang = getAgentLanguage();
  const localeMap: Record<string, string> = { hi: "hi-IN", te: "te-IN", kn: "kn-IN", mr: "mr-IN" };
  const locale = localeMap[lang] || "en-IN";
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
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
  if (maxYear <= cutoffDate.getFullYear()) return raw;
  return safetyText("clamp.capped", { cutoff: cutoffLabel });
}

// Gender-aware partner term normalization.
// For known binary genders, use the correct gendered terms (husband/wife).
// For non-binary/unknown, neutralize to spouse/partner.
let _partnerTermGender: string = "M"; // default, set before use

function setPartnerTermGender(gender: string): void {
  _partnerTermGender = gender;
}

function normalizePartnerTermsInText(text: string): string {
  if (_partnerTermGender === "F") {
    // Female native → her partner is "husband"; fix any wrong gendered terms
    return text
      .replace(/\bwives\b/gi, "spouses")   // "wives" doesn't apply to a female native's partner
      .replace(/\bwife\b/gi, "spouse")      // AI shouldn't call the female native "wife" in 3rd person analysis
      .replace(/\bgirlfriend\b/gi, "partner")
      .replace(/\bboyfriend\b/gi, "partner");
      // Keep "husband" as-is — correct term for female native's spouse
  }
  if (_partnerTermGender === "M") {
    // Male native → his partner is "wife"; fix any wrong gendered terms
    return text
      .replace(/\bhusbands\b/gi, "spouses")
      .replace(/\bhusband\b/gi, "spouse")
      .replace(/\bboyfriend\b/gi, "partner")
      .replace(/\bgirlfriend\b/gi, "partner");
      // Keep "wife" as-is — correct term for male native's spouse
  }
  // Non-binary or unknown → neutralize all gendered terms
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
    const adultYear = String(birthDate.getFullYear() + CAREER_MIN_AGE);
    const v = { age: String(ageYears), minAge: String(CAREER_MIN_AGE), year: adultYear };
    safe.overview = safetyText("career.youngOverview", v);
    safe.careerSwitchInsights = {
      isSwitchDueNow: safetyText("career.youngSwitchNow"),
      nextSwitchWindow: safetyText("career.youngNextWindow", v),
      oneOrTwoFutureChanges: [],
      rationale: safetyText("career.youngRationale"),
      preparationPlan: [
        safetyText("career.youngPrep0"),
        safetyText("career.youngPrep1"),
        safetyText("career.youngPrep2"),
      ],
    };
    safe.careerTiming = {
      currentPhase: safetyText("career.youngPhase", v),
      upcomingOpportunities: [safetyText("career.youngOpportunity", v)],
      challenges: [safetyText("career.youngChallenge")],
    };
  } else if (ageYears >= MAX_PREDICTION_AGE) {
    safe.careerSwitchInsights = {
      isSwitchDueNow: safetyText("career.maxSwitchNow"),
      nextSwitchWindow: safetyText("career.maxNextWindow", { cutoff: cutoffLabel }),
      oneOrTwoFutureChanges: [],
      rationale: safetyText("career.maxRationale"),
      preparationPlan: [
        safetyText("career.maxPrep0"),
        safetyText("career.maxPrep1"),
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
    statusAssumption: safetyText("m.assumption", { status: maritalStatus }),
    safeguardPolicy: safetyText("m.policy"),
    alreadyMarriedGuidance: safetyText("m.marriedGuide"),
  };

  if (maritalStatus !== "single") {
    safe.idealPartnerForUnmarried = {
      whenApplicable: maritalStatus === "married"
        ? safetyText("m.naMarried")
        : safetyText("m.naUnknown"),
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: maritalStatus === "married"
        ? safetyText("m.adviceMarried")
        : safetyText("m.adviceUnknown"),
    };
  }

  const marriedGuidance = safe.guidanceForMarriedNatives || {
    focusAreas: [],
    relationshipStrengthening: [],
    conflictsToAvoid: [],
  };
  if (marriedGuidance.focusAreas.length === 0) {
    marriedGuidance.focusAreas = [safetyText("m.focus")];
  }
  if (marriedGuidance.relationshipStrengthening.length === 0) {
    marriedGuidance.relationshipStrengthening = [safetyText("m.strengthen")];
  }
  if (marriedGuidance.conflictsToAvoid.length === 0) {
    marriedGuidance.conflictsToAvoid = [safetyText("m.conflict")];
  }
  safe.guidanceForMarriedNatives = marriedGuidance;

  if (ageYears < MARRIAGE_MIN_AGE) {
    const adultYear = String(birthDate.getFullYear() + MARRIAGE_MIN_AGE);
    const v = { minAge: String(MARRIAGE_MIN_AGE), year: adultYear };
    safe.idealPartnerForUnmarried = {
      whenApplicable: safetyText("m.youngWhen", v),
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: safetyText("m.youngAdvice"),
    };
    safe.marriageTiming = {
      favorablePeriods: [safetyText("m.youngFav", v)],
      challengingPeriods: [safetyText("m.youngChallenge")],
      idealAgeRange: `${MARRIAGE_MIN_AGE}+`,
      idealTimeForYoungNatives: safetyText("m.youngTime", v),
      currentProspects: safetyText("m.youngProspects"),
    };
  }

  if (ageYears >= MAX_PREDICTION_AGE) {
    safe.idealPartnerForUnmarried = {
      whenApplicable: safetyText("m.maxWhen"),
      keyQualities: [],
      cautionTraits: [],
      practicalAdvice: safetyText("m.maxAdvice"),
    };
    safe.marriageTiming.favorablePeriods = [safetyText("m.maxFav", { cutoff: cutoffLabel })];
    safe.marriageTiming.challengingPeriods = [];
    safe.marriageTiming.currentProspects = safetyText("m.maxProspects");
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
    whyThisMatters: safetyText("h.why"),
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
      [safetyText("h.movement")]
    );
    safe.dailyRoutine = filterRisky(
      safe.dailyRoutine,
      [safetyText("h.routine")]
    );
    safe.healthGuidance.avoidOverstrain = [
      ...(safe.healthGuidance.avoidOverstrain || []),
      safetyText("h.overstrain"),
    ];
  }

  if (!safe.healthGuidance.medicalDisclaimer) {
    safe.healthGuidance.medicalDisclaimer = safetyText("h.disclaimer");
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
  // Inject localized lifecycle-safety message for ALL languages.
  const lifecycleMsg = safetyText("dasha.lifecycle", { cutoff: cutoffLabel });
  if (!periodRecommendations.some((line) => line.includes("lifecycle") || line.includes(cutoffLabel))) {
    periodRecommendations.push(lifecycleMsg);
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
  const agentStart = Date.now();
  let lastResult: { success: boolean; data?: T; error?: string; tokensUsed?: number } | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await factory();
      if (result.success) {
        const dur = ((Date.now() - agentStart) / 1000).toFixed(1);
        console.log(`⏱️ [AGENT-TIMING] ${agentName}: ${dur}s (attempt ${attempt + 1}, tokens: ${result.tokensUsed || 0})`);
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
  const dur = ((Date.now() - agentStart) / 1000).toFixed(1);
  console.error(`❌ [AGENT-TIMING] ${agentName}: ${dur}s — EXHAUSTED all ${maxRetries + 1} attempts`);
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
  const agentStart = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await factory();
      if (result && result.length > 0) {
        const dur = ((Date.now() - agentStart) / 1000).toFixed(1);
        console.log(`⏱️ [AGENT-TIMING] ${agentName}: ${dur}s (attempt ${attempt + 1}, ${result.length} items)`);
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
  const dur = ((Date.now() - agentStart) / 1000).toFixed(1);
  console.error(`❌ [AGENT-TIMING] ${agentName}: ${dur}s — EXHAUSTED all ${maxRetries + 1} attempts — returning empty`);
  return [];
}

// ─── Agent retry handler ─────────────────────────────────────────────────────

/**
 * Handles retry of failed (timed-out) agents.
 * Called when process-kundli-job self-invokes with retryPass:2.
 * Loads existing report from DB, re-adapts Seer data, runs ONLY failed agents,
 * merges results, saves, and triggers Stage 2 (translate).
 * Only 1 retry attempt is allowed — if retry also times out, proceeds to Stage 2 with partial data.
 */
async function handleAgentRetry(
  supabase: any,
  job: any,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const jobId = job.id;
  const existingReport = job.report_data;
  const failedAgentNames: string[] = existingReport?.computationMeta?.failedAgents || [];

  console.log(`🔄 [RETRY] Starting retry for job ${jobId}`);
  console.log(`🔄 [RETRY] Failed agents: ${failedAgentNames.join(', ') || 'none'}`);

  // Nothing to retry or can't retry — proceed directly to Stage 2
  if (failedAgentNames.length === 0 || !existingReport?.seerRawResponse) {
    console.log('ℹ️ [RETRY] No failed agents or no Seer data — skipping to Stage 2');
    return triggerStage2AndReturn(supabase, jobId, corsHeaders);
  }

  await updateJobStatus(supabase, jobId, "processing", `Retrying ${failedAgentNames.length} timed-out agents`, 82, "progress");

  // Re-setup language + native context
  const requestedLanguage = normalizeLanguage(job.language || "en");
  const effectiveGenerationLanguage: SupportedLanguage = isLanguagePipelineV2Enabled(requestedLanguage) ? requestedLanguage : "en";
  setAgentLanguageContext(effectiveGenerationLanguage);

  // Re-adapt Seer data from cached response
  const kundli = adaptSeerResponse(existingReport.seerRawResponse);
  const charaKarakas = calculateCharaKarakas(kundli.planets);
  const moon = kundli.planets.find((p: any) => p.name === "Moon");
  const sun = kundli.planets.find((p: any) => p.name === "Sun");
  const tithiNumber = moon && sun ? calculateTithi(moon.deg, sun.deg) : 1;
  const ascLord = getSignLord(kundli.asc.signIdx);
  const ascLordPlanet = kundli.planets.find((p: any) => p.name === ascLord);
  const moonSignIdx = moon?.signIdx || 0;

  // Parse dates from job record
  const [year, month, day] = String(job.date_of_birth).split("-").map(Number);
  const { hour, min } = parseBirthTime(String(job.time_of_birth));
  const birthDate = new Date(year, month - 1, day, hour, min);
  const reportGeneratedAt = new Date(existingReport.generatedAt);
  const normalizedGender = job.gender === "female" || job.gender === "F" ? "F" : job.gender === "other" || job.gender === "O" ? "O" : "M";
  setAgentNativeContext(normalizedGender, birthDate, reportGeneratedAt);
  setPartnerTermGender(normalizedGender);
  const maritalStatusRaw = String(job.marital_status ?? job.maritalStatus ?? job.marriage_status ?? "unknown").toLowerCase();
  const normalizedMaritalStatus: NormalizedMaritalStatus = maritalStatusRaw === "married" ? "married" : maritalStatusRaw === "single" || maritalStatusRaw === "unmarried" ? "single" : "unknown";

  // Build agent factory map — each entry creates a promise that runs the agent
  const agentFactories: Record<string, () => Promise<any>> = {
    Panchang: () => runAgentWithRetry("Panchang", () => generatePanchangPrediction({
      birthDate, moonDegree: moon?.deg || 0, sunDegree: sun?.deg || 0,
      vaarIndex: birthDate.getDay(), tithiNumber, karanaName: "Bava", yogaName: "Siddhi",
    })),
    Pillars: () => runAgentWithRetry("Pillars", () => generatePillarsPrediction({
      moonSignIdx: moon?.signIdx || 0, moonDegree: moon?.deg || 0, moonHouse: moon?.house || 1,
      ascSignIdx: kundli.asc.signIdx, ascDegree: kundli.asc.deg,
      ascLordHouse: ascLordPlanet?.house || 1, ascLordSign: ascLordPlanet?.sign || "Aries",
    })),
    Numerology: () => runAgentWithRetry("Numerology", () => generateNumerologyPrediction({
      name: job.name, dateOfBirth: job.date_of_birth,
    })),
    Planets: () => runArrayAgentWithRetry("Planets", () => generateAllPlanetProfiles(kundli.planets, kundli.asc)),
    Houses: () => runArrayAgentWithRetry("Houses", () => generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx)),
    Career: () => runAgentWithRetry("Career", () => generateCareerPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas, birthDate, generatedAt: reportGeneratedAt,
    })),
    Marriage: () => runAgentWithRetry("Marriage", () => generateMarriagePrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas,
      gender: normalizedGender, birthDate, generatedAt: reportGeneratedAt, maritalStatus: normalizedMaritalStatus,
    })),
    DashaMahadasha: () => runAgentWithRetry("DashaMahadasha", () => generateDashaMahadashaPrediction({
      planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate,
    })),
    DashaAntardasha: () => runAgentWithRetry("DashaAntardasha", () => generateDashaAntardashaPrediction({
      planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate,
    })),
    RahuKetu: () => runAgentWithRetry("RahuKetu", () => generateRahuKetuPrediction({ planets: kundli.planets })),
    Remedies: () => runAgentWithRetry("Remedies", () => generateRemediesPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, birthDate, generatedAt: reportGeneratedAt,
    })),
    Spiritual: () => runAgentWithRetry("Spiritual", () => generateSpiritualPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas,
    })),
    CharaKarakas: () => runAgentWithRetry("CharaKarakas", () => generateCharaKarakasPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx,
    })),
    Glossary: () => runAgentWithRetry("Glossary", () => generateGlossaryPrediction(effectiveGenerationLanguage)),
    RajYogs: () => runAgentWithRetry("RajYogs", () => generateRajYogsPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx,
    })),
    SadeSati: () => runAgentWithRetry("SadeSati", () => generateSadeSatiPrediction({
      planets: kundli.planets, birthYear: year,
    })),
    Doshas: () => runAgentWithRetry("Doshas", () => generateDoshasPrediction({
      planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, moonSignIdx,
    })),
  };

  // Run only failed agents in parallel
  const retryStart = Date.now();
  const retryTasks: Array<{ name: string; promise: Promise<any> }> = [];
  for (const name of failedAgentNames) {
    const factory = agentFactories[name];
    if (factory) {
      retryTasks.push({ name, promise: factory() });
    } else {
      console.warn(`⚠️ [RETRY] Unknown agent "${name}" — skipping`);
    }
  }

  console.log(`🤖 [RETRY] Launching ${retryTasks.length} agents in parallel...`);

  // ── Heartbeat interval: bump progress every 20s so frontend stall detector
  // (90s threshold) never fires while retry is running. Progress: 82→83→84→85.
  let retryProgressBump = 0;
  const RETRY_HEARTBEAT_MS = 20_000;
  const retryHeartbeatInterval = setInterval(async () => {
    retryProgressBump = Math.min(retryProgressBump + 1, 3); // cap at 85%
    const pct = 82 + retryProgressBump;
    try {
      await supabase
        .from("kundli_report_jobs")
        .update({
          heartbeat_at: new Date().toISOString(),
          progress_percent: pct,
          current_phase: `Retrying ${failedAgentNames.length} timed-out agents (${Math.round((Date.now() - retryStart) / 1000)}s)`,
        })
        .eq("id", jobId);
    } catch (_) { /* heartbeat is best-effort */ }
  }, RETRY_HEARTBEAT_MS);

  // Generous timeout for retry (130s) since we only run a few agents
  const RETRY_TIMEOUT_MS = 130_000;
  const retryPromise = Promise.all(
    retryTasks.map(t => t.promise.then(
      (result: any) => ({ name: t.name, result }),
      (err: any) => ({ name: t.name, result: { success: false, data: null, error: err?.message || "Retry crash" } }),
    ))
  );
  const retryTimeoutPromise = new Promise<"TIMEOUT">(resolve =>
    setTimeout(() => resolve("TIMEOUT"), RETRY_TIMEOUT_MS)
  );

  const retryRace = await Promise.race([retryPromise, retryTimeoutPromise]);
  clearInterval(retryHeartbeatInterval); // stop heartbeat once retry resolves
  const retryDuration = ((Date.now() - retryStart) / 1000).toFixed(1);

  let retryResults: Array<{ name: string; result: any }> = [];
  if (retryRace === "TIMEOUT") {
    console.warn(`⏰ [RETRY] Retry also timed out after ${retryDuration}s — proceeding with whatever completed`);
    existingReport.errors = [...(existingReport.errors || []), `Retry timeout after ${retryDuration}s`];
  } else {
    retryResults = retryRace;
    console.log(`✅ [RETRY] Completed in ${retryDuration}s — ${retryResults.length} agents retried`);
  }

  // Merge retry results into existing report
  // Map agent name → report field and type
  const SCALAR_FIELD: Record<string, string> = {
    Panchang: "panchang", Pillars: "pillars", Numerology: "numerology",
    Career: "career", Marriage: "marriage", RahuKetu: "rahuKetu",
    Remedies: "remedies", Spiritual: "spiritual", CharaKarakas: "charaKarakasDetailed",
    Glossary: "glossary", RajYogs: "rajYogs", SadeSati: "sadeSati", Doshas: "doshas",
  };
  const ARRAY_AGENTS = new Set(["Planets", "Houses"]);
  const DASHA_AGENTS = new Set(["DashaMahadasha", "DashaAntardasha"]);

  let retryTokens = 0;
  const succeededRetries: string[] = [];
  const failedRetries: string[] = [];
  let dashaMahaRetry: any = null;
  let dashaAntarRetry: any = null;

  for (const { name, result } of retryResults) {
    if (ARRAY_AGENTS.has(name)) {
      // Array agents (Planets, Houses) return arrays directly
      if (Array.isArray(result) && result.length > 0) {
        const field = name === "Planets" ? "planets" : "houses";
        existingReport[field] = result;
        succeededRetries.push(name);
        console.log(`✅ [RETRY] Merged ${name}: ${result.length} items`);
      } else {
        failedRetries.push(name);
      }
    } else if (DASHA_AGENTS.has(name)) {
      // Dasha agents — collect for special merge
      if (name === "DashaMahadasha") dashaMahaRetry = result;
      if (name === "DashaAntardasha") dashaAntarRetry = result;
      if (result?.success) {
        retryTokens += result.tokensUsed || 0;
        succeededRetries.push(name);
      } else {
        failedRetries.push(name);
      }
    } else if (SCALAR_FIELD[name]) {
      if (result?.success && result?.data) {
        existingReport[SCALAR_FIELD[name]] = result.data;
        retryTokens += result.tokensUsed || 0;
        succeededRetries.push(name);
        console.log(`✅ [RETRY] Merged ${name}`);
      } else {
        failedRetries.push(name);
        console.warn(`⚠️ [RETRY] Agent ${name} failed: ${result?.error || 'unknown'}`);
      }
    }
  }

  // Handle Dasha merge specially (needs both Mahadasha + Antardasha)
  if (dashaMahaRetry || dashaAntarRetry) {
    // Use retry result if available, otherwise use existing report's data
    const maha = dashaMahaRetry || { success: !!existingReport.dasha, data: existingReport.dasha };
    const antar = dashaAntarRetry || { success: !!existingReport.dasha, data: existingReport.dasha };
    const mergedDasha = mergeDashaResults(maha, antar);
    if (mergedDasha.data) {
      existingReport.dasha = enforceDashaSafety(mergedDasha.data, birthDate);
    }
  }

  // Apply safety guards on retried sections
  if (succeededRetries.includes("Career") && existingReport.career) {
    existingReport.career = enforceCareerSafety(existingReport.career, birthDate, reportGeneratedAt);
  }
  if (succeededRetries.includes("Marriage") && existingReport.marriage) {
    existingReport.marriage = enforceMarriageSafety(existingReport.marriage, normalizedMaritalStatus, birthDate, reportGeneratedAt);
  }
  if (succeededRetries.includes("Remedies") && existingReport.remedies) {
    existingReport.remedies = enforceHealthSafety(existingReport.remedies, birthDate, reportGeneratedAt);
  }

  // Re-apply global safety on the merged report
  const updatedReport = enforceGlobalPredictionSafety(existingReport, birthDate, reportGeneratedAt, normalizedMaritalStatus);

  // Update metadata
  updatedReport.tokensUsed = (updatedReport.tokensUsed || 0) + retryTokens;
  // Remove the timeout error from errors since we retried
  updatedReport.errors = [
    ...(updatedReport.errors || []).filter((e: string) => !e.startsWith("Stage1 timeout")),
    ...(failedRetries.length > 0 ? [`Retry failed for: ${failedRetries.join(', ')}`] : []),
  ];
  updatedReport.computationMeta = {
    ...updatedReport.computationMeta,
    retryPass: 2,
    retriedAgents: failedAgentNames,
    retrySucceeded: succeededRetries,
    retryFailed: failedRetries,
    failedAgents: failedRetries, // Only truly failed agents remain
  };

  console.log(`📊 [RETRY] Summary: ${succeededRetries.length} succeeded, ${failedRetries.length} still failed`);

  // Save merged report
  await supabase
    .from("kundli_report_jobs")
    .update({
      status: "processing",
      current_phase: succeededRetries.length > 0 ? "Retry complete — starting translation" : "Retry failed — starting translation with partial data",
      progress_percent: 85,
      report_data: updatedReport,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Trigger Stage 2: translate
  return triggerStage2AndReturn(supabase, jobId, corsHeaders);
}

/**
 * Helper: trigger translate-kundli-report (Stage 2) and return HTTP response.
 */
async function triggerStage2AndReturn(
  supabase: any,
  jobId: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const stage2Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/translate-kundli-report`;
  const stage2Promise = fetch(stage2Url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ jobId }),
  }).catch(err => {
    console.error("⚠️ [RETRY→STAGE2] Failed to trigger Stage 2:", err);
  });

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(stage2Promise);
  }

  console.log(`✅ [RETRY] Stage 2 (translate) triggered for job ${jobId}`);
  return new Response(
    JSON.stringify({ success: true, jobId, stage: "retry_complete" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Chart SVG fetching ──────────────────────────────────────────────────────

/**
 * Replace Hindi planet abbreviations in chart SVGs with English shorthand.
 * The Seer chart API always returns Hindi labels — this post-processes for English reports.
 * Order matters: multi-char strings (शु, बु, मं, चं, सू, गु, रा, के) must come before
 * the single-char श (Shani/Saturn) to avoid partial replacement.
 */
function localizeChartSvgText(svg: string, language: string): string {
  if (language === "hi" || language === "te" || language === "kn" || language === "mr" || language === "ta" || language === "gu") return svg; // keep Hindi labels for non-English
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

const CHART_INFO: Record<string, { name: string; nameHindi: string; nameKannada: string; nameMarathi: string; purpose: string }> = {
  D1:  { name: "Rashi (Birth Chart)",       nameHindi: "राशि चक्र",         nameKannada: "ಜನ್ಮ ಕುಂಡಲಿ",         nameMarathi: "जन्म कुंडली",         purpose: "Overall life assessment" },
  D2:  { name: "Hora",                      nameHindi: "होरा",               nameKannada: "ಹೋರಾ ಕುಂಡಲಿ",         nameMarathi: "होरा कुंडली",         purpose: "Wealth and finances" },
  D3:  { name: "Drekkana",                  nameHindi: "द्रेक्काण",          nameKannada: "ದ್ರೇಕ್ಕಾಣ ಕುಂಡಲಿ",     nameMarathi: "द्रेक्काण कुंडली",     purpose: "Siblings and courage" },
  D4:  { name: "Chaturthamsa",              nameHindi: "चतुर्थांश",          nameKannada: "ಚತುರ್ಥಾಂಶ ಕುಂಡಲಿ",     nameMarathi: "चतुर्थांश कुंडली",     purpose: "Fortune and property" },
  D7:  { name: "Saptamsa",                  nameHindi: "सप्तांश",            nameKannada: "ಸಪ್ತಾಂಶ ಕುಂಡಲಿ",       nameMarathi: "सप्तांश कुंडली",       purpose: "Children and progeny" },
  D9:  { name: "Navamsa",                   nameHindi: "नवांश",              nameKannada: "ನವಾಂಶ ಕುಂಡಲಿ",         nameMarathi: "नवांश कुंडली",         purpose: "Marriage and spouse" },
  D10: { name: "Dasamsa",                   nameHindi: "दशांश",              nameKannada: "ದಶಾಂಶ ಕುಂಡಲಿ",         nameMarathi: "दशांश कुंडली",         purpose: "Career and profession" },
  D12: { name: "Dwadasamsa",                nameHindi: "द्वादशांश",          nameKannada: "ದ್ವಾದಶಾಂಶ ಕುಂಡಲಿ",     nameMarathi: "द्वादशांश कुंडली",     purpose: "Parents and ancestry" },
  D20: { name: "Vimsamsa",                  nameHindi: "विंशांश",            nameKannada: "ವಿಂಶಾಂಶ ಕುಂಡಲಿ",       nameMarathi: "विंशांश कुंडली",       purpose: "Spiritual progress" },
  D24: { name: "Chaturvimsamsa",            nameHindi: "चतुर्विंशांश",       nameKannada: "ಚತುರ್ವಿಂಶಾಂಶ ಕುಂಡಲಿ", nameMarathi: "चतुर्विंशांश कुंडली", purpose: "Education and learning" },
  D27: { name: "Bhamsa",                    nameHindi: "भांश",               nameKannada: "ಸಪ್ತವಿಂಶಾಂಶ ಕುಂಡಲಿ",   nameMarathi: "सप्तविंशांश कुंडली",   purpose: "Strength and weakness" },
  D60: { name: "Shashtiamsa",               nameHindi: "षष्ट्यंश",           nameKannada: "ಷಷ್ಟ್ಯಂಶ ಕುಂಡಲಿ",       nameMarathi: "षष्ट्यंश कुंडली",       purpose: "Past life karma" },
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

  // Safety timeout: save + trigger Stage 2 BEFORE Supabase kills us at 150s.
  // We need enough margin for the final DB save + Stage 2 invocation (~5-8s).
  const STAGE1_SAFETY_TIMEOUT_MS = 140_000;

  let jobId: string | undefined;
  let partialReport: Record<string, any> | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    const retryPass: number = body.retryPass || 0;
    console.log(`🔄 [PROCESS-JOB] ${retryPass >= 2 ? 'RETRY PASS' : 'Starting'} job: ${jobId}`);

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
    // RETRY PASS: If this is a retry invocation, run ONLY failed agents, merge,
    // save, and trigger Stage 2. Gets its own fresh 150s wall_clock_limit.
    // ──────────────────────────────────────────────────────────────────────────
    if (retryPass >= 2) {
      const retryResponse = await handleAgentRetry(supabaseAdmin, job, corsHeaders);
      return retryResponse;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Stage 1: Generate — Seer API, all 16 agents, safety enforcement.
    // Saves partial report to DB, then triggers translate-kundli-report (Stage 2).
    // The pipeline is: process-kundli-job → translate-kundli-report → finalize-kundli-report
    // Each function gets its own 150s wall_clock_limit (Supabase Free tier).
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
      has_time = true,
    } = job;

    console.log(`🔎 [PROCESS-JOB] GENDER from DB: job.gender="${job.gender}" → after destructure="${gender}" has_time=${has_time}`);

    const requestedLanguage = normalizeLanguage(language);
    const useLanguagePipelineV2 = isLanguagePipelineV2Enabled(requestedLanguage);
    const effectiveGenerationLanguage: SupportedLanguage = useLanguagePipelineV2 ? requestedLanguage : "en";
    const activeLanguagePack = getLanguagePack(requestedLanguage);
    setAgentLanguageContext(effectiveGenerationLanguage);

    // Parse date and time
    const [year, month, day] = String(date_of_birth).split("-").map(Number);
    const { hour: localHour, min: localMin } = parseBirthTime(String(time_of_birth));
    const birthDate = new Date(year, month - 1, day, localHour, localMin);

    // Convert birth time from local timezone to IST (UTC+5:30)
    // Seer API expects IST and the tzone field is ignored
    const istOffsetMinutes = 5.5 * 60; // IST is UTC+5:30
    const localOffsetMinutes = timezone * 60; // Local timezone offset in minutes
    const offsetDiffMinutes = istOffsetMinutes - localOffsetMinutes;

    // Convert local time to IST
    let istHour = localHour;
    let istMin = localMin + offsetDiffMinutes;

    if (istMin >= 60) {
      istHour += Math.floor(istMin / 60);
      istMin = istMin % 60;
    } else if (istMin < 0) {
      istHour += Math.floor(istMin / 60);
      istMin = istMin % 60;
      if (istMin < 0) istMin += 60;
    }

    // Handle day overflow
    let istYear = year, istMonth = month, istDay = day;
    if (istHour >= 24) {
      istHour -= 24;
      const nextDay = new Date(year, month - 1, day + 1);
      istYear = nextDay.getFullYear();
      istMonth = nextDay.getMonth() + 1;
      istDay = nextDay.getDate();
    } else if (istHour < 0) {
      istHour += 24;
      const prevDay = new Date(year, month - 1, day - 1);
      istYear = prevDay.getFullYear();
      istMonth = prevDay.getMonth() + 1;
      istDay = prevDay.getDate();
    }

    console.log(`🕐 [PROCESS-JOB] Time conversion: Local ${localHour}:${String(localMin).padStart(2, '0')} (UTC${timezone > 0 ? '+' : ''}${timezone}) → IST ${istHour}:${String(Math.floor(istMin)).padStart(2, '0')} (UTC+5:30)`);

    // Normalize gender
    const normalizedGender = gender === "female" || gender === "F"
      ? "F"
      : gender === "other" || gender === "O"
        ? "O"
        : "M";
    console.log(`🔎 [PROCESS-JOB] GENDER normalized: "${normalizedGender}" (will be used in ALL agents via native context)`);
    // Set native context so ALL agents receive gender + age in their system prompts
    setAgentNativeContext(normalizedGender, birthDate, new Date());
    setPartnerTermGender(normalizedGender);
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

    // Seer API expects IST time. The tzone field is ignored, so we always use 5.5.
    // We fetch two hourly snapshots (H:00 and H+1:00 IST) and interpolate at the actual IST minute.
    const baseReq: SeerKundliRequest = {
      day: istDay,
      month: istMonth,
      year: istYear,
      hour: istHour,
      min: 0,  // Seer ignores min field, but we use it for interpolation logic
      lat: latitude,
      lon: longitude,
      tzone: 5.5,  // Always IST, as tzone field is ignored by Seer API
      user_id: 7160881,  // Must match chart API's x-afb-r-uid for consistent ayanamsa
      name,
      gender: normalizedGender,
    };

    let kundli: SeerKundli;
    let seerRawResponse: any;
    let interpolationDiagnostics: Record<string, unknown> | null = null;

    if (Math.floor(istMin) === 0) {
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
      const nh = nextHourParams(istDay, istMonth, istYear, istHour);
      const nextReq: SeerKundliRequest = {
        ...baseReq,
        day: nh.day, month: nh.month, year: nh.year, hour: nh.hour,
      };
      console.log(`📡 [PROCESS-JOB] Calling Seer API x2 for minute interpolation (${istHour}:00 & ${nh.hour}:00 IST, minute=${Math.floor(istMin)})...`);
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
      const istMinInt = Math.floor(istMin);
      kundli = interpolateKundli(kundliH, kundliH1, istMinInt);
      console.log(`📡 [PROCESS-JOB] Interpolated at IST minute ${istMinInt}`);

      interpolationDiagnostics = {
        applied: true,
        minute: istMinInt,
        ascH: kundliH.asc.deg,
        ascH1: kundliH1.asc.deg,
        ascInterpolated: kundli.asc.deg,
        ascSign: kundli.asc.sign,
      };
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
    // Race against a safety timeout so we save partial results before Supabase kills us.
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing chart & generating predictions", 20, "progress");
    console.log("🤖 [PROCESS-JOB] Launching ALL agents in parallel...");

    const agentsStartTime = Date.now();

    // Per-agent completion tracker: on timeout, tells us exactly which agents finished vs are still running
    const agentTracker = new Map<string, { done: boolean; durationMs: number; result?: any }>();
    function trackAgent<T>(name: string, promise: Promise<T>): Promise<T> {
      agentTracker.set(name, { done: false, durationMs: 0 });
      const start = Date.now();
      return promise.then(
        (result) => { agentTracker.set(name, { done: true, durationMs: Date.now() - start, result }); return result; },
        (err) => { agentTracker.set(name, { done: true, durationMs: Date.now() - start }); throw err; },
      );
    }

    const agentsPromise = Promise.all([
      // Core
      trackAgent("Panchang", runAgentWithRetry("Panchang", () => generatePanchangPrediction({
        birthDate,
        moonDegree: moon?.deg || 0,
        sunDegree: sun?.deg || 0,
        vaarIndex: birthDate.getDay(),
        tithiNumber,
        karanaName: "Bava",
        yogaName: "Siddhi",
      }))),
      trackAgent("Pillars", runAgentWithRetry("Pillars", () => generatePillarsPrediction({
        moonSignIdx: moon?.signIdx || 0,
        moonDegree: moon?.deg || 0,
        moonHouse: moon?.house || 1,
        ascSignIdx: kundli.asc.signIdx,
        ascDegree: kundli.asc.deg,
        ascLordHouse: ascLordPlanet?.house || 1,
        ascLordSign: ascLordPlanet?.sign || "Aries",
      }))),
      trackAgent("Numerology", runAgentWithRetry("Numerology", () => generateNumerologyPrediction({ name, dateOfBirth: date_of_birth }))),
      // Planets (9 internal parallel) + Houses (12 internal parallel)
      trackAgent("Planets", runArrayAgentWithRetry("Planets", () => generateAllPlanetProfiles(kundli.planets, kundli.asc))),
      trackAgent("Houses", runArrayAgentWithRetry("Houses", () => generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx))),
      // Life Areas
      trackAgent("Career", runAgentWithRetry("Career", () => generateCareerPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        birthDate,
        generatedAt: reportGeneratedAt,
      }))),
      trackAgent("Marriage", runAgentWithRetry("Marriage", () => generateMarriagePrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        gender: normalizedGender,
        birthDate,
        generatedAt: reportGeneratedAt,
        maritalStatus: normalizedMaritalStatus,
      }))),
      trackAgent("DashaMahadasha", runAgentWithRetry("DashaMahadasha", () => generateDashaMahadashaPrediction({ planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate }))),
      trackAgent("DashaAntardasha", runAgentWithRetry("DashaAntardasha", () => generateDashaAntardashaPrediction({ planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate }))),
      trackAgent("RahuKetu", runAgentWithRetry("RahuKetu", () => generateRahuKetuPrediction({ planets: kundli.planets }))),
      // Remedies, Spiritual, etc.
      trackAgent("Remedies", runAgentWithRetry("Remedies", () => generateRemediesPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        birthDate,
        generatedAt: reportGeneratedAt,
      }))),
      trackAgent("Spiritual", runAgentWithRetry("Spiritual", () => generateSpiritualPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas }))),
      trackAgent("CharaKarakas", runAgentWithRetry("CharaKarakas", () => generateCharaKarakasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }))),
      trackAgent("Glossary", runAgentWithRetry("Glossary", () => generateGlossaryPrediction(effectiveGenerationLanguage))),
      trackAgent("RajYogs", runAgentWithRetry("RajYogs", () => generateRajYogsPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }))),
      trackAgent("SadeSati", runAgentWithRetry("SadeSati", () => generateSadeSatiPrediction({ planets: kundli.planets, birthYear: year }))),
      trackAgent("Doshas", runAgentWithRetry("Doshas", () => generateDoshasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, moonSignIdx }))),
    ]);

    // Remaining time for agents = safety timeout minus time already spent on Seer API
    const elapsedSoFar = Date.now() - agentsStartTime;
    const remainingTimeMs = Math.max(STAGE1_SAFETY_TIMEOUT_MS - elapsedSoFar, 30_000);
    const timeoutPromise = new Promise<"TIMEOUT">((resolve) =>
      setTimeout(() => resolve("TIMEOUT"), remainingTimeMs)
    );

    const raceResult = await Promise.race([agentsPromise, timeoutPromise]);

    let panchangResult: any, pillarsResult: any, numerologyResult: any,
        planetProfiles: any, houseAnalyses: any,
        careerResult: any, marriageResult: any, dashaMahaResult: any, dashaAntarResult: any, rahuKetuResult: any,
        remediesResult: any, spiritualResult: any, charaKarakasResult: any, glossaryResult: any,
        rajYogsResult: any, sadeSatiResult: any, doshasResult: any;
    let agentsTimedOut = false;
    let timedOutAgents: string[] = [];

    if (raceResult === "TIMEOUT") {
      agentsTimedOut = true;
      const elapsed = ((Date.now() - agentsStartTime) / 1000).toFixed(1);

      // Log exactly which agents completed vs which are still running
      const completed: string[] = [];
      for (const [name, status] of agentTracker) {
        if (status.done) completed.push(`${name}(${(status.durationMs / 1000).toFixed(1)}s)`);
        else timedOutAgents.push(name);
      }
      console.warn(`⏰ [PROCESS-JOB] TIMEOUT after ${elapsed}s`);
      console.warn(`   ✅ Completed (${completed.length}): ${completed.join(', ') || 'none'}`);
      console.warn(`   🚨 TIMED OUT (${timedOutAgents.length}): ${timedOutAgents.join(', ') || 'none'}`);
      errors.push(`Stage1 timeout after ${elapsed}s. Timed-out agents: ${timedOutAgents.join(', ') || 'none'}`);

      // Salvage results from agents that finished before timeout; use empty for the rest
      const emptyAgent = { success: false, data: null, error: "Timed out", tokensUsed: 0 };
      const get = (name: string) => { const t = agentTracker.get(name); return t?.done ? t.result : emptyAgent; };
      const getArr = (name: string) => { const t = agentTracker.get(name); return (t?.done && Array.isArray(t.result)) ? t.result : []; };
      panchangResult = get("Panchang"); pillarsResult = get("Pillars"); numerologyResult = get("Numerology");
      planetProfiles = getArr("Planets"); houseAnalyses = getArr("Houses");
      careerResult = get("Career"); marriageResult = get("Marriage");
      dashaMahaResult = get("DashaMahadasha"); dashaAntarResult = get("DashaAntardasha");
      rahuKetuResult = get("RahuKetu"); remediesResult = get("Remedies"); spiritualResult = get("Spiritual");
      charaKarakasResult = get("CharaKarakas"); glossaryResult = get("Glossary");
      rajYogsResult = get("RajYogs"); sadeSatiResult = get("SadeSati"); doshasResult = get("Doshas");
    } else {
      [
        panchangResult, pillarsResult, numerologyResult,
        planetProfiles, houseAnalyses,
        careerResult, marriageResult, dashaMahaResult, dashaAntarResult, rahuKetuResult,
        remediesResult, spiritualResult, charaKarakasResult, glossaryResult,
        rajYogsResult, sadeSatiResult, doshasResult,
      ] = raceResult;
    }

    const agentsDuration = ((Date.now() - agentsStartTime) / 1000).toFixed(1);
    console.log(`✅ [PROCESS-JOB] Agents ${agentsTimedOut ? "timed out" : "completed"} in ${agentsDuration}s`);
    await touchJobHeartbeat(supabaseAdmin, jobId);

    // Collect errors and token counts
    const agentResults = [
      { name: "Panchang", r: panchangResult },
      { name: "Pillars", r: pillarsResult },
      { name: "Numerology", r: numerologyResult },
      { name: "Career", r: careerResult },
      { name: "Marriage", r: marriageResult },
      { name: "DashaMahadasha", r: dashaMahaResult },
      { name: "DashaAntardasha", r: dashaAntarResult },
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
    // Merge the two parallel Dasha agent results into a single combined result
    const dashaResult = mergeDashaResults(dashaMahaResult, dashaAntarResult);
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
        ...(has_time === false ? { unknownTime: true } : {}),
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
        interpolation: interpolationDiagnostics || { applied: localMin !== 0, minute: localMin },
        languagePipeline: {
          requestedLanguage,
          effectiveGenerationLanguage,
          generationMode: useLanguagePipelineV2 ? "native" : "legacy",
          languagePackVersion: activeLanguagePack.version,
          languagePipelineV2Enabled: useLanguagePipelineV2,
        },
        ...(timedOutAgents.length > 0 ? { failedAgents: timedOutAgents } : {}),
      },
      generationMode: useLanguagePipelineV2 ? "native" : "legacy",
      languagePackVersion: activeLanguagePack.version,
      };

    // Expose report to the catch block so partial data can be saved on error
    partialReport = report;

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

    // ── Stage 1 complete: save partial report → trigger translate or retry
    report.tokensUsed = totalTokens;

    // CRITICAL: Set phase BASED on whether we need to retry. The frontend's stall
    // detector maps phases containing "translat" → translate-kundli-report. If we
    // save "starting translation" but then trigger a retry, the stall detector can
    // fire translate on PARTIAL data before the retry completes → truncated PDFs.
    const needsRetry = agentsTimedOut && timedOutAgents.length > 0;
    const stage1Phase = needsRetry
      ? `Retrying ${timedOutAgents.length} failed agents — ${timedOutAgents.join(', ')}`
      : "Agents complete — starting translation";
    console.log(`📦 [PROCESS-JOB] Stage 1 done. Phase: "${stage1Phase}"`);

    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "processing",
        current_phase: stage1Phase,
        progress_percent: 80,
        report_data: report,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // ── Decide next step: self-retry failed agents OR proceed to Stage 2 ──
    if (needsRetry) {
      // Self-invoke for retry: gives failed agents a fresh 150s to complete.
      // Only 1 retry attempt — retryPass:2 prevents infinite loops.
      console.log(`🔄 [PROCESS-JOB] Triggering RETRY PASS for ${timedOutAgents.length} failed agents: ${timedOutAgents.join(', ')}`);
      const retryUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-kundli-job`;
      const retryPromise = fetch(retryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ jobId, retryPass: 2 }),
      }).catch(err => {
        console.error("⚠️ [PROCESS-JOB] Failed to trigger retry pass:", err);
      });

      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(retryPromise);
      }

      console.log("✅ [PROCESS-JOB] Stage 1 partial, retry pass triggered");
      return new Response(
        JSON.stringify({ success: true, jobId, stage: "generate_partial_retry_queued", failedAgents: timedOutAgents }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No timeout (or no failed agents) — proceed directly to Stage 2: translate
    const stage2Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/translate-kundli-report`;
    const stage2Promise = fetch(stage2Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ jobId }),
    }).catch(err => {
      console.error("⚠️ [PROCESS-JOB] Failed to trigger Stage 2 (translate):", err);
    });

    // EdgeRuntime.waitUntil keeps the worker alive for the background fetch
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(stage2Promise);
    }

    console.log("✅ [PROCESS-JOB] Stage 1 complete, translate-kundli-report triggered");
    return new Response(
      JSON.stringify({ success: true, jobId, stage: "generate_complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // ── CRITICAL: Even on error, try to save partial report and trigger Stage 2 ──
    console.error("❌ [PROCESS-JOB] Error (attempting to proceed to Stage 2):", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    if (jobId) {
      await createJobEvent(supabaseAdmin, {
        jobId,
        phase: "Stage 1 Error (non-fatal)",
        eventType: "info",
        message: errMsg,
      }).catch(() => {});

      // If we have a partial report, save it and trigger Stage 2 anyway
      if (partialReport) {
        partialReport.errors = [...(partialReport.errors || []), `Stage1Error: ${errMsg}`];
        try {
          await supabaseAdmin
            .from("kundli_report_jobs")
            .update({
              status: "processing",
              current_phase: "Stage 1 errored — skipping to translation",
              progress_percent: 80,
              report_data: partialReport,
              heartbeat_at: new Date().toISOString(),
            })
            .eq("id", jobId);

          // Still trigger Stage 2
          const stage2Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/translate-kundli-report`;
          const stage2Promise = fetch(stage2Url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ jobId }),
          }).catch(err => {
            console.error("⚠️ [PROCESS-JOB] Failed to trigger Stage 2 from catch:", err);
          });

          // @ts-ignore
          if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(stage2Promise);
          }

          console.log("📤 [PROCESS-JOB] Partial report saved, Stage 2 triggered from error handler");
          return new Response(
            JSON.stringify({ success: true, jobId, stage: "generate_partial", error: errMsg }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (saveErr) {
          console.error("💥 [PROCESS-JOB] Failed to save partial report:", saveErr);
        }
      }

      // No partial report available — mark as failed
      try {
        await supabaseAdmin
          .from("kundli_report_jobs")
          .update({
            status: "failed",
            error_message: errMsg,
          })
          .eq("id", jobId);
      } catch (_) { /* best-effort */ }
    }

    return new Response(
      JSON.stringify({ error: errMsg }),
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
