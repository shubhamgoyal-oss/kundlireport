// Career Agent - Generates detailed career analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { getSignLord } from "./utils/dignity.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import type { CharaKaraka } from "./utils/chara-karakas.ts";

export interface CareerPrediction {
  overview: string;
  careerDirection: {
    rightCareerForYou: string;
    coreStrengths: string[];
    idealRoles: string[];
    idealWorkEnvironment: string;
  };
  sunAnalysis: {
    placement: string;
    interpretation: string;
    careerInfluence: string;
  };
  saturnAnalysis: {
    placement: string;
    interpretation: string;
    workEthic: string;
  };
  tenthHouse: {
    sign: string;
    lord: string;
    lordPlacement: string;
    occupants: string[];
    interpretation: string;
    careerThemes: string[];
  };
  amatyakaraka: {
    planet: string;
    sign: string;
    house: number;
    interpretation: string;
    professionalStrengths: string[];
  };
  suitableFields: string[];
  avoidFields: string[];
  careerSwitchInsights: {
    isSwitchDueNow: string;
    nextSwitchWindow: string;
    oneOrTwoFutureChanges: string[];
    rationale: string;
    preparationPlan: string[];
  };
  careerTiming: {
    currentPhase: string;
    upcomingOpportunities: string[];
    challenges: string[];
  };
  successFormula: string;
  wealthPotential: string;
  businessVsJob: string;
  recommendations: string[];
}

const CAREER_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in career and professional guidance.

Analyze the chart to provide comprehensive career predictions covering:
1. The 10th house (Karma Bhava) - the primary career indicator
2. Sun's placement - authority, leadership, government connections
3. Saturn's placement - work ethic, discipline, challenges
4. Amatyakaraka - the career significator planet
5. 2nd and 11th houses - wealth and gains from profession

Provide specific, actionable career guidance. Be detailed about suitable fields.
Reference planetary combinations that support or challenge career growth.
Include timing predictions based on current dasha and transits.`;

interface CareerInput {
  planets: SeerPlanet[];
  ascSignIdx: number;
  charaKarakas: CharaKaraka[];
  birthDate?: Date;
  generatedAt?: Date;
}

export async function generateCareerPrediction(input: CareerInput): Promise<AgentResponse<CareerPrediction>> {
  const { planets, ascSignIdx, charaKarakas, birthDate, generatedAt } = input;
  
  const sun = planets.find(p => p.name === "Sun");
  const saturn = planets.find(p => p.name === "Saturn");
  const tenthHouseSignIdx = (ascSignIdx + 9) % 12;
  const tenthLord = getSignLord(tenthHouseSignIdx);
  const tenthLordPlanet = planets.find(p => p.name === tenthLord);
  const tenthHouseOccupants = planets.filter(p => p.house === 10);
  
  const amatyakaraka = charaKarakas.find(k => k.karaka === "Amatyakaraka");
  const amatyakarakaPlanet = amatyakaraka ? planets.find(p => p.name === amatyakaraka.planet) : null;
  
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const now = generatedAt || new Date();
  const ageYears = birthDate
    ? Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : null;

  const userPrompt = `Provide comprehensive career analysis:

**10th House (Career House):**
- Sign: ${SIGNS[tenthHouseSignIdx]}
- Lord: ${tenthLord}
- Lord's Position: House ${tenthLordPlanet?.house || "N/A"} in ${tenthLordPlanet?.sign || "N/A"}
- Occupants: ${tenthHouseOccupants.map(p => p.name).join(", ") || "Empty"}

**Sun (Authority & Status):**
- Sign: ${sun?.sign || "N/A"}
- House: ${sun?.house || "N/A"}
- Degree: ${sun?.deg?.toFixed(2) || "N/A"}°
- Retrograde: ${sun?.isRetro ? "Yes" : "No"}

**Saturn (Work & Discipline):**
- Sign: ${saturn?.sign || "N/A"}
- House: ${saturn?.house || "N/A"}
- Degree: ${saturn?.deg?.toFixed(2) || "N/A"}°
- Retrograde: ${saturn?.isRetro ? "Yes" : "No"}

**Amatyakaraka (Career Significator):**
- Planet: ${amatyakaraka?.planet || "N/A"}
- Sign: ${amatyakarakaPlanet?.sign || "N/A"}
- House: ${amatyakarakaPlanet?.house || "N/A"}

**2nd House (Wealth from Profession):**
- Lord Position: House ${planets.find(p => p.name === getSignLord((ascSignIdx + 1) % 12))?.house || "N/A"}

