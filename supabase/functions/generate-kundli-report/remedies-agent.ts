// Remedies Agent - Generates comprehensive remedial measures

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { calculateDignity } from "./utils/dignity.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface RemediesPrediction {
  overview: string;
  weakPlanets: Array<{
    planet: string;
    reason: string;
    severity: string;
  }>;
  rudrakshaRecommendations: Array<{
    mukhi: number;
    name: string;
    planet: string;
    benefits: string;
    wearingInstructions: string;
  }>;
  gemstoneRecommendations: {
    primary: {
      stone: string;
      planet: string;
      weight: string;
      metal: string;
      finger: string;
      day: string;
      benefits: string;
      cautions: string;
    };
    secondary: {
      stone: string;
      planet: string;
      benefits: string;
    };
    avoid: string[];
  };
  mantras: Array<{
    mantra: string;
    planet: string;
    japaCount: number;
    timing: string;
    benefits: string;
    pronunciation: string;
  }>;
  yantras: Array<{
    name: string;
    planet: string;
    placement: string;
    benefits: string;
  }>;
  ishtaDevata: {
    deity: string;
    reason: string;
    worship: string;
    mantra: string;
    templeVisit: string;
  };
  donations: Array<{
    item: string;
    day: string;
    planet: string;
    reason: string;
  }>;
  fasting: Array<{
    day: string;
    planet: string;
    method: string;
    benefits: string;
  }>;
  colorTherapy: {
    favorable: string[];
    avoid: string[];
    explanation: string;
  };
  directionGuidance: {
    favorable: string[];
    avoid: string[];
    sleepDirection: string;
    workDirection: string;
  };
  dailyRoutine: string[];
  spiritualPractices: string[];
  generalAdvice: string;
}

const REMEDIES_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Jyotish remedies (Upayas).

Provide comprehensive remedial measures based on:
1. Weak or afflicted planets in the chart
2. Current dasha period requirements
3. Specific life challenges indicated by the chart

Remedies should include:
- Rudraksha recommendations with specific mukhi
- Gemstone recommendations with proper wearing instructions
- Mantras with japa count and timing
- Yantras for specific purposes
- Ishta Devata (personal deity) recommendations
- Donations (daan) with specific items and days
- Fasting recommendations
- Color and direction guidance
- Daily spiritual practices

Be specific about timing, quantities, and methods. Reference classical texts where appropriate.`;

interface RemediesInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
}

export async function generateRemediesPrediction(input: RemediesInput): Promise<AgentResponse<RemediesPrediction>> {
  const { planets } = input;
  
  // Find weak planets
  const weakPlanets = planets.filter(p => {
    if (p.name === "Rahu" || p.name === "Ketu") return false;
    const dignity = calculateDignity(p.name, p.signIdx, p.deg);
    return dignity === "debilitated" || dignity === "enemy";
  });
  
  // Find afflicted planets (in houses 6, 8, 12)
  const afflictedPlanets = planets.filter(p => [6, 8, 12].includes(p.house));

  const userPrompt = `Provide comprehensive remedies based on the chart:

**Weak Planets (Debilitated/Enemy signs):**
${weakPlanets.map(p => `- ${p.name} in ${p.sign} (House ${p.house})`).join("\n") || "- None significantly weak"}

**Afflicted Planets (6th, 8th, 12th houses):**
${afflictedPlanets.map(p => `- ${p.name} in ${p.sign} (House ${p.house})`).join("\n") || "- None in dusthana houses"}

**All Planetary Positions:**
${planets.map(p => {
  const dignity = calculateDignity(p.name, p.signIdx, p.deg);
  return `- ${p.name}: ${p.sign} (House ${p.house}) - ${dignity}${p.isRetro ? " [R]" : ""}`;
}).join("\n")}

