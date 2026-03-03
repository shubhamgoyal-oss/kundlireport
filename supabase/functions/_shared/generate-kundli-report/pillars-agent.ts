// Pillars Agent - Generates Moon Sign, Ascendant, and Nakshatra deep analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";
import { getSignLord } from "./utils/dignity.ts";

export interface PillarsPrediction {
  moonSign: {
    sign: string;
    signHindi: string;
    element: string;
    modality: string;
    rulingPlanet: string;
    interpretation: string;
    emotionalNature: string;
    mentalPatterns: string;
    relationships: string;
    innerNeeds: string[];
  };
  ascendant: {
    sign: string;
    signHindi: string;
    rulingPlanet: string;
    rulerPlacement: string;
    interpretation: string;
    personality: string;
    physicalTraits: string;
    lifeApproach: string;
    firstImpressions: string[];
  };
  nakshatra: {
    name: string;
    nameHindi: string;
    pada: number;
    padaMeaning: string;
    lord: string;
    deity: string;
    symbol: string;
    interpretation: string;
    soulPurpose: string;
    karmaLesson: string;
    idealPath: string[];
  };
  synthesis: {
    overallPersonality: string;
    coreStrengths: string[];
    growthAreas: string[];
    lifePurpose: string;
  };
}

const SIGN_NAMES: Record<number, { en: string; hi: string; element: string; modality: string }> = {
  0: { en: "Aries", hi: "मेष", element: "Fire", modality: "Cardinal" },
  1: { en: "Taurus", hi: "वृष", element: "Earth", modality: "Fixed" },
  2: { en: "Gemini", hi: "मिथुन", element: "Air", modality: "Mutable" },
  3: { en: "Cancer", hi: "कर्क", element: "Water", modality: "Cardinal" },
  4: { en: "Leo", hi: "सिंह", element: "Fire", modality: "Fixed" },
  5: { en: "Virgo", hi: "कन्या", element: "Earth", modality: "Mutable" },
  6: { en: "Libra", hi: "तुला", element: "Air", modality: "Cardinal" },
  7: { en: "Scorpio", hi: "वृश्चिक", element: "Water", modality: "Fixed" },
  8: { en: "Sagittarius", hi: "धनु", element: "Fire", modality: "Mutable" },
  9: { en: "Capricorn", hi: "मकर", element: "Earth", modality: "Cardinal" },
  10: { en: "Aquarius", hi: "कुम्भ", element: "Air", modality: "Fixed" },
  11: { en: "Pisces", hi: "मीन", element: "Water", modality: "Mutable" },
};

interface PillarsInput {
  moonSignIdx: number;
  moonDegree: number;
  moonHouse: number;
  ascSignIdx: number;
  ascDegree: number;
  ascLordHouse: number;
  ascLordSign: string;
}

const PILLARS_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in the three foundational pillars of a horoscope:

1. **Chandra Rashi (Moon Sign)** - The emotional core, mind (manas), and instinctive nature
2. **Lagna (Ascendant)** - The physical body, personality projection, and life direction
3. **Janma Nakshatra (Birth Star)** - The soul's deeper purpose and karmic patterns

These three form the trinity that defines an individual's fundamental nature in Jyotish.

For each pillar, provide:
- Deep psychological and spiritual interpretation
- How it manifests in daily life
- Its influence on relationships and career
- Karmic implications and growth opportunities

Reference classical principles but make interpretations personal and actionable.
Use a warm, insightful tone that empowers the native.`;

export async function generatePillarsPrediction(input: PillarsInput): Promise<AgentResponse<PillarsPrediction>> {
  const moonSign = SIGN_NAMES[input.moonSignIdx];
  const ascSign = SIGN_NAMES[input.ascSignIdx];
  const moonNakshatra = getNakshatraWithPada(input.moonDegree);
  const moonLord = getSignLord(input.moonSignIdx);
  const ascLord = getSignLord(input.ascSignIdx);

  const userPrompt = `Analyze the Three Pillars for this native:

## MOON SIGN (Chandra Rashi)
- Sign: ${moonSign.en} (${moonSign.hi})
- Element: ${moonSign.element}
- Modality: ${moonSign.modality}
- Ruling Planet: ${moonLord}
- Moon Degree: ${input.moonDegree.toFixed(2)}°
- Moon in House: ${input.moonHouse}

