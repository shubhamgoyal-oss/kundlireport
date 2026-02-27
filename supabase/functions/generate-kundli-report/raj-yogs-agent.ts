// Raj Yogs Agent - Re-exports from shared module
// This file exists in the non-shared directory for backward compatibility

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface YogaAnalysis {
  name: string;
  nameHindi: string;
  nameSanskrit: string;
  isPresent: boolean;
  strength: "very strong" | "strong" | "moderate" | "weak" | "none";
  definition: string;
  formationCriteria: string;
  formationInChart: string;
  benefits: string[];
  activationPeriod: string;
  scripturalReference: string;
}

export interface RajYogsPrediction {
  overview: string;
  totalYogasDetected: number;
  rajYogas: YogaAnalysis[];
  dhanaYogas: YogaAnalysis[];
  auspiciousYogas: YogaAnalysis[];
  challengingYogas: YogaAnalysis[];
  overallYogaStrength: {
    rating: "exceptional" | "strong" | "moderate" | "weak" | "mixed";
    description: string;
    peakPeriods: string[];
    activationAdvice: string[];
  };
  lifePredictions: {
    career: { strength: string; prediction: string; peakPeriod: string };
    wealth: { strength: string; prediction: string; peakPeriod: string };
    fame: { strength: string; prediction: string; peakPeriod: string };
    spirituality: { strength: string; prediction: string; peakPeriod: string };
  };
  yogaEnhancement: {
    practices: string[];
    mantras: Array<{ mantra: string; purpose: string; timing: string }>;
    gemstones: string[];
    favorablePeriods: string[];
  };
  summaryNote: string;
}

interface RajYogsInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
}

export async function generateRajYogsPrediction(input: RajYogsInput): Promise<AgentResponse<RajYogsPrediction>> {
  const { planets, ascSignIdx } = input;

  const jupiter = planets.find(p => p.name === "Jupiter");
  const venus = planets.find(p => p.name === "Venus");
  const mars = planets.find(p => p.name === "Mars");
  const mercury = planets.find(p => p.name === "Mercury");
  const saturn = planets.find(p => p.name === "Saturn");
  const moon = planets.find(p => p.name === "Moon");
  const sun = planets.find(p => p.name === "Sun");

  const kendras = [1, 4, 7, 10];
  const jupiterInKendra = kendras.includes(jupiter?.house || 0);
  const jupiterFromMoon = moon ? Math.abs((jupiter?.house || 0) - moon.house) : 0;
  const gajaKesariPossible = [0, 3, 6, 9].includes(jupiterFromMoon);
  const sunMercuryConjunct = sun?.signIdx === mercury?.signIdx;

  const userPrompt = `Analyze the following birth chart for ALL Raja Yogas and other significant yogas:

**Planetary Positions:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house}, ${p.deg.toFixed(1)}°)${p.isRetro ? " [R]" : ""}`).join("\n")}

**Ascendant Sign Index:** ${ascSignIdx}

**Key Yoga Indicators:**
- Jupiter in Kendra: ${jupiterInKendra}
- Jupiter distance from Moon: ${jupiterFromMoon} houses (Gaja Kesari possible: ${gajaKesariPossible})
- Sun-Mercury conjunction: ${sunMercuryConjunct}

Provide a comprehensive yoga analysis.`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string" },
      totalYogasDetected: { type: "number" },
      rajYogas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, nameSanskrit: { type: "string" }, isPresent: { type: "boolean" }, strength: { type: "string" }, definition: { type: "string" }, formationCriteria: { type: "string" }, formationInChart: { type: "string" }, benefits: { type: "array", items: { type: "string" } }, activationPeriod: { type: "string" }, scripturalReference: { type: "string" } }, required: ["name", "isPresent", "strength", "definition", "formationInChart", "benefits"] } },
      dhanaYogas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, nameSanskrit: { type: "string" }, isPresent: { type: "boolean" }, strength: { type: "string" }, definition: { type: "string" }, formationCriteria: { type: "string" }, formationInChart: { type: "string" }, benefits: { type: "array", items: { type: "string" } }, activationPeriod: { type: "string" }, scripturalReference: { type: "string" } }, required: ["name", "isPresent"] } },
      auspiciousYogas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, nameSanskrit: { type: "string" }, isPresent: { type: "boolean" }, strength: { type: "string" }, definition: { type: "string" }, formationCriteria: { type: "string" }, formationInChart: { type: "string" }, benefits: { type: "array", items: { type: "string" } }, activationPeriod: { type: "string" }, scripturalReference: { type: "string" } }, required: ["name", "isPresent"] } },
      challengingYogas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, nameSanskrit: { type: "string" }, isPresent: { type: "boolean" }, strength: { type: "string" }, definition: { type: "string" }, formationCriteria: { type: "string" }, formationInChart: { type: "string" }, benefits: { type: "array", items: { type: "string" } }, activationPeriod: { type: "string" }, scripturalReference: { type: "string" } }, required: ["name", "isPresent"] } },
      overallYogaStrength: { type: "object", properties: { rating: { type: "string" }, description: { type: "string" }, peakPeriods: { type: "array", items: { type: "string" } }, activationAdvice: { type: "array", items: { type: "string" } } }, required: ["rating", "description"] },
      lifePredictions: { type: "object", properties: { career: { type: "object", properties: { strength: { type: "string" }, prediction: { type: "string" }, peakPeriod: { type: "string" } } }, wealth: { type: "object", properties: { strength: { type: "string" }, prediction: { type: "string" }, peakPeriod: { type: "string" } } }, fame: { type: "object", properties: { strength: { type: "string" }, prediction: { type: "string" }, peakPeriod: { type: "string" } } }, spirituality: { type: "object", properties: { strength: { type: "string" }, prediction: { type: "string" }, peakPeriod: { type: "string" } } } } },
      yogaEnhancement: { type: "object", properties: { practices: { type: "array", items: { type: "string" } }, mantras: { type: "array", items: { type: "object", properties: { mantra: { type: "string" }, purpose: { type: "string" }, timing: { type: "string" } } } }, gemstones: { type: "array", items: { type: "string" } }, favorablePeriods: { type: "array", items: { type: "string" } } } },
      summaryNote: { type: "string" }
    },
    required: ["overview", "totalYogasDetected", "rajYogas", "summaryNote"]
  };

  return callAgent<RajYogsPrediction>(
    "You are an expert Vedic astrologer specializing in Raja Yoga analysis. Identify all significant yogas in the chart.",
    userPrompt,
    "generate_raj_yogs_prediction",
    "Generate comprehensive Raja Yoga analysis",
    toolSchema
  );
}
