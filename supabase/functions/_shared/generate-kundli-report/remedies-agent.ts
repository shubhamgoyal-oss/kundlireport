// Remedies Agent - Generates comprehensive remedial measures with trust-building content

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { calculateDignity } from "./utils/dignity.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface RemedyDetail {
  name: string;
  description: string;
  scripturalReference: string;
  scientificBasis: string;
  howItWorks: string;
  procedure: string;
  expectedBenefits: string[];
  timeToResults: string;
  precautions: string[];
}

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
    // Trust-building details
    scripturalReference: string;
    scientificBasis: string;
    authenticity: string;
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
      // Trust-building details
      scripturalReference: string;
      scientificBasis: string;
      howItWorks: string;
      qualityGuidelines: string;
    };
    secondary: {
      stone: string;
      planet: string;
      benefits: string;
      scripturalReference: string;
    };
    avoid: string[];
    gemologyExplanation: string;
  };
  mantras: Array<{
    mantra: string;
    planet: string;
    japaCount: number;
    timing: string;
    benefits: string;
    pronunciation: string;
    // Trust-building details
    scripturalSource: string;
    vibrationalScience: string;
    properMethod: string;
  }>;
  yantras: Array<{
    name: string;
    planet: string;
    placement: string;
    benefits: string;
    // Trust-building details
    geometricSignificance: string;
    consecrationMethod: string;
    scripturalReference: string;
  }>;
  pujaRecommendations: Array<{
    name: string;
    deity: string;
    purpose: string;
    frequency: string;
    benefits: string[];
    scripturalBasis: string;
    procedure: string;
  }>;
  ishtaDevata: {
    deity: string;
    reason: string;
    worship: string;
    mantra: string;
    templeVisit: string;
    // Trust-building details
    scripturalDerivation: string;
    significance: string;
  };
  donations: Array<{
    item: string;
    day: string;
    planet: string;
    reason: string;
    // Trust-building details
    scripturalReference: string;
    karmaScience: string;
  }>;
  fasting: Array<{
    day: string;
    planet: string;
    method: string;
    benefits: string;
    // Trust-building details
    scripturalReference: string;
    physiologicalBenefits: string;
  }>;
  colorTherapy: {
    favorable: string[];
    avoid: string[];
    explanation: string;
    scientificBasis: string;
  };
  directionGuidance: {
    favorable: string[];
    avoid: string[];
    sleepDirection: string;
    workDirection: string;
    vastuExplanation: string;
  };
  healthGuidance: {
    ageGroup: string;
    whyThisMatters: string;
    safeMovement: string[];
    nutritionAndHydration: string[];
    recoveryAndSleep: string[];
    preventiveChecks: string[];
    avoidOverstrain: string[];
    medicalDisclaimer: string;
  };
  dailyRoutine: string[];
  spiritualPractices: string[];
  generalAdvice: string;
  // Master trust-building section
  remediesPhilosophy: {
    vedicFoundation: string;
    howRemediesWork: string;
    importanceOfFaith: string;
    scientificPerspective: string;
    traditionalWisdom: string;
  };
}

const REMEDIES_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Jyotish remedies (Upayas).

Your role is not just to recommend remedies, but to explain WHY they work and build trust through:
1. Scriptural references (citing Brihat Parashara Hora Shastra, Jataka Parijata, Phaladeepika, etc.)
2. Scientific/logical explanations (vibration, energy, psychology, biochemistry)
3. Traditional wisdom and time-tested practices
4. Clear procedures and expected outcomes

Provide comprehensive remedial measures based on:
1. Weak or afflicted planets in the chart
2. Current dasha period requirements
3. Specific life challenges indicated by the chart

For EACH remedy category, include:
- The specific recommendation
- Scriptural source/reference
- Scientific or logical basis
- How it works mechanistically
- Proper procedure
- Expected timeline for results
- Precautions

Remedies should include:
- Rudraksha recommendations with specific mukhi and authenticity guidance
- Gemstone recommendations with quality guidelines and wearing instructions
- Mantras with proper pronunciation, japa count, and vibrational science
- Yantras with geometric significance and consecration methods
- Puja recommendations with specific deities and procedures
- Ishta Devata (personal deity) with scriptural derivation
- Donations (daan) with karma science explanation
- Fasting recommendations with physiological benefits
- Color and direction guidance with Vastu principles
- Daily spiritual practices

