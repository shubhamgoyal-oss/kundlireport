// Marriage Agent - Generates detailed marriage and relationship analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { getSignLord } from "./utils/dignity.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import type { CharaKaraka } from "./utils/chara-karakas.ts";

export interface MarriagePrediction {
  overview: string;
  fifthHouse: {
    sign: string;
    lord: string;
    lordPlacement: string;
    occupants: string[];
    loveNature: string;
    romanceStyle: string;
    interpretation: string;
  };
  seventhHouse: {
    sign: string;
    lord: string;
    lordPlacement: string;
    occupants: string[];
    marriageProspects: string;
    interpretation: string;
  };
  venusAnalysis: {
    sign: string;
    house: number;
    dignity: string;
    interpretation: string;
    attractionStyle: string;
    relationshipNeeds: string;
  };
  darakaraka: {
    planet: string;
    sign: string;
    house: number;
    interpretation: string;
    partnerQualities: string[];
    partnerProfession: string[];
  };
  partnerProfile: {
    physicalTraits: string;
    personality: string;
    background: string;
    direction: string;
    meetingCircumstances: string;
  };
  marriageTiming: {
    favorablePeriods: string[];
    challengingPeriods: string[];
    idealAgeRange: string;
    currentProspects: string;
  };
  compatibility: {
    bestMatches: string[];
    challengingMatches: string[];
    advice: string;
  };
  mangalDosha: {
    present: boolean;
    severity: string;
    remedies: string[];
  };
  challenges: string[];
  strengths: string[];
  recommendations: string[];
}

const MARRIAGE_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in marriage, relationships, and compatibility.

Analyze the chart to provide comprehensive marriage predictions covering:
1. The 7th house (Kalatra Bhava) - primary marriage indicator
2. The 5th house - romance, love affairs, courtship
3. Venus - natural significator of love and marriage
4. Darakaraka - the spouse significator (Jaimini)
5. Mars - for Mangal Dosha analysis
6. 2nd house - family life after marriage

Provide specific predictions about:
- Partner's qualities, appearance, profession
- Timing of marriage
- Quality of married life
- Potential challenges and their remedies

Be detailed and specific. Reference planetary combinations.`;

interface MarriageInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  charaKarakas: CharaKaraka[];
  gender: string;
}

export async function generateMarriagePrediction(input: MarriageInput): Promise<AgentResponse<MarriagePrediction>> {
  const { planets, ascSignIdx, charaKarakas, gender } = input;
  
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  
  const venus = planets.find(p => p.name === "Venus");
  const mars = planets.find(p => p.name === "Mars");
  
  const fifthHouseSignIdx = (ascSignIdx + 4) % 12;
  const fifthLord = getSignLord(fifthHouseSignIdx);
  const fifthLordPlanet = planets.find(p => p.name === fifthLord);
  const fifthHouseOccupants = planets.filter(p => p.house === 5);
  
  const seventhHouseSignIdx = (ascSignIdx + 6) % 12;
  const seventhLord = getSignLord(seventhHouseSignIdx);
  const seventhLordPlanet = planets.find(p => p.name === seventhLord);
  const seventhHouseOccupants = planets.filter(p => p.house === 7);
  
  const darakaraka = charaKarakas.find(k => k.karaka === "Darakaraka");
  const darakarakaPlanet = darakaraka ? planets.find(p => p.name === darakaraka.planet) : null;
  
  // Mangal Dosha check (basic)
  const mangalDosha = mars && [1, 2, 4, 7, 8, 12].includes(mars.house);

  const userPrompt = `Provide comprehensive marriage analysis for a ${gender === "F" ? "female" : "male"} native:

**5th House (Romance & Love):**
- Sign: ${SIGNS[fifthHouseSignIdx]}
- Lord: ${fifthLord}
- Lord's Position: House ${fifthLordPlanet?.house || "N/A"} in ${fifthLordPlanet?.sign || "N/A"}
- Occupants: ${fifthHouseOccupants.map(p => p.name).join(", ") || "Empty"}

**7th House (Marriage):**
- Sign: ${SIGNS[seventhHouseSignIdx]}
- Lord: ${seventhLord}
- Lord's Position: House ${seventhLordPlanet?.house || "N/A"} in ${seventhLordPlanet?.sign || "N/A"}
- Occupants: ${seventhHouseOccupants.map(p => p.name).join(", ") || "Empty"}

