// Doshas Agent - Analyzes all doshas in the chart with standardized output template

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

// Standardized template for each dosha - frontend can render consistently
export interface DoshaAnalysis {
  name: string;
  nameHindi: string;
  isPresent: boolean;
  status: "present" | "absent" | "nullified" | "partial";
  severity: "high" | "medium" | "low" | "none";
  // Standardized content sections (always present, can be empty)
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
    type: string; // "puja" | "mantra" | "gemstone" | "rudraksha" | "fasting" | "donation"
    name: string;
    description: string;
    procedure: string;
    timing: string;
    expectedBenefits: string[];
    scripturalBasis: string;
  };
  additionalRemedies: Array<{
    type: string;
    name: string;
    description: string;
    procedure: string;
  }>;
  mantras: Array<{
    mantra: string;
    deity: string;
    japaCount: number;
    timing: string;
    benefits: string;
  }>;
  gemstones: Array<{
    name: string;
    weight: string;
    metal: string;
    finger: string;
    day: string;
    benefits: string;
    cautions: string;
  }>;
  donations: Array<{
    item: string;
    day: string;
    reason: string;
  }>;
  fasting: {
    day: string;
    method: string;
    benefits: string;
  } | null;
}

export interface DoshasPrediction {
  overview: string;
  totalDoshasDetected: number;
  majorDoshas: DoshaAnalysis[];
  minorDoshas: DoshaAnalysis[];
  doshaRemedies: DoshaRemedy[];
  combinedEffects: {
    description: string;
    compoundingFactors: string[];
    mitigatingFactors: string[];
  };
  priorityRemedies: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  generalGuidance: string;
  disclaimerNote: string;
}

const DOSHAS_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Dosha analysis.

Your role is to analyze the birth chart for all major and minor doshas, providing:
1. Accurate detection based on classical rules
2. Clear explanations of each dosha's effects
3. Specific remedies with procedures
4. Scriptural references for authenticity

MAJOR DOSHAS TO ANALYZE:
1. Mangal Dosha (Kuja Dosha) - Mars in 1, 2, 4, 7, 8, or 12 from Lagna/Moon/Venus
2. Kaal Sarp Dosha - All 7 planets hemmed between Rahu-Ketu axis
3. Pitra Dosha - Sun afflicted by Rahu/Ketu, or Saturn in 9th
4. Guru Chandal Dosha (Brihaspati-Rahu) - Jupiter-Rahu conjunction
5. Grahan Dosha (Rahu-Ketu with luminaries) - Sun/Moon with Rahu/Ketu

IMPORTANT EXCLUSION:
- Do NOT include Shani Sade Sati in dosha output. It is handled by a dedicated Sade Sati module for timeline-level consistency.

MINOR DOSHAS TO CHECK:
- Punarphoo Dosha (Saturn-Moon conjunction)
- Kemadruma Yoga (Moon isolated without planets in 2nd/12th)
- Vish Yoga (Saturn-Moon in same sign)
- Daridra Yoga (11th lord in dusthana)
- Gandmool Dosha (Moon in specific nakshatras)
- Kalathra Dosha (7th house/lord afflictions)

NULLIFICATION RULES:
- Mangal: Own/exaltation sign, or aspected by benefics
- Kaal Sarp: Only if exactly 7 planets are hemmed (partial doesn't count)
- Pitra: Jupiter aspect on afflicted Sun
- Many doshas are nullified by specific planetary combinations

For each dosha, always output in the STANDARDIZED TEMPLATE with all fields filled.
Even if a dosha is absent, include it with status: "absent" and empty arrays for effects/remedies.

Be HONEST about severity - don't minimize or exaggerate.`;

interface DoshasInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  moonSignIdx: number;
}

export async function generateDoshasPrediction(input: DoshasInput): Promise<AgentResponse<DoshasPrediction>> {
  const { planets, ascSignIdx, moonSignIdx } = input;

  // Pre-calculate some dosha indicators
  const mars = planets.find(p => p.name === "Mars");
  const saturn = planets.find(p => p.name === "Saturn");
  const jupiter = planets.find(p => p.name === "Jupiter");
  const rahu = planets.find(p => p.name === "Rahu");
  const ketu = planets.find(p => p.name === "Ketu");
  const sun = planets.find(p => p.name === "Sun");
  const moon = planets.find(p => p.name === "Moon");

  const marsHouse = mars?.house || 0;
  const mangalHouses = [1, 2, 4, 7, 8, 12];
  const potentialMangal = mangalHouses.includes(marsHouse);

  const userPrompt = `Analyze the following birth chart for ALL doshas with their remedies:

**Planetary Positions:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house}, ${p.deg.toFixed(1)}°)${p.isRetro ? " [R]" : ""}`).join("\n")}

**Key Indicators:**
- Ascendant Sign Index: ${ascSignIdx}
- Moon Sign Index: ${moonSignIdx}
- Mars House: ${marsHouse} (Potential Mangal Dosha: ${potentialMangal})
- Saturn House: ${saturn?.house || "N/A"}
- Jupiter House: ${jupiter?.house || "N/A"}
- Rahu House: ${rahu?.house || "N/A"}
- Ketu House: ${ketu?.house || "N/A"}
- Sun House: ${sun?.house || "N/A"}
- Moon House: ${moon?.house || "N/A"}

