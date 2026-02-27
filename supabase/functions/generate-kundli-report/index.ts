import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchSeerKundli, adaptSeerResponse, interpolateKundli, nextHourParams, type SeerKundliRequest } from "./seer-adapter.ts";
import { generatePanchangPrediction, type PanchangPrediction } from "./panchang-agent.ts";
import { generatePillarsPrediction, type PillarsPrediction } from "./pillars-agent.ts";
import { generateAllPlanetProfiles, type PlanetProfile } from "./planets-agent.ts";
import { generateAllHouseAnalyses, type HouseAnalysis } from "./houses-agent.ts";
import { generateCareerPrediction, type CareerPrediction } from "./career-agent.ts";
import { generateMarriagePrediction, type MarriagePrediction } from "./marriage-agent.ts";
import { generateDashaPrediction, type DashaPrediction } from "./dasha-agent.ts";
import { generateRahuKetuPrediction, type RahuKetuPrediction } from "./rahu-ketu-agent.ts";
import { generateRemediesPrediction, type RemediesPrediction } from "./remedies-agent.ts";
import { generateNumerologyPrediction, type NumerologyPrediction } from "./numerology-agent.ts";
import { generateSpiritualPrediction, type SpiritualPrediction } from "./spiritual-agent.ts";
import { generateCharaKarakasPrediction, type CharaKarakasPrediction } from "./chara-karakas-agent.ts";
import { generateGlossaryPrediction, type GlossaryPrediction } from "./glossary-agent.ts";
import { generateRajYogsPrediction, type RajYogsPrediction } from "./raj-yogs-agent.ts";
import { generateSadeSatiPrediction, type SadeSatiPrediction } from "./sade-sati-agent.ts";
import { generateDoshasPrediction, type DoshasPrediction } from "./doshas-agent.ts";
import { runQAValidation, sanitizeReportContent, type QAResult } from "./qa-agent.ts";
import { enforceAstrologyTruth } from "./truth-guard.ts";
import { calculateCharaKarakas, type CharaKaraka } from "./utils/chara-karakas.ts";
import { calculateAspects, getConjunctions, type Aspect } from "./utils/aspects.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";
import { getVaar, calculateTithi } from "./utils/panchang.ts";
import { getSignLord } from "./utils/dignity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

interface ReportRequest {
  name: string;
  dateOfBirth: string;  // YYYY-MM-DD
  timeOfBirth: string;  // HH:mm
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  language?: "en" | "hi";
  gender?: "M" | "F" | "O" | "male" | "female" | "other";
  maritalStatus?: "single" | "married" | "unknown" | "unmarried";
}

