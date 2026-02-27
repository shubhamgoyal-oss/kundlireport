// Doshas Agent - Re-exports from shared module for backward compatibility

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface DoshaAnalysis {
  name: string;
  nameHindi: string;
  isPresent: boolean;
  status: "present" | "absent" | "nullified" | "partial";
  severity: "high" | "medium" | "low" | "none";
  description: string;
  cause: string;
  effects: string[];
  affectedLifeAreas: string[];
  nullificationReason?: string;
  scripturalReference: string;
}

export interface DoshaRemedy {
  doshaName: string;
  primaryRemedy: {
    type: string;
    name: string;
    description: string;
    procedure: string;
    timing: string;
    expectedBenefits: string[];
    scripturalBasis: string;
  };
  additionalRemedies: Array<{ type: string; name: string; description: string; procedure: string }>;
  mantras: Array<{ mantra: string; deity: string; japaCount: number; timing: string; benefits: string }>;
  gemstones: Array<{ name: string; weight: string; metal: string; finger: string; day: string; benefits: string; cautions: string }>;
  donations: Array<{ item: string; day: string; reason: string }>;
  fasting: { day: string; method: string; benefits: string } | null;
}

export interface DoshasPrediction {
  overview: string;
  totalDoshasDetected: number;
  majorDoshas: DoshaAnalysis[];
  minorDoshas: DoshaAnalysis[];
  doshaRemedies: DoshaRemedy[];
  combinedEffects: { description: string; compoundingFactors: string[]; mitigatingFactors: string[] };
  priorityRemedies: { immediate: string[]; shortTerm: string[]; longTerm: string[] };
  generalGuidance: string;
  disclaimerNote: string;
}

interface DoshasInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  moonSignIdx: number;
}

export async function generateDoshasPrediction(input: DoshasInput): Promise<AgentResponse<DoshasPrediction>> {
  const { planets, ascSignIdx, moonSignIdx } = input;

  const mars = planets.find(p => p.name === "Mars");
  const saturn = planets.find(p => p.name === "Saturn");
  const jupiter = planets.find(p => p.name === "Jupiter");
  const rahu = planets.find(p => p.name === "Rahu");
  const ketu = planets.find(p => p.name === "Ketu");
  const sun = planets.find(p => p.name === "Sun");
  const moon = planets.find(p => p.name === "Moon");

  const userPrompt = `Analyze the following birth chart for ALL doshas:

**Planetary Positions:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house}, ${p.deg.toFixed(1)}°)${p.isRetro ? " [R]" : ""}`).join("\n")}

**Ascendant Sign Index:** ${ascSignIdx}
**Moon Sign Index:** ${moonSignIdx}

Provide comprehensive dosha analysis with remedies.`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string" },
      totalDoshasDetected: { type: "number" },
      majorDoshas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, isPresent: { type: "boolean" }, status: { type: "string" }, severity: { type: "string" }, description: { type: "string" }, cause: { type: "string" }, effects: { type: "array", items: { type: "string" } }, affectedLifeAreas: { type: "array", items: { type: "string" } }, nullificationReason: { type: "string" }, scripturalReference: { type: "string" } }, required: ["name", "isPresent", "status", "severity", "description"] } },
      minorDoshas: { type: "array", items: { type: "object", properties: { name: { type: "string" }, nameHindi: { type: "string" }, isPresent: { type: "boolean" }, status: { type: "string" }, severity: { type: "string" }, description: { type: "string" }, cause: { type: "string" }, effects: { type: "array", items: { type: "string" } }, affectedLifeAreas: { type: "array", items: { type: "string" } }, scripturalReference: { type: "string" } }, required: ["name", "isPresent"] } },
      doshaRemedies: { type: "array", items: { type: "object", properties: { doshaName: { type: "string" }, primaryRemedy: { type: "object", properties: { type: { type: "string" }, name: { type: "string" }, description: { type: "string" }, procedure: { type: "string" }, timing: { type: "string" }, expectedBenefits: { type: "array", items: { type: "string" } }, scripturalBasis: { type: "string" } } }, additionalRemedies: { type: "array", items: { type: "object" } }, mantras: { type: "array", items: { type: "object" } }, gemstones: { type: "array", items: { type: "object" } }, donations: { type: "array", items: { type: "object" } }, fasting: { type: "object", nullable: true } }, required: ["doshaName"] } },
      combinedEffects: { type: "object", properties: { description: { type: "string" }, compoundingFactors: { type: "array", items: { type: "string" } }, mitigatingFactors: { type: "array", items: { type: "string" } } } },
      priorityRemedies: { type: "object", properties: { immediate: { type: "array", items: { type: "string" } }, shortTerm: { type: "array", items: { type: "string" } }, longTerm: { type: "array", items: { type: "string" } } } },
      generalGuidance: { type: "string" },
      disclaimerNote: { type: "string" }
    },
    required: ["overview", "totalDoshasDetected", "majorDoshas", "generalGuidance"]
  };

  return callAgent<DoshasPrediction>(
    "You are an expert Vedic astrologer specializing in Dosha analysis. Analyze all major and minor doshas with remedies.",
    userPrompt,
    "generate_doshas_prediction",
    "Generate comprehensive dosha analysis",
    toolSchema
  );
}
