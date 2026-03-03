// Panchang Agent - Generates Vaar, Tithi, Nakshatra, Karana, Yoga interpretations

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { VAAR_INFO, TITHI_INFO, KARANA_INFO, YOGA_INFO } from "./utils/panchang.ts";
import { getNakshatraWithPada, type NakshatraInfo } from "./utils/nakshatra.ts";

export interface PanchangPrediction {
  vaar: {
    day: string;
    dayHindi: string;
    planet: string;
    interpretation: string;
    strengths: string[];
    challenges: string[];
  };
  tithi: {
    name: string;
    number: number;
    paksha: string;
    interpretation: string;
    luckyActivities: string[];
    avoidActivities: string[];
  };
  nakshatra: {
    name: string;
    nameHindi: string;
    pada: number;
    lord: string;
    deity: string;
    symbol: string;
    interpretation: string;
    characteristics: string[];
  };
  karana: {
    name: string;
    interpretation: string;
    suitableFor: string[];
  };
  yoga: {
    name: string;
    category: string;
    interpretation: string;
    effects: string[];
  };
}

interface PanchangInput {
  birthDate: Date;
  moonDegree: number;
  sunDegree: number;
  vaarIndex: number;
  tithiNumber: number;
  karanaName: string;
  yogaName: string;
}

const PANCHANG_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Panchang (Hindu almanac) interpretation.

Your role is to provide deep, personalized interpretations of the five limbs of Panchang:
1. Vaar (Weekday) - The planetary day of birth
2. Tithi (Lunar day) - The Moon-Sun angle phase
3. Nakshatra (Lunar mansion) - The Moon's position in the 27 star divisions
4. Karana (Half-tithi) - Half of a lunar day
5. Yoga (Luni-solar combination) - The combined Sun-Moon longitude

For each element, provide:
- Its core significance in Vedic tradition
- How it specifically influences the native's personality and life
- Practical strengths and challenges
- Recommendations for harnessing its energy

Be specific, avoid generic statements. Reference classical texts where appropriate (Brihat Parashara Hora Shastra, Phaladeepika, etc.).
Write in a warm, professional tone. Each interpretation should be 2-3 sentences minimum.`;

export async function generatePanchangPrediction(input: PanchangInput): Promise<AgentResponse<PanchangPrediction>> {
  const vaarInfo = VAAR_INFO[input.vaarIndex];
  const tithiInfo = TITHI_INFO[input.tithiNumber] || TITHI_INFO[1];
  const karanaInfo = KARANA_INFO[input.karanaName] || { nature: "Unknown", mobility: "Unknown" };
  const yogaInfo = YOGA_INFO[input.yogaName] || { nature: "Unknown", category: "Neutral" };
  const nakshatraData = getNakshatraWithPada(input.moonDegree);

  const userPrompt = `Generate a comprehensive Panchang interpretation for a person born on:

**Birth Day:** ${vaarInfo.name} (${vaarInfo.nameHindi})
- Ruling Planet: ${vaarInfo.planet}
- Natural Significations: ${vaarInfo.nature}

**Tithi:** ${tithiInfo.name} (Tithi #${input.tithiNumber})
- Paksha: ${tithiInfo.paksha} (${tithiInfo.paksha === 'Shukla' ? 'Waxing' : 'Waning'} Moon)
- Ruling Deity: ${tithiInfo.ruling_deity}
- Traditional Nature: ${tithiInfo.nature}

**Nakshatra:** ${nakshatraData.nakshatra.name} (${nakshatraData.nakshatra.nameHindi})
- Pada: ${nakshatraData.pada}
- Lord: ${nakshatraData.nakshatra.lord}
- Deity: ${nakshatraData.nakshatra.deity}
- Symbol: ${nakshatraData.nakshatra.symbol}
- Element: ${nakshatraData.nakshatra.element}
- Guna: ${nakshatraData.nakshatra.guna}

**Karana:** ${input.karanaName}
- Nature: ${karanaInfo.nature}
- Mobility: ${karanaInfo.mobility}

**Yoga:** ${input.yogaName}
- Nature: ${yogaInfo.nature}
- Category: ${yogaInfo.category}

Provide detailed, personalized interpretations for each Panchang element. Focus on how these cosmic conditions at birth shape the native's core nature, mental patterns, and life trajectory.`;

  const toolSchema = {
    type: "object",
    properties: {
      vaar: {
        type: "object",
        properties: {
          day: { type: "string" },
          dayHindi: { type: "string" },
          planet: { type: "string" },
          interpretation: { type: "string", description: "2-3 paragraph interpretation of birth day influence" },
          strengths: { type: "array", items: { type: "string" }, description: "3-5 natural strengths from this day" },
          challenges: { type: "array", items: { type: "string" }, description: "2-3 potential challenges" }
        },
        required: ["day", "dayHindi", "planet", "interpretation", "strengths", "challenges"]
      },
      tithi: {
        type: "object",
        properties: {
          name: { type: "string" },
          number: { type: "number" },
          paksha: { type: "string" },
          interpretation: { type: "string", description: "2-3 paragraph interpretation of tithi influence" },
          luckyActivities: { type: "array", items: { type: "string" }, description: "Activities favored by this tithi" },
          avoidActivities: { type: "array", items: { type: "string" }, description: "Activities to avoid" }
        },
        required: ["name", "number", "paksha", "interpretation", "luckyActivities", "avoidActivities"]
      },
      nakshatra: {
        type: "object",
        properties: {
          name: { type: "string" },
          nameHindi: { type: "string" },
          pada: { type: "number" },
          lord: { type: "string" },
          deity: { type: "string" },
          symbol: { type: "string" },
          interpretation: { type: "string", description: "3-4 paragraph deep interpretation of birth nakshatra" },
          characteristics: { type: "array", items: { type: "string" }, description: "5-7 key personality traits" }
        },
        required: ["name", "nameHindi", "pada", "lord", "deity", "symbol", "interpretation", "characteristics"]
      },
      karana: {
        type: "object",
        properties: {
          name: { type: "string" },
          interpretation: { type: "string", description: "1-2 paragraph interpretation" },
          suitableFor: { type: "array", items: { type: "string" }, description: "Activities suited for this karana" }
        },
        required: ["name", "interpretation", "suitableFor"]
      },
      yoga: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          interpretation: { type: "string", description: "2-3 paragraph interpretation of yoga influence" },
          effects: { type: "array", items: { type: "string" }, description: "3-5 life effects of this yoga" }
        },
        required: ["name", "category", "interpretation", "effects"]
      }
    },
    required: ["vaar", "tithi", "nakshatra", "karana", "yoga"],
    additionalProperties: false
  };

  return callAgent<PanchangPrediction>(
    PANCHANG_SYSTEM_PROMPT,
    userPrompt,
    "generate_panchang_prediction",
    "Generate detailed Panchang interpretation based on birth time elements",
    toolSchema,
    "panchang"
  );
}
