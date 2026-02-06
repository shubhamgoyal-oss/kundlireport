// Chara Karakas Agent - Generates detailed Jaimini Chara Karaka interpretations

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import { calculateCharaKarakas, type CharaKaraka } from "./utils/chara-karakas.ts";

export interface KarakaInterpretation {
  karaka: string;
  planet: string;
  degree: number;
  sign: string;
  house: number;
  signification: string;
  detailedInterpretation: string;
  lifeImpact: string;
  strengths: string[];
  challenges: string[];
  remedies: string[];
  timing: string;
}

export interface CharaKarakasPrediction {
  overview: string;
  jaiminiSystemExplanation: string;
  karakaInterpretations: KarakaInterpretation[];
  atmakarakaSpecial: {
    planet: string;
    soulPurpose: string;
    spiritualLesson: string;
    karakamsaSign: string;
    karakamsaInterpretation: string;
  };
  darakarakaSpecial: {
    planet: string;
    spouseCharacteristics: string;
    marriageIndications: string;
    partnerQualities: string[];
  };
  amatyakarakaSpecial: {
    planet: string;
    careerDirection: string;
    professionalStrengths: string[];
    suitableProfessions: string[];
  };
  karakaInteractions: Array<{
    karakas: string[];
    interaction: string;
    effect: string;
  }>;
  scripturalReferences: string;
  recommendations: string[];
}

const CHARA_KARAKAS_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Jaimini astrology and Chara Karaka analysis.

Chara Karakas are temporal significators in Jaimini astrology, determined by planetary degrees within their signs.

The seven Chara Karakas in order of degree (highest to lowest):
1. Atmakaraka (AK) - Soul significator, most important planet
2. Amatyakaraka (AmK) - Career/minister significator
3. Bhratrikaraka (BK) - Siblings significator
4. Matrikaraka (MK) - Mother/education significator
5. Putrakaraka (PK) - Children/creativity significator
6. Gnatikaraka (GK) - Enemies/obstacles significator
7. Darakaraka (DK) - Spouse significator (lowest degree)

For each Karaka, analyze:
1. Which planet holds the role and its natural significations
2. The sign and house placement of that planet
3. How this affects the karaka's domain in life
4. Strengths and challenges based on dignity and house
5. Timing of karaka-related events
6. Specific remedies for each karaka

Pay special attention to:
- Atmakaraka as the soul's purpose indicator
- Karakamsa (navamsa sign of Atmakaraka)
- Darakaraka for marriage predictions
- Amatyakaraka for career guidance

Reference Jaimini Sutras and classical texts where appropriate.`;

interface CharaKarakasInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
}

export async function generateCharaKarakasPrediction(input: CharaKarakasInput): Promise<AgentResponse<CharaKarakasPrediction>> {
  const { planets, ascSignIdx } = input;
  
  // Calculate Chara Karakas
  const karakas = calculateCharaKarakas(planets);
  
  // Build detailed karaka info
  const karakaDetails = karakas.map(k => {
    const planet = planets.find(p => p.name === k.planet);
    return {
      ...k,
      sign: planet?.sign || 'Unknown',
      house: planet?.house || 1,
      isRetro: planet?.isRetro || false,
    };
  });

  const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
                      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  const userPrompt = `Provide comprehensive Chara Karaka analysis based on Jaimini astrology:

**Ascendant:** ${SIGN_NAMES[ascSignIdx]}

**Chara Karakas (by degree within sign):**
${karakaDetails.map(k => `- ${k.karaka}: ${k.planet} at ${k.degree.toFixed(2)}° in ${k.sign} (House ${k.house})${k.isRetro ? ' [R]' : ''}`).join('\n')}

**All Planetary Positions:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house}) at ${p.deg.toFixed(2)}°${p.isRetro ? ' [R]' : ''}`).join('\n')}

Provide:
1. Overview of Jaimini Chara Karaka system
2. Detailed interpretation for EACH of the 7 karakas
3. Special analysis for Atmakaraka (soul purpose, karakamsa)
4. Special analysis for Darakaraka (spouse characteristics)
5. Special analysis for Amatyakaraka (career direction)
6. Key karaka interactions and their effects
7. Scriptural references from Jaimini Sutras
8. Specific recommendations based on karaka placements`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph overview of Chara Karaka analysis" },
      jaiminiSystemExplanation: { type: "string", description: "Explanation of Jaimini Chara Karaka system" },
      karakaInterpretations: {
        type: "array",
        description: "Detailed interpretation for each of the 7 karakas",
        items: {
          type: "object",
          properties: {
            karaka: { type: "string" },
            planet: { type: "string" },
            degree: { type: "number" },
            sign: { type: "string" },
            house: { type: "number" },
            signification: { type: "string" },
            detailedInterpretation: { type: "string", description: "2-3 paragraph detailed analysis" },
            lifeImpact: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            challenges: { type: "array", items: { type: "string" } },
            remedies: { type: "array", items: { type: "string" } },
            timing: { type: "string" }
          },
          required: ["karaka", "planet", "degree", "sign", "house", "signification", "detailedInterpretation", "lifeImpact", "strengths", "challenges", "remedies", "timing"]
        }
      },
      atmakarakaSpecial: {
        type: "object",
        description: "Special analysis for Atmakaraka",
        properties: {
          planet: { type: "string" },
          soulPurpose: { type: "string" },
          spiritualLesson: { type: "string" },
          karakamsaSign: { type: "string" },
          karakamsaInterpretation: { type: "string" }
        },
        required: ["planet", "soulPurpose", "spiritualLesson", "karakamsaSign", "karakamsaInterpretation"]
      },
      darakarakaSpecial: {
        type: "object",
        description: "Special analysis for Darakaraka",
        properties: {
          planet: { type: "string" },
          spouseCharacteristics: { type: "string" },
          marriageIndications: { type: "string" },
          partnerQualities: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "spouseCharacteristics", "marriageIndications", "partnerQualities"]
      },
      amatyakarakaSpecial: {
        type: "object",
        description: "Special analysis for Amatyakaraka",
        properties: {
          planet: { type: "string" },
          careerDirection: { type: "string" },
          professionalStrengths: { type: "array", items: { type: "string" } },
          suitableProfessions: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "careerDirection", "professionalStrengths", "suitableProfessions"]
      },
      karakaInteractions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            karakas: { type: "array", items: { type: "string" } },
            interaction: { type: "string" },
            effect: { type: "string" }
          },
          required: ["karakas", "interaction", "effect"]
        }
      },
      scripturalReferences: { type: "string", description: "References from Jaimini Sutras and classical texts" },
      recommendations: { type: "array", items: { type: "string" } }
    },
    required: ["overview", "jaiminiSystemExplanation", "karakaInterpretations", "atmakarakaSpecial", "darakarakaSpecial", "amatyakarakaSpecial", "karakaInteractions", "scripturalReferences", "recommendations"],
    additionalProperties: false
  };

  return callAgent<CharaKarakasPrediction>(
    CHARA_KARAKAS_SYSTEM_PROMPT,
    userPrompt,
    "generate_chara_karakas_prediction",
    "Generate comprehensive Jaimini Chara Karaka analysis",
    toolSchema
  );
}