Be specific about timing, quantities, and methods. Reference classical texts where appropriate.
Build trust by explaining the science and tradition behind each remedy.`;

interface RemediesInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  birthDate?: Date;
  generatedAt?: Date;
}

export async function generateRemediesPrediction(input: RemediesInput): Promise<AgentResponse<RemediesPrediction>> {
  const { planets, birthDate, generatedAt } = input;
  
  // Find weak planets
  const weakPlanets = planets.filter(p => {
    if (p.name === "Rahu" || p.name === "Ketu") return false;
    const dignity = calculateDignity(p.name, p.signIdx, p.deg);
    return dignity === "debilitated" || dignity === "enemy";
  });
  
  // Find afflicted planets (in houses 6, 8, 12)
  const afflictedPlanets = planets.filter(p => [6, 8, 12].includes(p.house));
  const now = generatedAt || new Date();
  const ageYears = birthDate
    ? Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : null;
  const ageGroup = ageYears === null
    ? "unknown"
    : ageYears < 18
      ? "minor"
      : ageYears < 35
        ? "young_adult"
        : ageYears < 60
          ? "adult"
          : "senior";

  const userPrompt = `Provide comprehensive remedies with trust-building explanations based on the chart:

**Weak Planets (Debilitated/Enemy signs):**
${weakPlanets.map(p => `- ${p.name} in ${p.sign} (House ${p.house})`).join("\n") || "- None significantly weak"}

**Afflicted Planets (6th, 8th, 12th houses):**
${afflictedPlanets.map(p => `- ${p.name} in ${p.sign} (House ${p.house})`).join("\n") || "- None in dusthana houses"}

**All Planetary Positions:**
${planets.map(p => {
  const dignity = calculateDignity(p.name, p.signIdx, p.deg);
  return `- ${p.name}: ${p.sign} (House ${p.house}) - ${dignity}${p.isRetro ? " [R]" : ""}`;
}).join("\n")}

**Native Health Context:**
- Approximate Age: ${ageYears ?? "Unknown"} years
- Age Group: ${ageGroup}

CRITICAL HEALTH SAFETY RULES (MANDATORY):
1. All health guidance must be age-appropriate and low-risk.
2. For seniors, avoid high-impact suggestions (e.g., running, intense HIIT, heavy strain).
3. For minors, suggest guardian-supervised routines only.
4. For unknown age, default to gentle, universally safe suggestions.
5. Never diagnose disease or replace medical treatment.
6. Include a clear medical disclaimer.

For EACH remedy, provide:
1. The specific recommendation
2. Scriptural source (e.g., "As per Brihat Parashara Hora Shastra, Chapter 85...")
3. Scientific/logical explanation of how it works
4. Proper procedure with step-by-step guidance
5. Expected benefits and timeline

Provide detailed remedies with trust-building content for:
1. Rudraksha recommendations (with authenticity guidance)
2. Gemstone guidance (with quality guidelines and proper wearing instructions)
3. Mantras with pronunciation, vibrational science, and proper method
4. Yantra recommendations with geometric significance
5. Puja recommendations with specific procedures
6. Ishta Devata identification with scriptural derivation
7. Donation schedule with karma science explanation
8. Fasting recommendations with physiological benefits
9. Color and direction guidance with Vastu principles
10. Daily spiritual practices

Also include structured "Health Guidance" with:
- safe movement suggestions
- nutrition and hydration hygiene
- sleep/recovery discipline
- preventive check guidance
- age-specific strain to avoid

