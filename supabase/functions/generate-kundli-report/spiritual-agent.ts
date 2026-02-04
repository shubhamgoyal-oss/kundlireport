// Spiritual Agent - Generates spiritual potential and guidance

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import type { CharaKaraka } from "./utils/chara-karakas.ts";

export interface SpiritualPrediction {
  overview: string;
  spiritualPotential: {
    rating: string;
    factors: string[];
    interpretation: string;
  };
  twelfthHouse: {
    sign: string;
    lord: string;
    lordPlacement: string;
    occupants: string[];
    interpretation: string;
    mokshaIndications: string;
  };
  ninthHouse: {
    sign: string;
    lord: string;
    lordPlacement: string;
    occupants: string[];
    interpretation: string;
    dharmaPath: string;
  };
  jupiterAnalysis: {
    sign: string;
    house: number;
    interpretation: string;
    spiritualGifts: string[];
    guruConnection: string;
  };
  ketuAnalysis: {
    sign: string;
    house: number;
    interpretation: string;
    pastLifeSpirituality: string;
    liberationPath: string;
  };
  atmakaraka: {
    planet: string;
    sign: string;
    house: number;
    soulPurpose: string;
    spiritualLesson: string;
  };
  yogas: Array<{
    name: string;
    present: boolean;
    interpretation: string;
  }>;
  ishtaDevata: {
    deity: string;
    reason: string;
    worship: string;
  };
  meditationStyle: {
    recommended: string;
    techniques: string[];
    timing: string;
  };
  spiritualChallenges: string[];
  spiritualStrengths: string[];
  pastLifeIndications: string;
  mokshaPath: string;
  recommendations: string[];
}

const SPIRITUAL_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in spiritual astrology and moksha (liberation).

Analyze the chart for spiritual potential focusing on:
1. 12th house - Moksha, liberation, spiritual retreat
2. 9th house - Dharma, higher learning, guru
3. Jupiter - Natural karaka for spirituality and wisdom
4. Ketu - Spiritual detachment and past life karma
5. Atmakaraka - Soul's purpose and spiritual lessons

Look for spiritual yogas:
- Moksha yoga (benefics in 4th, 8th, 12th)
- Sannyasa yoga (4+ planets in one house)
- Guru yoga (Jupiter connections to kendra/trikona)
- Ketu conjunctions with benefics

Provide guidance on:
- Meditation and spiritual practices
- Ishta Devata (personal deity)
- Path to spiritual growth
- Overcoming spiritual obstacles

Be insightful and inspiring. Reference classical texts on spiritual astrology.`;

interface SpiritualInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  charaKarakas: CharaKaraka[];
}

export async function generateSpiritualPrediction(input: SpiritualInput): Promise<AgentResponse<SpiritualPrediction>> {
  const { planets, ascSignIdx, charaKarakas } = input;
  
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const SIGN_LORDS: Record<number, string> = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter"
  };
  
  const jupiter = planets.find(p => p.name === "Jupiter");
  const ketu = planets.find(p => p.name === "Ketu");
  
  const ninthHouseSignIdx = (ascSignIdx + 8) % 12;
  const ninthLord = SIGN_LORDS[ninthHouseSignIdx];
  const ninthLordPlanet = planets.find(p => p.name === ninthLord);
  const ninthHouseOccupants = planets.filter(p => p.house === 9);
  
  const twelfthHouseSignIdx = (ascSignIdx + 11) % 12;
  const twelfthLord = SIGN_LORDS[twelfthHouseSignIdx];
  const twelfthLordPlanet = planets.find(p => p.name === twelfthLord);
  const twelfthHouseOccupants = planets.filter(p => p.house === 12);
  
  const atmakaraka = charaKarakas.find(k => k.karaka === "Atmakaraka");
  const atmakarakaPlanet = atmakaraka ? planets.find(p => p.name === atmakaraka.planet) : null;

  const userPrompt = `Provide comprehensive spiritual potential analysis:

**9th House (Dharma):**
- Sign: ${SIGNS[ninthHouseSignIdx]}
- Lord: ${ninthLord}
- Lord's Position: House ${ninthLordPlanet?.house || "N/A"} in ${ninthLordPlanet?.sign || "N/A"}
- Occupants: ${ninthHouseOccupants.map(p => p.name).join(", ") || "Empty"}

**12th House (Moksha):**
- Sign: ${SIGNS[twelfthHouseSignIdx]}
- Lord: ${twelfthLord}
- Lord's Position: House ${twelfthLordPlanet?.house || "N/A"} in ${twelfthLordPlanet?.sign || "N/A"}
- Occupants: ${twelfthHouseOccupants.map(p => p.name).join(", ") || "Empty"}

