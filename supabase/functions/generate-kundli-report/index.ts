import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchSeerKundli, adaptSeerResponse, type SeerKundliRequest } from "./seer-adapter.ts";
import { generatePanchangPrediction, type PanchangPrediction } from "./panchang-agent.ts";
import { generatePillarsPrediction, type PillarsPrediction } from "./pillars-agent.ts";
import { generateAllPlanetProfiles, type PlanetProfile } from "./planets-agent.ts";
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
  aspects: Aspect[];
  conjunctions: Array<{ house: number; planets: string[] }>;
  panchang: PanchangPrediction | null;
  pillars: PillarsPrediction | null;
  planets: PlanetProfile[];
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
    console.log("📝 [REPORT] Generating Kundli report for:", body.name);

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
      gender: gender === "female" || gender === "F" ? "F" : gender === "other" || gender === "O" ? "O" : "M",
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

    // Step 3: Run prediction agents in parallel
    console.log("🤖 [REPORT] Starting prediction agents...");
    const errors: string[] = [];
    let totalTokens = 0;

    // Run Panchang and Pillars agents in parallel
    const [panchangResult, pillarsResult] = await Promise.all([
      // Panchang Agent
      generatePanchangPrediction({
        birthDate,
        moonDegree: moon?.deg || 0,
        sunDegree: sun?.deg || 0,
        vaarIndex: birthDate.getDay(),
        tithiNumber,
        karanaName: "Bava", // TODO: Calculate actual karana
        yogaName: "Siddhi", // TODO: Calculate actual yoga
      }),
      // Pillars Agent
      generatePillarsPrediction({
        moonSignIdx: moon?.signIdx || 0,
        moonDegree: moon?.deg || 0,
        moonHouse: moon?.house || 1,
        ascSignIdx: kundli.asc.signIdx,
        ascDegree: kundli.asc.deg,
        ascLordHouse: ascLordPlanet?.house || 1,
        ascLordSign: ascLordPlanet?.sign || "Aries",
      }),
    ]);

    if (!panchangResult.success) {
      errors.push(`Panchang agent: ${panchangResult.error}`);
    } else {
      totalTokens += panchangResult.tokensUsed || 0;
    }

    if (!pillarsResult.success) {
      errors.push(`Pillars agent: ${pillarsResult.error}`);
    } else {
      totalTokens += pillarsResult.tokensUsed || 0;
    }

    // Run Planets agent (processes in batches internally)
    console.log("🪐 [REPORT] Generating planet profiles...");
    const planetProfiles = await generateAllPlanetProfiles(kundli.planets, kundli.asc);

    // Assemble the report
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
      aspects,
      conjunctions,
      panchang: panchangResult.data || null,
      pillars: pillarsResult.data || null,
      planets: planetProfiles,
      generatedAt: new Date().toISOString(),
      language,
      errors,
      tokensUsed: totalTokens,
    };

    console.log(`✅ [REPORT] Report generated. Tokens used: ${totalTokens}. Errors: ${errors.length}`);

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
