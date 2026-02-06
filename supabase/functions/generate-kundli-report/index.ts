import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchSeerKundli, adaptSeerResponse, type SeerKundliRequest } from "./seer-adapter.ts";
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
import { calculateCharaKarakas, type CharaKaraka } from "./utils/chara-karakas.ts";
import { calculateAspects, getConjunctions, type Aspect } from "./utils/aspects.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";
import { getVaar, calculateTithi } from "./utils/panchang.ts";
import { getSignLord } from "./utils/dignity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  generatedAt: string;
  language: "en" | "hi";
  errors: string[];
  tokensUsed: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReportRequest = await req.json();
    console.log("📝 [REPORT] Generating comprehensive Kundli report for:", body.name);

    const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, timezone, language = "en", gender = "M" } = body;

    // Validate inputs
    if (!name || !dateOfBirth || !timeOfBirth || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse date and time
    const [year, month, day] = dateOfBirth.split("-").map(Number);
    const [hour, min] = timeOfBirth.split(":").map(Number);
    const birthDate = new Date(year, month - 1, day, hour, min);

    // Normalize gender
    const normalizedGender = gender === "female" || gender === "F" ? "F" : gender === "other" || gender === "O" ? "O" : "M";

    // Step 1: Call Seer API
    console.log("🌐 [REPORT] Calling Seer API...");
    const seerRequest: SeerKundliRequest = {
      day,
      month,
      year,
      hour,
      min,
      lat: latitude,
      lon: longitude,
      tzone: timezone,
      user_id: 505,
      name,
      gender: normalizedGender,
    };

    const { data: seerData } = await fetchSeerKundli(seerRequest);
    const kundli = adaptSeerResponse(seerData);
    console.log("✅ [REPORT] Seer API response adapted");

    // Step 2: Calculate derived data
    const charaKarakas = calculateCharaKarakas(kundli.planets);
    const aspects = calculateAspects(kundli.planets, kundli.asc);
    const conjunctionsMap = getConjunctions(kundli.planets);
    const conjunctions = Array.from(conjunctionsMap.entries()).map(([house, planets]) => ({ house, planets }));

    // Find Moon and Sun for panchang calculations
    const moon = kundli.planets.find(p => p.name === "Moon");
    const sun = kundli.planets.find(p => p.name === "Sun");
    const moonNakshatra = moon ? getNakshatraWithPada(moon.deg) : null;
    const vaar = getVaar(birthDate);
    const tithiNumber = moon && sun ? calculateTithi(moon.deg, sun.deg) : 1;

    // Find ascendant lord placement
    const ascLord = getSignLord(kundli.asc.signIdx);
    const ascLordPlanet = kundli.planets.find(p => p.name === ascLord);

    // Step 3: Run ALL prediction agents in parallel batches
    console.log("🤖 [REPORT] Starting prediction agents (Phase 1: Core)...");
    const errors: string[] = [];
    let totalTokens = 0;

    // Phase 1: Panchang, Pillars, Numerology (fast, independent)
    const [panchangResult, pillarsResult, numerologyResult] = await Promise.all([
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
      generateNumerologyPrediction({
        name,
        dateOfBirth,
      }),
    ]);

    if (!panchangResult.success) errors.push(`Panchang: ${panchangResult.error}`);
    else totalTokens += panchangResult.tokensUsed || 0;

    if (!pillarsResult.success) errors.push(`Pillars: ${pillarsResult.error}`);
    else totalTokens += pillarsResult.tokensUsed || 0;

    if (!numerologyResult.success) errors.push(`Numerology: ${numerologyResult.error}`);
    else totalTokens += numerologyResult.tokensUsed || 0;

    console.log("🤖 [REPORT] Phase 1 complete. Starting Phase 2: Planets...");

    // Phase 2: Planet profiles (batched internally)
    const planetProfiles = await generateAllPlanetProfiles(kundli.planets, kundli.asc);

    console.log("🤖 [REPORT] Phase 2 complete. Starting Phase 3: Houses...");

    // Phase 3: House analyses (batched internally)
    const houseAnalyses = await generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx);

    console.log("🤖 [REPORT] Phase 3 complete. Starting Phase 4: Life Areas...");

    // Phase 4: Career, Marriage, Dasha, Rahu-Ketu (in parallel)
    const [careerResult, marriageResult, dashaResult, rahuKetuResult] = await Promise.all([
      generateCareerPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
      }),
      generateMarriagePrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
        charaKarakas,
        gender: normalizedGender,
      }),
      generateDashaPrediction({
        planets: kundli.planets,
        moonDegree: moon?.deg || 0,
        birthDate,
      }),
      generateRahuKetuPrediction({
        planets: kundli.planets,
      }),
    ]);

    if (!careerResult.success) errors.push(`Career: ${careerResult.error}`);
    else totalTokens += careerResult.tokensUsed || 0;

    if (!marriageResult.success) errors.push(`Marriage: ${marriageResult.error}`);
    else totalTokens += marriageResult.tokensUsed || 0;

    if (!dashaResult.success) errors.push(`Dasha: ${dashaResult.error}`);
    else totalTokens += dashaResult.tokensUsed || 0;

    if (!rahuKetuResult.success) errors.push(`RahuKetu: ${rahuKetuResult.error}`);
    else totalTokens += rahuKetuResult.tokensUsed || 0;

    console.log("🤖 [REPORT] Phase 4 complete. Starting Phase 5: Remedies, Spiritual, Karakas, Glossary...");

    // Phase 5: Remedies, Spiritual, Chara Karakas, and Glossary (in parallel)
    const [remediesResult, spiritualResult, charaKarakasResult, glossaryResult] = await Promise.all([
      generateRemediesPrediction({
        planets: kundli.planets,
        ascSignIdx: kundli.asc.signIdx,
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
    ]);

    if (!remediesResult.success) errors.push(`Remedies: ${remediesResult.error}`);
    else totalTokens += remediesResult.tokensUsed || 0;

    if (!spiritualResult.success) errors.push(`Spiritual: ${spiritualResult.error}`);
    else totalTokens += spiritualResult.tokensUsed || 0;

    if (!charaKarakasResult.success) errors.push(`CharaKarakas: ${charaKarakasResult.error}`);
    else totalTokens += charaKarakasResult.tokensUsed || 0;

    if (!glossaryResult.success) errors.push(`Glossary: ${glossaryResult.error}`);
    else totalTokens += glossaryResult.tokensUsed || 0;

    // Assemble the complete report
    const report: KundliReport = {
      birthDetails: {
        name,
        dateOfBirth,
        timeOfBirth,
        placeOfBirth,
        latitude,
        longitude,
        timezone,
      },
      planetaryPositions: kundli.planets.map(p => ({
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
      marriage: marriageResult.data || null,
      dasha: dashaResult.data || null,
      rahuKetu: rahuKetuResult.data || null,
      remedies: remediesResult.data || null,
      numerology: numerologyResult.data || null,
      spiritual: spiritualResult.data || null,
      glossary: glossaryResult.data || null,
      generatedAt: new Date().toISOString(),
      language,
      errors,
      tokensUsed: totalTokens,
    };

    console.log(`✅ [REPORT] Comprehensive report generated.`);
    console.log(`   📊 Tokens used: ${totalTokens}`);
    console.log(`   ⚠️ Errors: ${errors.length}`);
    console.log(`   🪐 Planets: ${planetProfiles.length}`);
    console.log(`   🏠 Houses: ${houseAnalyses.length}`);

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