Also include a "Remedies Philosophy" section explaining:
- The Vedic foundation of remedies
- How remedies work (energy, karma, vibration)
- The role of faith and intention
- Scientific perspective on traditional practices`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph remedies overview explaining the approach" },
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
            wearingInstructions: { type: "string" },
            scripturalReference: { type: "string" },
            scientificBasis: { type: "string" },
            authenticity: { type: "string", description: "How to verify authenticity of the rudraksha" }
          },
          required: ["mukhi", "name", "planet", "benefits", "wearingInstructions", "scripturalReference", "scientificBasis", "authenticity"]
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
              cautions: { type: "string" },
              scripturalReference: { type: "string" },
              scientificBasis: { type: "string" },
              howItWorks: { type: "string" },
              qualityGuidelines: { type: "string" }
            },
            required: ["stone", "planet", "weight", "metal", "finger", "day", "benefits", "cautions", "scripturalReference", "scientificBasis", "howItWorks", "qualityGuidelines"]
          },
          secondary: {
            type: "object",
            properties: {
              stone: { type: "string" },
              planet: { type: "string" },
              benefits: { type: "string" },
              scripturalReference: { type: "string" }
            },
            required: ["stone", "planet", "benefits", "scripturalReference"]
          },
          avoid: { type: "array", items: { type: "string" } },
          gemologyExplanation: { type: "string", description: "How gemstones work from Vedic perspective" }
        },
        required: ["primary", "secondary", "avoid", "gemologyExplanation"]
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
            pronunciation: { type: "string" },
            scripturalSource: { type: "string" },
            vibrationalScience: { type: "string" },
            properMethod: { type: "string" }
          },
          required: ["mantra", "planet", "japaCount", "timing", "benefits", "pronunciation", "scripturalSource", "vibrationalScience", "properMethod"]
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
            benefits: { type: "string" },
            geometricSignificance: { type: "string" },
            consecrationMethod: { type: "string" },
            scripturalReference: { type: "string" }
          },
          required: ["name", "planet", "placement", "benefits", "geometricSignificance", "consecrationMethod", "scripturalReference"]
        }
      },
      pujaRecommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            deity: { type: "string" },
            purpose: { type: "string" },
            frequency: { type: "string" },
            benefits: { type: "array", items: { type: "string" } },
            scripturalBasis: { type: "string" },
            procedure: { type: "string" }
          },
          required: ["name", "deity", "purpose", "frequency", "benefits", "scripturalBasis", "procedure"]
        }
      },
      ishtaDevata: {
        type: "object",
        properties: {
          deity: { type: "string" },
          reason: { type: "string" },
          worship: { type: "string" },
          mantra: { type: "string" },
          templeVisit: { type: "string" },
          scripturalDerivation: { type: "string" },
          significance: { type: "string" }
        },
        required: ["deity", "reason", "worship", "mantra", "templeVisit", "scripturalDerivation", "significance"]
      },
      donations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string" },
            day: { type: "string" },
            planet: { type: "string" },
            reason: { type: "string" },
            scripturalReference: { type: "string" },
            karmaScience: { type: "string" }
          },
          required: ["item", "day", "planet", "reason", "scripturalReference", "karmaScience"]
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
            benefits: { type: "string" },
            scripturalReference: { type: "string" },
            physiologicalBenefits: { type: "string" }
          },
          required: ["day", "planet", "method", "benefits", "scripturalReference", "physiologicalBenefits"]
        }
      },
      colorTherapy: {
        type: "object",
        properties: {
          favorable: { type: "array", items: { type: "string" } },
          avoid: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
          scientificBasis: { type: "string" }
        },
        required: ["favorable", "avoid", "explanation", "scientificBasis"]
      },
      directionGuidance: {
        type: "object",
        properties: {
          favorable: { type: "array", items: { type: "string" } },
          avoid: { type: "array", items: { type: "string" } },
          sleepDirection: { type: "string" },
          workDirection: { type: "string" },
          vastuExplanation: { type: "string" }
        },
        required: ["favorable", "avoid", "sleepDirection", "workDirection", "vastuExplanation"]
      },
      healthGuidance: {
        type: "object",
        properties: {
          ageGroup: { type: "string" },
          whyThisMatters: { type: "string" },
          safeMovement: { type: "array", items: { type: "string" } },
          nutritionAndHydration: { type: "array", items: { type: "string" } },
          recoveryAndSleep: { type: "array", items: { type: "string" } },
          preventiveChecks: { type: "array", items: { type: "string" } },
          avoidOverstrain: { type: "array", items: { type: "string" } },
          medicalDisclaimer: { type: "string" }
        },
        required: ["ageGroup", "whyThisMatters", "safeMovement", "nutritionAndHydration", "recoveryAndSleep", "preventiveChecks", "avoidOverstrain", "medicalDisclaimer"]
      },
      dailyRoutine: { type: "array", items: { type: "string" } },
      spiritualPractices: { type: "array", items: { type: "string" } },
      generalAdvice: { type: "string" },
      remediesPhilosophy: {
        type: "object",
        description: "Master section explaining the philosophy of remedies",
        properties: {
          vedicFoundation: { type: "string", description: "Explain the Vedic basis of remedies" },
          howRemediesWork: { type: "string", description: "Explain the mechanism of how remedies work" },
          importanceOfFaith: { type: "string", description: "Role of faith and intention in remedies" },
          scientificPerspective: { type: "string", description: "Modern scientific view on traditional remedies" },
          traditionalWisdom: { type: "string", description: "Why these practices have survived millennia" }
        },
        required: ["vedicFoundation", "howRemediesWork", "importanceOfFaith", "scientificPerspective", "traditionalWisdom"]
      }
    },
    required: ["overview", "weakPlanets", "rudrakshaRecommendations", "gemstoneRecommendations", "mantras", "yantras", "pujaRecommendations", "ishtaDevata", "donations", "fasting", "colorTherapy", "directionGuidance", "healthGuidance", "dailyRoutine", "spiritualPractices", "generalAdvice", "remediesPhilosophy"],
    additionalProperties: false
  };

  return callAgent<RemediesPrediction>(
    REMEDIES_SYSTEM_PROMPT,
    userPrompt,
    "generate_remedies_prediction",
    "Generate comprehensive astrological remedies with trust-building content",
    toolSchema,
    "remedies"
  );
}