## ASCENDANT (Lagna)
- Rising Sign: ${ascSign.en} (${ascSign.hi})
- Element: ${ascSign.element}
- Modality: ${ascSign.modality}
- Lagna Lord: ${ascLord}
- Ascendant Degree: ${input.ascDegree.toFixed(2)}°
- Lagna Lord Placed in: House ${input.ascLordHouse}, Sign ${input.ascLordSign}

## BIRTH NAKSHATRA (Janma Nakshatra)
- Nakshatra: ${moonNakshatra.nakshatra.name} (${moonNakshatra.nakshatra.nameHindi})
- Pada: ${moonNakshatra.pada}
- Nakshatra Lord: ${moonNakshatra.nakshatra.lord}
- Deity: ${moonNakshatra.nakshatra.deity}
- Symbol: ${moonNakshatra.nakshatra.symbol}
- Element: ${moonNakshatra.nakshatra.element}
- Guna (Quality): ${moonNakshatra.nakshatra.guna}

Provide comprehensive interpretations for each pillar and synthesize them into a unified personality profile.`;

  const toolSchema = {
    type: "object",
    properties: {
      moonSign: {
        type: "object",
        properties: {
          sign: { type: "string" },
          signHindi: { type: "string" },
          element: { type: "string" },
          modality: { type: "string" },
          rulingPlanet: { type: "string" },
          interpretation: { type: "string", description: "3-4 paragraph deep interpretation of Moon sign" },
          emotionalNature: { type: "string", description: "How emotions are processed and expressed" },
          mentalPatterns: { type: "string", description: "Thinking patterns and mental tendencies" },
          relationships: { type: "string", description: "How this Moon sign relates to others" },
          innerNeeds: { type: "array", items: { type: "string" }, description: "4-5 core emotional needs" }
        },
        required: ["sign", "signHindi", "element", "modality", "rulingPlanet", "interpretation", "emotionalNature", "mentalPatterns", "relationships", "innerNeeds"]
      },
      ascendant: {
        type: "object",
        properties: {
          sign: { type: "string" },
          signHindi: { type: "string" },
          rulingPlanet: { type: "string" },
          rulerPlacement: { type: "string" },
          interpretation: { type: "string", description: "3-4 paragraph interpretation of Ascendant" },
          personality: { type: "string", description: "How personality is expressed" },
          physicalTraits: { type: "string", description: "Physical tendencies and health areas" },
          lifeApproach: { type: "string", description: "General approach to life" },
          firstImpressions: { type: "array", items: { type: "string" }, description: "4-5 first impression traits" }
        },
        required: ["sign", "signHindi", "rulingPlanet", "rulerPlacement", "interpretation", "personality", "physicalTraits", "lifeApproach", "firstImpressions"]
      },
      nakshatra: {
        type: "object",
        properties: {
          name: { type: "string" },
          nameHindi: { type: "string" },
          pada: { type: "number" },
          padaMeaning: { type: "string", description: "Specific meaning of this pada" },
          lord: { type: "string" },
          deity: { type: "string" },
          symbol: { type: "string" },
          interpretation: { type: "string", description: "4-5 paragraph deep nakshatra analysis" },
          soulPurpose: { type: "string", description: "The deeper soul mission of this nakshatra" },
          karmaLesson: { type: "string", description: "Key karmic lessons to learn" },
          idealPath: { type: "array", items: { type: "string" }, description: "4-5 ideal life paths or careers" }
        },
        required: ["name", "nameHindi", "pada", "padaMeaning", "lord", "deity", "symbol", "interpretation", "soulPurpose", "karmaLesson", "idealPath"]
      },
      synthesis: {
        type: "object",
        properties: {
          overallPersonality: { type: "string", description: "2-3 paragraph synthesis of all three pillars" },
          coreStrengths: { type: "array", items: { type: "string" }, description: "5-6 core strengths" },
          growthAreas: { type: "array", items: { type: "string" }, description: "3-4 areas for growth" },
          lifePurpose: { type: "string", description: "Overall life purpose statement" }
        },
        required: ["overallPersonality", "coreStrengths", "growthAreas", "lifePurpose"]
      }
    },
    required: ["moonSign", "ascendant", "nakshatra", "synthesis"],
    additionalProperties: false
  };

  return callAgent<PillarsPrediction>(
    PILLARS_SYSTEM_PROMPT,
    userPrompt,
    "generate_pillars_prediction",
    "Generate deep analysis of Moon Sign, Ascendant, and Birth Nakshatra",
    toolSchema,
    "pillars"
  );
}