**Conjunctions to check:**
- Jupiter-Rahu: ${jupiter?.signIdx === rahu?.signIdx ? "YES" : "NO"}
- Saturn-Moon: ${saturn?.signIdx === moon?.signIdx ? "YES" : "NO"}
- Sun-Rahu: ${sun?.signIdx === rahu?.signIdx ? "YES" : "NO"}
- Sun-Ketu: ${sun?.signIdx === ketu?.signIdx ? "YES" : "NO"}
- Moon-Rahu: ${moon?.signIdx === rahu?.signIdx ? "YES" : "NO"}
- Moon-Ketu: ${moon?.signIdx === ketu?.signIdx ? "YES" : "NO"}

Provide a comprehensive dosha analysis with:
1. All 5 major doshas (even if absent)
2. Any detected minor doshas
3. Specific remedies for each present dosha
4. Priority-based remedy recommendations

Important: Do NOT include Shani Sade Sati in major/minor doshas or remedies.`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "2-3 paragraph overview of the dosha situation in this chart" },
      totalDoshasDetected: { type: "number" },
      majorDoshas: {
        type: "array",
        description: "All 5 major doshas with standardized analysis (excluding Sade Sati)",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            isPresent: { type: "boolean" },
            status: { type: "string", enum: ["present", "absent", "nullified", "partial"] },
            severity: { type: "string", enum: ["high", "medium", "low", "none"] },
            description: { type: "string" },
            cause: { type: "string", description: "What planetary placement caused this dosha" },
            effects: { type: "array", items: { type: "string" } },
            affectedLifeAreas: { type: "array", items: { type: "string" } },
            nullificationReason: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "isPresent", "status", "severity", "description", "cause", "effects", "affectedLifeAreas", "scripturalReference"]
        }
      },
      minorDoshas: {
        type: "array",
        description: "Any detected minor doshas",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            isPresent: { type: "boolean" },
            status: { type: "string", enum: ["present", "absent", "nullified", "partial"] },
            severity: { type: "string", enum: ["high", "medium", "low", "none"] },
            description: { type: "string" },
            cause: { type: "string" },
            effects: { type: "array", items: { type: "string" } },
            affectedLifeAreas: { type: "array", items: { type: "string" } },
            nullificationReason: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "isPresent", "status", "severity", "description", "cause", "effects", "affectedLifeAreas", "scripturalReference"]
        }
      },
      doshaRemedies: {
        type: "array",
        description: "Specific remedies for each present dosha",
        items: {
          type: "object",
          properties: {
            doshaName: { type: "string" },
            primaryRemedy: {
              type: "object",
              properties: {
                type: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                procedure: { type: "string" },
                timing: { type: "string" },
                expectedBenefits: { type: "array", items: { type: "string" } },
                scripturalBasis: { type: "string" }
              },
              required: ["type", "name", "description", "procedure", "timing", "expectedBenefits", "scripturalBasis"]
            },
            additionalRemedies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  procedure: { type: "string" }
                },
                required: ["type", "name", "description", "procedure"]
              }
            },
            mantras: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mantra: { type: "string" },
                  deity: { type: "string" },
                  japaCount: { type: "number" },
                  timing: { type: "string" },
                  benefits: { type: "string" }
                },
                required: ["mantra", "deity", "japaCount", "timing", "benefits"]
              }
            },
            gemstones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  weight: { type: "string" },
                  metal: { type: "string" },
                  finger: { type: "string" },
                  day: { type: "string" },
                  benefits: { type: "string" },
                  cautions: { type: "string" }
                },
                required: ["name", "weight", "metal", "finger", "day", "benefits", "cautions"]
              }
            },
            donations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  day: { type: "string" },
                  reason: { type: "string" }
                },
                required: ["item", "day", "reason"]
              }
            },
            fasting: {
              type: "object",
              nullable: true,
              properties: {
                day: { type: "string" },
                method: { type: "string" },
                benefits: { type: "string" }
              }
            }
          },
          required: ["doshaName", "primaryRemedy", "additionalRemedies", "mantras", "gemstones", "donations"]
        }
      },
      combinedEffects: {
        type: "object",
        properties: {
          description: { type: "string" },
          compoundingFactors: { type: "array", items: { type: "string" } },
          mitigatingFactors: { type: "array", items: { type: "string" } }
        },
        required: ["description", "compoundingFactors", "mitigatingFactors"]
      },
      priorityRemedies: {
        type: "object",
        properties: {
          immediate: { type: "array", items: { type: "string" }, description: "Start immediately" },
          shortTerm: { type: "array", items: { type: "string" }, description: "Within 1-3 months" },
          longTerm: { type: "array", items: { type: "string" }, description: "Ongoing practices" }
        },
        required: ["immediate", "shortTerm", "longTerm"]
      },
      generalGuidance: { type: "string" },
      disclaimerNote: { type: "string" }
    },
    required: ["overview", "totalDoshasDetected", "majorDoshas", "minorDoshas", "doshaRemedies", "combinedEffects", "priorityRemedies", "generalGuidance", "disclaimerNote"],
    additionalProperties: false
  };

  return callAgent<DoshasPrediction>(
    DOSHAS_SYSTEM_PROMPT,
    userPrompt,
    "generate_doshas_prediction",
    "Generate comprehensive dosha analysis with standardized template",
    toolSchema
  );
}