interface KundliReport {
  birthDetails: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeOfBirth: string;
    latitude: number;
    longitude: number;
    timezone: number;
  };
  planetaryPositions: Array<{
    name: string;
    sign: string;
    house: number;
    degree: number;
    isRetro: boolean;
  }>;
  ascendant: {
    sign: string;
    degree: number;
  };
  charaKarakas: CharaKaraka[];
  charaKarakasDetailed: CharaKarakasPrediction | null;
  aspects: Aspect[];
  conjunctions: Array<{ house: number; planets: string[] }>;
  panchang: PanchangPrediction | null;
  pillars: PillarsPrediction | null;
  planets: PlanetProfile[];
  houses: HouseAnalysis[];
  career: CareerPrediction | null;
  marriage: MarriagePrediction | null;
  dasha: DashaPrediction | null;
  rahuKetu: RahuKetuPrediction | null;
  remedies: RemediesPrediction | null;
  numerology: NumerologyPrediction | null;
  spiritual: SpiritualPrediction | null;
  glossary: GlossaryPrediction | null;
  rajYogs: RajYogsPrediction | null;
  sadeSati: SadeSatiPrediction | null;
  doshas: DoshasPrediction | null;
  qa: QAResult | null;
  generatedAt: string;
  language: "en" | "hi";
  errors: string[];
  tokensUsed: number;
  computationMeta?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReportRequest = await req.json();
    console.log("📝 [REPORT] Generating comprehensive Kundli report for:", body.name);

    const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, timezone, language = "en", gender = "M", maritalStatus = "unknown" } = body;

    // Validate inputs
    if (!name || !dateOfBirth || !timeOfBirth || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date and time
    const [year, month, day] = dateOfBirth.split("-").map(Number);
    const { hour, min } = parseBirthTime(timeOfBirth);
    const birthDate = new Date(year, month - 1, day, hour, min);

    // Normalize gender
    const normalizedGender = gender === "female" || gender === "F" ? "F" : gender === "other" || gender === "O" ? "O" : "M";
    const normalizedMaritalStatus: NormalizedMaritalStatus =
      maritalStatus === "married"
        ? "married"
        : maritalStatus === "single" || maritalStatus === "unmarried"
          ? "single"
          : "unknown";

    // Step 1: Call Seer API — two calls for minute-level interpolation
    // The Seer API only honours the 'hour' field, so we call for H:00 and
    // (H+1):00 then interpolate by the minute fraction.
    const baseReq: SeerKundliRequest = {
      day, month, year, hour,
      min: 0,               // force to :00
      lat: latitude,
      lon: longitude,
      tzone: timezone,
      user_id: 505,
      name,
      gender: normalizedGender,
    };

    let kundli;
    let interpolationDiagnostics: Record<string, unknown> | null = null;
    if (min === 0) {
      // Exact hour — single call is sufficient
      console.log("🌐 [REPORT] Calling Seer API (exact hour, single call)...");
      const { data: seerData } = await fetchSeerKundli(baseReq);
      kundli = adaptSeerResponse(seerData);
    } else {
      // Need interpolation: fetch H:00 and (H+1):00 in parallel
      const nh = nextHourParams(day, month, year, hour);
      const nextReq: SeerKundliRequest = {
        ...baseReq,
        day: nh.day, month: nh.month, year: nh.year, hour: nh.hour,
      };

      console.log(`🌐 [REPORT] Calling Seer API x2 for interpolation (${hour}:00 & ${nh.hour}:00)...`);
      const [resH, resH1] = await Promise.all([
        fetchSeerKundli(baseReq),
        fetchSeerKundli(nextReq),
      ]);

      const kundliH  = adaptSeerResponse(resH.data);
      const kundliH1 = adaptSeerResponse(resH1.data);
      kundli = interpolateKundli(kundliH, kundliH1, min);

      const moonH = kundliH.planets.find((p: any) => p.name === "Moon");
      const moonH1 = kundliH1.planets.find((p: any) => p.name === "Moon");
      const moonI = kundli.planets.find((p: any) => p.name === "Moon");
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

        if (moonHourDelta > 0.05 && moonInterpDelta < 0.005) {
          throw new Error("Interpolation guard failed: Moon degree did not shift from hourly snapshot.");
        }
        if (ascHourDelta > 0.05 && ascInterpDelta < 0.005) {
          throw new Error("Interpolation guard failed: Ascendant degree did not shift from hourly snapshot.");
        }
      }
    }
    console.log("✅ [REPORT] Seer API response adapted (minute-accurate)");

    // Step 2: Calculate derived data
    const charaKarakas = calculateCharaKarakas(kundli.planets);
    const aspects = calculateAspects(kundli.planets, kundli.asc);
    const conjunctionsMap = getConjunctions(kundli.planets);
    const conjunctions = Array.from(conjunctionsMap.entries()).map(([house, planets]) => ({ house, planets }));

    // Find Moon and Sun for panchang calculations
    const moon = kundli.planets.find((p: any) => p.name === "Moon");
    const sun = kundli.planets.find((p: any) => p.name === "Sun");
    const moonNakshatra = moon ? getNakshatraWithPada(moon.deg) : null;
    const vaar = getVaar(birthDate);
    const tithiNumber = moon && sun ? calculateTithi(moon.deg, sun.deg) : 1;

    // Find ascendant lord placement
    const ascLord = getSignLord(kundli.asc.signIdx);
    const ascLordPlanet = kundli.planets.find((p: any) => p.name === ascLord);
    const reportGeneratedAt = new Date();

    // Step 3: Fire ALL prediction agents in ONE massive parallel batch
    // None of these agents depend on each other — they all just need kundli data.
    // Previous sequential phasing (5 phases, 10 round-trips) was needlessly slow.
    console.log("🤖 [REPORT] Launching ALL agents in parallel...");
    const errors: string[] = [];
    let totalTokens = 0;

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
      generateNumerologyPrediction({ name, dateOfBirth }),
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
      generateDashaPrediction({
        planets: kundli.planets,
        moonDegree: moon?.deg || 0,
        birthDate,
      }),
      generateRahuKetuPrediction({ planets: kundli.planets }),
      // Remedies, Spiritual, etc.
      generateRemediesPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        birthDate,
        generatedAt: reportGeneratedAt,
      }),
      generateSpiritualPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
      }),
      generateCharaKarakasPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
      }),
      generateGlossaryPrediction(),
      generateRajYogsPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
      }),
      generateSadeSatiPrediction({
        planets: kundli.planets,
        birthYear: year,
      }),
      generateDoshasPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        moonSignIdx: moon?.signIdx || 0,
      }),
    ]);

    console.log("✅ [REPORT] All agents completed");

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

    // Assemble the complete report (pre-QA)
    let report: KundliReport = {
      birthDetails: {
        name,
        dateOfBirth,
        timeOfBirth,
        placeOfBirth,
        latitude,
        longitude,
        timezone,
      },
      planetaryPositions: kundli.planets.map((p: any) => ({
        name: p.name,
        sign: p.sign,
        house: p.house,
        degree: p.deg,
        isRetro: p.isRetro || false,
      })),
      ascendant: {
        sign: kundli.asc.sign,
        degree: kundli.asc.deg,
      },
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
      remedies: safeRemedies,
      numerology: numerologyResult.data || null,
      spiritual: spiritualResult.data || null,
      glossary: glossaryResult.data || null,
      rajYogs: rajYogsResult.data || null,
      sadeSati: sadeSatiResult.data || null,
      doshas: doshasResult.data || null,
      qa: null,
      generatedAt: reportGeneratedAt.toISOString(),
      language,
      errors,
      tokensUsed: totalTokens,
      computationMeta: {
        interpolation: interpolationDiagnostics || { applied: min !== 0, minute: min },
      },
    };

    // Step 5.5: Deterministic truth guard — overwrite any inconsistent computed fields.
    const truthGuard = enforceAstrologyTruth({
      report: report as unknown as Record<string, unknown>,
      kundli,
      birthDate,
      generatedAt: new Date(report.generatedAt),
      strict: true,
    });
    report = truthGuard.report as unknown as KundliReport;
    if (truthGuard.issues.length > 0) {
      report.errors.push(...truthGuard.issues.map((i: any) => `TruthGuard: ${i}`));
    }
    if (truthGuard.corrections > 0) {
      console.log(`🛡️ [REPORT] Truth guard applied ${truthGuard.corrections} corrections`);
    }

    // Step 6: Run QA validation on the complete report
    console.log("🔍 [REPORT] Running QA validation...");
    const qaResult = await runQAValidation(report as unknown as Record<string, unknown>);
    
    // Apply sanitization if needed
    if (qaResult.blockedContent.length > 0 || qaResult.issues.some(i => i.severity === "critical")) {
      console.log("🧹 [REPORT] Sanitizing report content...");
      report = sanitizeReportContent(report as unknown as Record<string, unknown>) as unknown as KundliReport;
    }
    
    // Add QA results to report
    report.qa = qaResult;
    
    // Log QA results
    console.log(`✅ [REPORT] QA complete. Score: ${qaResult.overallScore}/10, Approved: ${qaResult.approved}`);
    if (qaResult.issues.length > 0) {
      console.log(`   🚨 QA Issues: ${qaResult.issues.length}`);
      for (const issue of qaResult.issues.filter(i => i.severity === "critical")) {
        console.log(`   ❌ CRITICAL: ${issue.section} - ${issue.description}`);
      }
    }
    if (qaResult.blockedContent.length > 0) {
      console.log(`   🚫 Blocked content: ${qaResult.blockedContent.join(", ")}`);
    }

    console.log(`✅ [REPORT] Comprehensive report generated.`);
    console.log(`   📊 Tokens used: ${totalTokens}`);
    console.log(`   ⚠️ Errors: ${errors.length}`);
    console.log(`   🪐 Planets: ${planetProfiles.length}`);
    console.log(`   🏠 Houses: ${houseAnalyses.length}`);
    console.log(`   🔍 QA Score: ${qaResult.overallScore}/10`);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [REPORT] Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