**11th House (Gains & Income):**
- Lord Position: House ${planets.find(p => p.name === getSignLord((ascSignIdx + 10) % 12))?.house || "N/A"}

**Native Age Context:**
- Approximate Age: ${ageYears ?? "Unknown"} years

You MUST explicitly answer:
1) What is the RIGHT career direction for this native (not generic list only)?
2) Is a switch due now? If yes/no, explain clearly.
3) Next switch window (month-year or year-range) with reason.
4) One or two future career change windows with likely nature of change.

Use practical, realistic timing windows (not absolute guarantees).`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "5-6 paragraph comprehensive career narrative that vividly paints the native's professional destiny — covering natural work style, leadership qualities, ideal environment, relationship with authority, financial ambitions, potential peaks and setbacks, and the unique contribution this person is meant to make in the world" },
      careerDirection: {
        type: "object",
        properties: {
          rightCareerForYou: { type: "string", description: "A direct, specific statement of the most suitable career direction." },
          coreStrengths: { type: "array", items: { type: "string" } },
          idealRoles: { type: "array", items: { type: "string" } },
          idealWorkEnvironment: { type: "string" }
        },
        required: ["rightCareerForYou", "coreStrengths", "idealRoles", "idealWorkEnvironment"]
      },
      sunAnalysis: {
        type: "object",
        properties: {
          placement: { type: "string" },
          interpretation: { type: "string" },
          careerInfluence: { type: "string" }
        },
        required: ["placement", "interpretation", "careerInfluence"]
      },
      saturnAnalysis: {
        type: "object",
        properties: {
          placement: { type: "string" },
          interpretation: { type: "string" },
          workEthic: { type: "string" }
        },
        required: ["placement", "interpretation", "workEthic"]
      },
      tenthHouse: {
        type: "object",
        properties: {
          sign: { type: "string" },
          lord: { type: "string" },
          lordPlacement: { type: "string" },
          occupants: { type: "array", items: { type: "string" } },
          interpretation: { type: "string" },
          careerThemes: { type: "array", items: { type: "string" } }
        },
        required: ["sign", "lord", "lordPlacement", "occupants", "interpretation", "careerThemes"]
      },
      amatyakaraka: {
        type: "object",
        properties: {
          planet: { type: "string" },
          sign: { type: "string" },
          house: { type: "number" },
          interpretation: { type: "string" },
          professionalStrengths: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "sign", "house", "interpretation", "professionalStrengths"]
      },
      suitableFields: { type: "array", items: { type: "string" }, description: "8-10 suitable career fields" },
      avoidFields: { type: "array", items: { type: "string" }, description: "3-4 fields to avoid" },
      careerSwitchInsights: {
        type: "object",
        properties: {
          isSwitchDueNow: { type: "string", description: "Direct yes/no style guidance with reason." },
          nextSwitchWindow: { type: "string", description: "Month-year or year range for the next likely career switch." },
          oneOrTwoFutureChanges: { type: "array", items: { type: "string" }, description: "One or two future career change windows and likely transition." },
          rationale: { type: "string" },
          preparationPlan: { type: "array", items: { type: "string" } }
        },
        required: ["isSwitchDueNow", "nextSwitchWindow", "oneOrTwoFutureChanges", "rationale", "preparationPlan"]
      },
      careerTiming: {
        type: "object",
        properties: {
          currentPhase: { type: "string" },
          upcomingOpportunities: { type: "array", items: { type: "string" } },
          challenges: { type: "array", items: { type: "string" } }
        },
        required: ["currentPhase", "upcomingOpportunities", "challenges"]
      },
      successFormula: { type: "string", description: "Personal success formula based on chart" },
      wealthPotential: { type: "string", description: "3-4 paragraph wealth potential analysis covering accumulation patterns, investment instincts, money relationship, peak earning periods, and specific wealth-building strategies suited to this chart" },
      businessVsJob: { type: "string", description: "2-3 paragraph nuanced analysis of the business vs. employment question — examining risk tolerance shown by the chart, entrepreneurial indicators, and the ideal professional structure for this native" },
      recommendations: { type: "array", items: { type: "string" }, description: "5-6 actionable career recommendations" }
    },
    required: ["overview", "careerDirection", "sunAnalysis", "saturnAnalysis", "tenthHouse", "amatyakaraka", "suitableFields", "avoidFields", "careerSwitchInsights", "careerTiming", "successFormula", "wealthPotential", "businessVsJob", "recommendations"],
    additionalProperties: false
  };

  return callAgent<CareerPrediction>(
    CAREER_SYSTEM_PROMPT,
    userPrompt,
    "generate_career_prediction",
    "Generate comprehensive career analysis",
    toolSchema
  );
}
