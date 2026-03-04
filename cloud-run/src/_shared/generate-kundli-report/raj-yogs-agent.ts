// Raj Yogs Agent - Analyzes all Raja Yogas in the chart with standardized output template

import { callAgent, type AgentResponse } from "./agent-base";
import type { SeerPlanet } from "./seer-adapter";

// Standardized template for each yoga - frontend can render consistently
export interface YogaAnalysis {
  name: string;
  nameHindi: string;
  nameSanskrit: string;
  isPresent: boolean;
  strength: "very strong" | "strong" | "moderate" | "weak" | "none";
  // Standardized content sections (always present)
  definition: string;
  formationCriteria: string;
  formationInChart: string; // How it formed in THIS specific chart
  benefits: string[];
  activationPeriod: string;
  scripturalReference: string;
}

export interface RajYogsPrediction {
  overview: string;
  totalYogasDetected: number;
  
  // Major Raj Yogs (wealth, power, fame)
  rajYogas: YogaAnalysis[];
  
  // Dhana Yogs (wealth specifically)
  dhanaYogas: YogaAnalysis[];
  
  // Other Auspicious Yogs
  auspiciousYogas: YogaAnalysis[];
  
  // Negative Yogas (for balance)
  challengingYogas: YogaAnalysis[];
  
  // Combined analysis
  overallYogaStrength: {
    rating: "exceptional" | "strong" | "moderate" | "weak" | "mixed";
    description: string;
    peakPeriods: string[];
    activationAdvice: string[];
  };
  
  // Life area predictions based on yogas
  lifePredictions: {
    career: {
      strength: string;
      prediction: string;
      peakPeriod: string;
    };
    wealth: {
      strength: string;
      prediction: string;
      peakPeriod: string;
    };
    fame: {
      strength: string;
      prediction: string;
      peakPeriod: string;
    };
    spirituality: {
      strength: string;
      prediction: string;
      peakPeriod: string;
    };
  };
  
  // Enhancement recommendations
  yogaEnhancement: {
    practices: string[];
    mantras: Array<{
      mantra: string;
      purpose: string;
      timing: string;
    }>;
    gemstones: string[];
    favorablePeriods: string[];
  };
  
  summaryNote: string;
}

const RAJ_YOGS_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Raja Yoga analysis.

Your role is to identify all significant yogas (planetary combinations) in the birth chart, with focus on:
1. Raja Yogas - Conferring power, authority, success
2. Dhana Yogas - Conferring wealth and prosperity
3. Other auspicious yogas
4. Challenging yogas (for balance)

MAJOR RAJA YOGAS TO CHECK:
1. Gaja Kesari Yoga - Jupiter in kendra from Moon
2. Pancha Mahapurusha Yogas:
   - Hamsa Yoga (Jupiter in own/exaltation in kendra)
   - Malavya Yoga (Venus in own/exaltation in kendra)
   - Ruchaka Yoga (Mars in own/exaltation in kendra)
   - Bhadra Yoga (Mercury in own/exaltation in kendra)
   - Shasha Yoga (Saturn in own/exaltation in kendra)
3. Dhana Yoga - Lords of 1, 2, 5, 9, 11 in conjunction/aspect
4. Lakshmi Yoga - Venus strong, 9th lord in kendra
5. Chandra-Mangal Yoga - Moon-Mars conjunction
6. Budha-Aditya Yoga - Sun-Mercury conjunction
7. Viparita Raja Yoga - 6/8/12 lords in dusthana
8. Neecha Bhanga Raja Yoga - Debilitation cancelled
9. Adhi Yoga - Benefics in 6, 7, 8 from Moon
10. Sunapha, Anapha, Durudhura - Planets in 2nd/12th from Moon

DHANA YOGAS:
- Lords of 2, 5, 9, 11 in good positions
- Jupiter-Venus conjunction
- Strong 2nd and 11th houses