**Venus (Love & Relationships):**
- Sign: ${venus?.sign || "N/A"}
- House: ${venus?.house || "N/A"}
- Degree: ${venus?.deg?.toFixed(2) || "N/A"}°
- Retrograde: ${venus?.isRetro ? "Yes" : "No"}

**Darakaraka (Spouse Significator):**
- Planet: ${darakaraka?.planet || "N/A"}
- Sign: ${darakarakaPlanet?.sign || "N/A"}
- House: ${darakarakaPlanet?.house || "N/A"}

**Mars (Mangal Dosha Check):**
- Sign: ${mars?.sign || "N/A"}
- House: ${mars?.house || "N/A"}
- Mangal Dosha: ${mangalDosha ? "Present" : "Not Present"}

Provide detailed marriage predictions with partner profile, timing, and relationship guidance.`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph marriage overview" },
      fifthHouse: {
        type: "object",
        properties: {
          sign: { type: "string" },
          lord: { type: "string" },
          lordPlacement: { type: "string" },
          occupants: { type: "array", items: { type: "string" } },
          loveNature: { type: "string" },
          romanceStyle: { type: "string" },
          interpretation: { type: "string" }
        },
        required: ["sign", "lord", "lordPlacement", "occupants", "loveNature", "romanceStyle", "interpretation"]
      },
      seventhHouse: {
        type: "object",
        properties: {
          sign: { type: "string" },
          lord: { type: "string" },
          lordPlacement: { type: "string" },
          occupants: { type: "array", items: { type: "string" } },
          marriageProspects: { type: "string" },
          interpretation: { type: "string" }
        },
        required: ["sign", "lord", "lordPlacement", "occupants", "marriageProspects", "interpretation"]
      },
      venusAnalysis: {
        type: "object",
        properties: {
          sign: { type: "string" },
          house: { type: "number" },
          dignity: { type: "string" },
          interpretation: { type: "string" },
          attractionStyle: { type: "string" },
          relationshipNeeds: { type: "string" }
        },
        required: ["sign", "house", "dignity", "interpretation", "attractionStyle", "relationshipNeeds"]
      },
      darakaraka: {
        type: "object",
        properties: {
          planet: { type: "string" },
          sign: { type: "string" },
          house: { type: "number" },
          interpretation: { type: "string" },
          partnerQualities: { type: "array", items: { type: "string" } },
          partnerProfession: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "sign", "house", "interpretation", "partnerQualities", "partnerProfession"]
      },
      partnerProfile: {
        type: "object",
        properties: {
          physicalTraits: { type: "string" },
          personality: { type: "string" },
          background: { type: "string" },
          direction: { type: "string" },
          meetingCircumstances: { type: "string" }
        },
        required: ["physicalTraits", "personality", "background", "direction", "meetingCircumstances"]
      },
      marriageTiming: {
        type: "object",
        properties: {
          favorablePeriods: { type: "array", items: { type: "string" } },
          challengingPeriods: { type: "array", items: { type: "string" } },
          idealAgeRange: { type: "string" },
          currentProspects: { type: "string" }
        },
        required: ["favorablePeriods", "challengingPeriods", "idealAgeRange", "currentProspects"]
      },
      compatibility: {
        type: "object",
        properties: {
          bestMatches: { type: "array", items: { type: "string" } },
          challengingMatches: { type: "array", items: { type: "string" } },
          advice: { type: "string" }
        },
        required: ["bestMatches", "challengingMatches", "advice"]
      },
      mangalDosha: {
        type: "object",
        properties: {
          present: { type: "boolean" },
          severity: { type: "string" },
          remedies: { type: "array", items: { type: "string" } }
        },
        required: ["present", "severity", "remedies"]
      },
      challenges: { type: "array", items: { type: "string" } },
      strengths: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } }
    },
    required: ["overview", "fifthHouse", "seventhHouse", "venusAnalysis", "darakaraka", "partnerProfile", "marriageTiming", "compatibility", "mangalDosha", "challenges", "strengths", "recommendations"],
    additionalProperties: false
  };

  return callAgent<MarriagePrediction>(
    MARRIAGE_SYSTEM_PROMPT,
    userPrompt,
    "generate_marriage_prediction",
    "Generate comprehensive marriage and relationship analysis",
    toolSchema
  );
}
