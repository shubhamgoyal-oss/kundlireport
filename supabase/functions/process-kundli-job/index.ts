import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

import { fetchSeerKundli, adaptSeerResponse, interpolateKundli, nextHourParams, type SeerKundli, type SeerKundliRequest } from "../_shared/generate-kundli-report/seer-adapter.ts";
import { generatePanchangPrediction } from "../_shared/generate-kundli-report/panchang-agent.ts";
import { generatePillarsPrediction } from "../_shared/generate-kundli-report/pillars-agent.ts";
import { generateAllPlanetProfiles } from "../_shared/generate-kundli-report/planets-agent.ts";
import { generateAllHouseAnalyses } from "../_shared/generate-kundli-report/houses-agent.ts";
import { generateCareerPrediction } from "../_shared/generate-kundli-report/career-agent.ts";
import { generateMarriagePrediction, type MarriagePrediction } from "../_shared/generate-kundli-report/marriage-agent.ts";
import { generateDashaPrediction } from "../_shared/generate-kundli-report/dasha-agent.ts";
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

import { calculateCharaKarakas } from "../_shared/generate-kundli-report/utils/chara-karakas.ts";
import { calculateAspects, getConjunctions } from "../_shared/generate-kundli-report/utils/aspects.ts";
import { calculateTithi } from "../_shared/generate-kundli-report/utils/panchang.ts";
import { getSignLord } from "../_shared/generate-kundli-report/utils/dignity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function getAgeYears(birthDate: Date, referenceDate: Date): number {
  return Math.max(0, Math.floor((referenceDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function enforceMarriageSafety(
  marriage: MarriagePrediction | null,
  maritalStatus: NormalizedMaritalStatus
): MarriagePrediction | null {
  if (!marriage) return marriage;
  const safe = structuredClone(marriage);

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
    console.log("🔄 [PROCESS-JOB] Starting job:", jobId);

    const { data: job, error: fetchError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      console.error("❌ [PROCESS-JOB] Job not found:", jobId);
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    await updateJobStatus(supabaseAdmin, jobId, "processing", "Initializing", 5);

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
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Fetching planetary data", 10);

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
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing chart & generating predictions", 20);
    console.log("🤖 [PROCESS-JOB] Launching ALL agents in parallel...");

    const [
      panchangResult, pillarsResult, numerologyResult,
      planetProfiles, houseAnalyses,
      careerResult, marriageResult, dashaResult, rahuKetuResult,
      remediesResult, spiritualResult, charaKarakasResult, glossaryResult,
      rajYogsResult, sadeSatiResult, doshasResult,
    ] = await Promise.all([
      // Core
      generatePanchangPrediction({
        birthDate,
        moonDegree: moon?.deg || 0,
        sunDegree: sun?.deg || 0,
        vaarIndex: birthDate.getDay(),
        tithiNumber,
        karanaName: "Bava",
        yogaName: "Siddhi",
      }),
      generatePillarsPrediction({
        moonSignIdx: moon?.signIdx || 0,
        moonDegree: moon?.deg || 0,
        moonHouse: moon?.house || 1,
        ascSignIdx: kundli.asc.signIdx,
        ascDegree: kundli.asc.deg,
        ascLordHouse: ascLordPlanet?.house || 1,
        ascLordSign: ascLordPlanet?.sign || "Aries",
      }),
      generateNumerologyPrediction({ name, dateOfBirth: date_of_birth }),
      // Planets (9 internal parallel) + Houses (12 internal parallel)
      generateAllPlanetProfiles(kundli.planets, kundli.asc),
      generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx),
      // Life Areas
      generateCareerPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        birthDate,
        generatedAt: reportGeneratedAt,
      }),
      generateMarriagePrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        gender: normalizedGender,
        birthDate,
        generatedAt: reportGeneratedAt,
        maritalStatus: normalizedMaritalStatus,
      }),
      generateDashaPrediction({ planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate }),
      generateRahuKetuPrediction({ planets: kundli.planets }),
      // Remedies, Spiritual, etc.
      generateRemediesPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        birthDate,
        generatedAt: reportGeneratedAt,
      }),
      generateSpiritualPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas }),
      generateCharaKarakasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }),
      generateGlossaryPrediction(),
      generateRajYogsPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }),
      generateSadeSatiPrediction({ planets: kundli.planets, birthYear: year }),
      generateDoshasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, moonSignIdx }),
    ]);

    console.log("✅ [PROCESS-JOB] All agents completed");

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

    const safeMarriage = enforceMarriageSafety(marriageResult.data || null, normalizedMaritalStatus);
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
      career: careerResult.data || null,
      marriage: safeMarriage,
      dasha: dashaResult.data || null,
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
      language,
      errors,
      tokensUsed: totalTokens,
      computationMeta: {
        interpolation: interpolationDiagnostics || { applied: min !== 0, minute: min },
      },
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

    // Phase 7
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Running quality checks", 95);

    const qaResult = await runQAValidation(report);
    if (qaResult.blockedContent.length > 0 || qaResult.issues.some((i: any) => i.severity === "critical")) {
      report = sanitizeReportContent(report);
    }
    report.qa = qaResult;

    // Complete
    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "completed",
        current_phase: "Complete",
        progress_percent: 100,
        report_data: report,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ [PROCESS-JOB] Error:", error);

    if (jobId) {
      await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);
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
  progress: number
) {
  await supabase
    .from("kundli_report_jobs")
    .update({
      status,
      current_phase: phase,
      progress_percent: progress,
    })
    .eq("id", jobId);
}