CHALLENGING YOGAS:
- Kemadruma - Moon alone without planets in 2/12
- Daridra Yoga - 11th lord weak
- Shakata Yoga - Moon in 6/8/12 from Jupiter

For each yoga:
1. Define it clearly
2. Explain how it formed in THIS chart
3. Give specific benefits
4. Mention activation period (dasha)
5. Cite scriptural source

Be HONEST - if a yoga is weak or partial, say so. Don't exaggerate.`;

interface RajYogsInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
}

export async function generateRajYogsPrediction(input: RajYogsInput): Promise<AgentResponse<RajYogsPrediction>> {
  const { planets, ascSignIdx } = input;

  // Pre-calculate some yoga indicators
  const jupiter = planets.find(p => p.name === "Jupiter");
  const venus = planets.find(p => p.name === "Venus");
  const mars = planets.find(p => p.name === "Mars");
  const mercury = planets.find(p => p.name === "Mercury");
  const saturn = planets.find(p => p.name === "Saturn");
  const moon = planets.find(p => p.name === "Moon");
  const sun = planets.find(p => p.name === "Sun");

  // Check for some common yoga indicators
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
- Sun-Mercury conjunction: ${sunMercuryConjunct} (Budha-Aditya potential)
- Jupiter House: ${jupiter?.house}
- Venus House: ${venus?.house}
- Mars House: ${mars?.house}
- Mercury House: ${mercury?.house}
- Saturn House: ${saturn?.house}

**Check for Pancha Mahapurusha Yogas:**
- Jupiter in ${jupiter?.sign} (House ${jupiter?.house}) - Own signs: Sagittarius, Pisces; Exalted: Cancer
- Venus in ${venus?.sign} (House ${venus?.house}) - Own signs: Taurus, Libra; Exalted: Pisces
- Mars in ${mars?.sign} (House ${mars?.house}) - Own signs: Aries, Scorpio; Exalted: Capricorn
- Mercury in ${mercury?.sign} (House ${mercury?.house}) - Own signs: Gemini, Virgo; Exalted: Virgo
- Saturn in ${saturn?.sign} (House ${saturn?.house}) - Own signs: Capricorn, Aquarius; Exalted: Libra

Provide a comprehensive yoga analysis with:
1. All detected Raja Yogas with strength assessment
2. Dhana Yogas for wealth
3. Other auspicious yogas
4. Any challenging yogas (for balance)
5. Life predictions based on yoga combinations
6. Enhancement recommendations`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "2-3 paragraph overview of the yoga situation in this chart" },
      totalYogasDetected: { type: "number" },
      rajYogas: {
        type: "array",
        description: "All detected Raja Yogas",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            nameSanskrit: { type: "string" },
            isPresent: { type: "boolean" },
            strength: { type: "string", enum: ["very strong", "strong", "moderate", "weak", "none"] },
            definition: { type: "string" },
            formationCriteria: { type: "string", description: "General criteria for this yoga" },
            formationInChart: { type: "string", description: "How it formed in THIS specific chart" },
            benefits: { type: "array", items: { type: "string" } },
            activationPeriod: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "nameSanskrit", "isPresent", "strength", "definition", "formationCriteria", "formationInChart", "benefits", "activationPeriod", "scripturalReference"]
        }
      },
      dhanaYogas: {
        type: "array",
        description: "Wealth-related yogas",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            nameSanskrit: { type: "string" },
            isPresent: { type: "boolean" },
            strength: { type: "string", enum: ["very strong", "strong", "moderate", "weak", "none"] },
            definition: { type: "string" },
            formationCriteria: { type: "string" },
            formationInChart: { type: "string" },
            benefits: { type: "array", items: { type: "string" } },
            activationPeriod: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "nameSanskrit", "isPresent", "strength", "definition", "formationCriteria", "formationInChart", "benefits", "activationPeriod", "scripturalReference"]
        }
      },
      auspiciousYogas: {
        type: "array",
        description: "Other beneficial yogas",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            nameSanskrit: { type: "string" },
            isPresent: { type: "boolean" },
            strength: { type: "string", enum: ["very strong", "strong", "moderate", "weak", "none"] },
            definition: { type: "string" },
            formationCriteria: { type: "string" },
            formationInChart: { type: "string" },
            benefits: { type: "array", items: { type: "string" } },
            activationPeriod: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "nameSanskrit", "isPresent", "strength", "definition", "formationCriteria", "formationInChart", "benefits", "activationPeriod", "scripturalReference"]
        }
      },
      challengingYogas: {
        type: "array",
        description: "Challenging yogas for balance",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            nameHindi: { type: "string" },
            nameSanskrit: { type: "string" },
            isPresent: { type: "boolean" },
            strength: { type: "string", enum: ["very strong", "strong", "moderate", "weak", "none"] },
            definition: { type: "string" },
            formationCriteria: { type: "string" },
            formationInChart: { type: "string" },
            benefits: { type: "array", items: { type: "string" }, description: "Actually effects/challenges" },
            activationPeriod: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "nameHindi", "nameSanskrit", "isPresent", "strength", "definition", "formationCriteria", "formationInChart", "benefits", "activationPeriod", "scripturalReference"]
        }
      },
      overallYogaStrength: {
        type: "object",
        properties: {
          rating: { type: "string", enum: ["exceptional", "strong", "moderate", "weak", "mixed"] },
          description: { type: "string" },
          peakPeriods: { type: "array", items: { type: "string" } },
          activationAdvice: { type: "array", items: { type: "string" } }
        },
        required: ["rating", "description", "peakPeriods", "activationAdvice"]
      },
      lifePredictions: {
        type: "object",
        properties: {
          career: {
            type: "object",
            properties: {
              strength: { type: "string" },
              prediction: { type: "string" },
              peakPeriod: { type: "string" }
            },
            required: ["strength", "prediction", "peakPeriod"]
          },
          wealth: {
            type: "object",
            properties: {
              strength: { type: "string" },
              prediction: { type: "string" },
              peakPeriod: { type: "string" }
            },
            required: ["strength", "prediction", "peakPeriod"]
          },
          fame: {
            type: "object",
            properties: {
              strength: { type: "string" },
              prediction: { type: "string" },
              peakPeriod: { type: "string" }
            },
            required: ["strength", "prediction", "peakPeriod"]
          },
          spirituality: {
            type: "object",
            properties: {
              strength: { type: "string" },
              prediction: { type: "string" },
              peakPeriod: { type: "string" }
            },
            required: ["strength", "prediction", "peakPeriod"]
          }
        },
        required: ["career", "wealth", "fame", "spirituality"]
      },
      yogaEnhancement: {
        type: "object",
        properties: {
          practices: { type: "array", items: { type: "string" } },
          mantras: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mantra: { type: "string" },
                purpose: { type: "string" },
                timing: { type: "string" }
              },
              required: ["mantra", "purpose", "timing"]
            }
          },
          gemstones: { type: "array", items: { type: "string" } },
          favorablePeriods: { type: "array", items: { type: "string" } }
        },
        required: ["practices", "mantras", "gemstones", "favorablePeriods"]
      },
      summaryNote: { type: "string" }
    },
    required: ["overview", "totalYogasDetected", "rajYogas", "dhanaYogas", "auspiciousYogas", "challengingYogas", "overallYogaStrength", "lifePredictions", "yogaEnhancement", "summaryNote"],
    additionalProperties: false
  };

  return callAgent<RajYogsPrediction>(
    RAJ_YOGS_SYSTEM_PROMPT,
    userPrompt,
    "generate_raj_yogs_prediction",
    "Generate comprehensive Raja Yoga analysis with standardized template",
    toolSchema,
    "rajYogs"
  );
}