**Jupiter (Guru):**
- Sign: ${jupiter?.sign || "N/A"}
- House: ${jupiter?.house || "N/A"}
- Degree: ${jupiter?.deg?.toFixed(2) || "N/A"}°

**Ketu (Moksha Karaka):**
- Sign: ${ketu?.sign || "N/A"}
- House: ${ketu?.house || "N/A"}
- Degree: ${ketu?.deg?.toFixed(2) || "N/A"}°

**Atmakaraka (Soul Significator):**
- Planet: ${atmakaraka?.planet || "N/A"}
- Sign: ${atmakarakaPlanet?.sign || "N/A"}
- House: ${atmakarakaPlanet?.house || "N/A"}

Provide detailed spiritual analysis with:
1. Overall spiritual potential assessment
2. Dharma and Moksha path analysis
3. Spiritual yogas present
4. Ishta Devata recommendation
5. Meditation and practice guidance
6. Past life spiritual connections`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph spiritual overview" },
      spiritualPotential: {
        type: "object",
        properties: {
          rating: { type: "string" },
          factors: { type: "array", items: { type: "string" } },
          interpretation: { type: "string" }
        },
        required: ["rating", "factors", "interpretation"]
      },
      twelfthHouse: {
        type: "object",
        properties: {
          sign: { type: "string" },
          lord: { type: "string" },
          lordPlacement: { type: "string" },
          occupants: { type: "array", items: { type: "string" } },
          interpretation: { type: "string" },
          mokshaIndications: { type: "string" }
        },
        required: ["sign", "lord", "lordPlacement", "occupants", "interpretation", "mokshaIndications"]
      },
      ninthHouse: {
        type: "object",
        properties: {
          sign: { type: "string" },
          lord: { type: "string" },
          lordPlacement: { type: "string" },
          occupants: { type: "array", items: { type: "string" } },
          interpretation: { type: "string" },
          dharmaPath: { type: "string" }
        },
        required: ["sign", "lord", "lordPlacement", "occupants", "interpretation", "dharmaPath"]
      },
      jupiterAnalysis: {
        type: "object",
        properties: {
          sign: { type: "string" },
          house: { type: "number" },
          interpretation: { type: "string" },
          spiritualGifts: { type: "array", items: { type: "string" } },
          guruConnection: { type: "string" }
        },
        required: ["sign", "house", "interpretation", "spiritualGifts", "guruConnection"]
      },
      ketuAnalysis: {
        type: "object",
        properties: {
          sign: { type: "string" },
          house: { type: "number" },
          interpretation: { type: "string" },
          pastLifeSpirituality: { type: "string" },
          liberationPath: { type: "string" }
        },
        required: ["sign", "house", "interpretation", "pastLifeSpirituality", "liberationPath"]
      },
      atmakaraka: {
        type: "object",
        properties: {
          planet: { type: "string" },
          sign: { type: "string" },
          house: { type: "number" },
          soulPurpose: { type: "string" },
          spiritualLesson: { type: "string" }
        },
        required: ["planet", "sign", "house", "soulPurpose", "spiritualLesson"]
      },
      yogas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            present: { type: "boolean" },
            interpretation: { type: "string" }
          },
          required: ["name", "present", "interpretation"]
        }
      },
      ishtaDevata: {
        type: "object",
        properties: {
          deity: { type: "string" },
          reason: { type: "string" },
          worship: { type: "string" }
        },
        required: ["deity", "reason", "worship"]
      },
      meditationStyle: {
        type: "object",
        properties: {
          recommended: { type: "string" },
          techniques: { type: "array", items: { type: "string" } },
          timing: { type: "string" }
        },
        required: ["recommended", "techniques", "timing"]
      },
      spiritualChallenges: { type: "array", items: { type: "string" } },
      spiritualStrengths: { type: "array", items: { type: "string" } },
      pastLifeIndications: { type: "string" },
      mokshaPath: { type: "string" },
      recommendations: { type: "array", items: { type: "string" } }
    },
    required: ["overview", "spiritualPotential", "twelfthHouse", "ninthHouse", "jupiterAnalysis", "ketuAnalysis", "atmakaraka", "yogas", "ishtaDevata", "meditationStyle", "spiritualChallenges", "spiritualStrengths", "pastLifeIndications", "mokshaPath", "recommendations"],
    additionalProperties: false
  };

  return callAgent<SpiritualPrediction>(
    SPIRITUAL_SYSTEM_PROMPT,
    userPrompt,
    "generate_spiritual_prediction",
    "Generate comprehensive spiritual potential analysis",
    toolSchema
  );
}