Provide detailed remedies with:
1. Rudraksha recommendations (multiple options)
2. Gemstone guidance (primary + secondary)
3. Mantras with specific counts and timing
4. Yantra recommendations
5. Ishta Devata identification
6. Donation schedule
7. Fasting recommendations
8. Color and direction guidance
9. Daily spiritual practices`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph remedies overview" },
      weakPlanets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            planet: { type: "string" },
            reason: { type: "string" },
            severity: { type: "string" }
          },
          required: ["planet", "reason", "severity"]
        }
      },
      rudrakshaRecommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mukhi: { type: "number" },
            name: { type: "string" },
            planet: { type: "string" },
            benefits: { type: "string" },
            wearingInstructions: { type: "string" }
          },
          required: ["mukhi", "name", "planet", "benefits", "wearingInstructions"]
        }
      },
      gemstoneRecommendations: {
        type: "object",
        properties: {
          primary: {
            type: "object",
            properties: {
              stone: { type: "string" },
              planet: { type: "string" },
              weight: { type: "string" },
              metal: { type: "string" },
              finger: { type: "string" },
              day: { type: "string" },
              benefits: { type: "string" },
              cautions: { type: "string" }
            },
            required: ["stone", "planet", "weight", "metal", "finger", "day", "benefits", "cautions"]
          },
          secondary: {
            type: "object",
            properties: {
              stone: { type: "string" },
              planet: { type: "string" },
              benefits: { type: "string" }
            },
            required: ["stone", "planet", "benefits"]
          },
          avoid: { type: "array", items: { type: "string" } }
        },
        required: ["primary", "secondary", "avoid"]
      },
      mantras: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mantra: { type: "string" },
            planet: { type: "string" },
            japaCount: { type: "number" },
            timing: { type: "string" },
            benefits: { type: "string" },
            pronunciation: { type: "string" }
          },
          required: ["mantra", "planet", "japaCount", "timing", "benefits", "pronunciation"]
        }
      },
      yantras: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            planet: { type: "string" },
            placement: { type: "string" },
            benefits: { type: "string" }
          },
          required: ["name", "planet", "placement", "benefits"]
        }
      },
      ishtaDevata: {
        type: "object",
        properties: {
          deity: { type: "string" },
          reason: { type: "string" },
          worship: { type: "string" },
          mantra: { type: "string" },
          templeVisit: { type: "string" }
        },
        required: ["deity", "reason", "worship", "mantra", "templeVisit"]
      },
      donations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string" },
            day: { type: "string" },
            planet: { type: "string" },
            reason: { type: "string" }
          },
          required: ["item", "day", "planet", "reason"]
        }
      },
      fasting: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "string" },
            planet: { type: "string" },
            method: { type: "string" },
            benefits: { type: "string" }
          },
          required: ["day", "planet", "method", "benefits"]
        }
      },
      colorTherapy: {
        type: "object",
        properties: {
          favorable: { type: "array", items: { type: "string" } },
          avoid: { type: "array", items: { type: "string" } },
          explanation: { type: "string" }
        },
        required: ["favorable", "avoid", "explanation"]
      },
      directionGuidance: {
        type: "object",
        properties: {
          favorable: { type: "array", items: { type: "string" } },
          avoid: { type: "array", items: { type: "string" } },
          sleepDirection: { type: "string" },
          workDirection: { type: "string" }
        },
        required: ["favorable", "avoid", "sleepDirection", "workDirection"]
      },
      dailyRoutine: { type: "array", items: { type: "string" } },
      spiritualPractices: { type: "array", items: { type: "string" } },
      generalAdvice: { type: "string" }
    },
    required: ["overview", "weakPlanets", "rudrakshaRecommendations", "gemstoneRecommendations", "mantras", "yantras", "ishtaDevata", "donations", "fasting", "colorTherapy", "directionGuidance", "dailyRoutine", "spiritualPractices", "generalAdvice"],
    additionalProperties: false
  };

  return callAgent<RemediesPrediction>(
    REMEDIES_SYSTEM_PROMPT,
    userPrompt,
    "generate_remedies_prediction",
    "Generate comprehensive astrological remedies",
    toolSchema
  );
}
