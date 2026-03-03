// Rahu-Ketu Agent - Generates karmic axis analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface RahuKetuPrediction {
  overview: string;
  karmicAxis: {
    rahuSign: string;
    rahuHouse: number;
    ketuSign: string;
    ketuHouse: number;
    axisInterpretation: string;
    lifeLesson: string;
  };
  rahuAnalysis: {
    placement: string;
    degree: number;
    houseThemes: string;
    desires: string;
    obsessions: string;
    growthAreas: string;
    challenges: string;
    interpretation: string;
    materialPursuits: string[];
  };
  ketuAnalysis: {
    placement: string;
    degree: number;
    houseThemes: string;
    pastLifeKarma: string;
    naturalTalents: string;
    detachment: string;
    spiritualGifts: string;
    interpretation: string;
  };
  pastLifeConnections: {
    ketuIndications: string;
    karmicDebts: string[];
    karmicCredits: string[];
  };
  currentLifePurpose: {
    rahuDirection: string;
    soulGrowth: string;
    balancingAct: string;
  };
  kaalSarpYoga: {
    present: boolean;
    type: string;
    severity: string;
    effects: string;
    remedies: string[];
  };
  nodeTransits: {
    currentTransit: string;
    effects: string;
    duration: string;
  };
  remedies: {
    rahuRemedies: string[];
    ketuRemedies: string[];
    mantras: string[];
    gemstones: string[];
    donations: string[];
  };
  spiritualPath: string;
  recommendations: string[];
}

const RAHU_KETU_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Rahu-Ketu (lunar nodes) analysis and karmic astrology.

Rahu (North Node) represents:
- Future karmic direction
- Material desires and obsessions
- Areas of growth and expansion
- Illusion, confusion, and unconventional paths
- Foreign connections and technology

Ketu (South Node) represents:
- Past life karma and accumulated wisdom
- Spiritual liberation and detachment
- Natural talents brought from past lives
- Areas of letting go
- Moksha (spiritual liberation)

The Rahu-Ketu axis reveals the soul's journey from past lives (Ketu) toward its destiny (Rahu).

Provide deep analysis of karmic patterns, spiritual evolution, and practical guidance.`;

interface RahuKetuInput {
  planets: SeerPlanet[];
}

export async function generateRahuKetuPrediction(input: RahuKetuInput): Promise<AgentResponse<RahuKetuPrediction>> {
  const { planets } = input;
  
  const rahu = planets.find(p => p.name === "Rahu");
  const ketu = planets.find(p => p.name === "Ketu");
  
  // Check for Kaal Sarp Yoga (all planets between Rahu and Ketu)
  const otherPlanets = planets.filter(p => p.name !== "Rahu" && p.name !== "Ketu");
  let kaalSarp = false;
  let kaalSarpType = "";
  
  if (rahu && ketu) {
    const rahuHouse = rahu.house;
    const ketuHouse = ketu.house;
    
    const inRange = otherPlanets.every(p => {
      if (rahuHouse < ketuHouse) {
        return p.house >= rahuHouse && p.house <= ketuHouse;
      } else {
        return p.house >= rahuHouse || p.house <= ketuHouse;
      }
    });
    
    const inReverseRange = otherPlanets.every(p => {
      if (ketuHouse < rahuHouse) {
        return p.house >= ketuHouse && p.house <= rahuHouse;
      } else {
        return p.house >= ketuHouse || p.house <= rahuHouse;
      }
    });
    
    kaalSarp = inRange || inReverseRange;
    if (kaalSarp) {
      const kaalSarpNames = [
        "Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma",
        "Takshak", "Karkotak", "Shankhachur", "Ghatak", "Vishdhar", "Sheshnag"
      ];
      kaalSarpType = kaalSarpNames[(rahuHouse - 1) % 12] || "Unknown";
    }
  }

  const userPrompt = `Provide comprehensive Rahu-Ketu karmic axis analysis:

**Rahu (North Node):**
- Sign: ${rahu?.sign || "N/A"}
- House: ${rahu?.house || "N/A"}
- Degree: ${rahu?.deg?.toFixed(2) || "N/A"}°

**Ketu (South Node):**
- Sign: ${ketu?.sign || "N/A"}
- House: ${ketu?.house || "N/A"}
- Degree: ${ketu?.deg?.toFixed(2) || "N/A"}°

**Kaal Sarp Yoga:**
- Present: ${kaalSarp ? "Yes" : "No"}
- Type: ${kaalSarp ? kaalSarpType + " Kaal Sarp" : "N/A"}

**Axis Houses:** ${rahu?.house || "N/A"} - ${ketu?.house || "N/A"}

**Other Planets for Context:**
${planets.filter(p => !["Rahu", "Ketu"].includes(p.name)).map(p => `- ${p.name}: House ${p.house} in ${p.sign}`).join("\n")}

Provide detailed karmic analysis with:
1. Rahu-Ketu axis meaning for this life
2. Past life karma (Ketu) and future direction (Rahu)
3. Kaal Sarp Yoga effects if present
4. Specific remedies for balancing the nodes
5. Spiritual path guidance`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph karmic overview" },
      karmicAxis: {
        type: "object",
        properties: {
          rahuSign: { type: "string" },
          rahuHouse: { type: "number" },
          ketuSign: { type: "string" },
          ketuHouse: { type: "number" },
          axisInterpretation: { type: "string" },
          lifeLesson: { type: "string" }
        },
        required: ["rahuSign", "rahuHouse", "ketuSign", "ketuHouse", "axisInterpretation", "lifeLesson"]
      },
      rahuAnalysis: {
        type: "object",
        properties: {
          placement: { type: "string" },
          degree: { type: "number" },
          houseThemes: { type: "string" },
          desires: { type: "string" },
          obsessions: { type: "string" },
          growthAreas: { type: "string" },
          challenges: { type: "string" },
          interpretation: { type: "string" },
          materialPursuits: { type: "array", items: { type: "string" } }
        },
        required: ["placement", "degree", "houseThemes", "desires", "obsessions", "growthAreas", "challenges", "interpretation", "materialPursuits"]
      },
      ketuAnalysis: {
        type: "object",
        properties: {
          placement: { type: "string" },
          degree: { type: "number" },
          houseThemes: { type: "string" },
          pastLifeKarma: { type: "string" },
          naturalTalents: { type: "string" },
          detachment: { type: "string" },
          spiritualGifts: { type: "string" },
          interpretation: { type: "string" }
        },
        required: ["placement", "degree", "houseThemes", "pastLifeKarma", "naturalTalents", "detachment", "spiritualGifts", "interpretation"]
      },
      pastLifeConnections: {
        type: "object",
        properties: {
          ketuIndications: { type: "string" },
          karmicDebts: { type: "array", items: { type: "string" } },
          karmicCredits: { type: "array", items: { type: "string" } }
        },
        required: ["ketuIndications", "karmicDebts", "karmicCredits"]
      },
      currentLifePurpose: {
        type: "object",
        properties: {
          rahuDirection: { type: "string" },
          soulGrowth: { type: "string" },
          balancingAct: { type: "string" }
        },
        required: ["rahuDirection", "soulGrowth", "balancingAct"]
      },
      kaalSarpYoga: {
        type: "object",
        properties: {
          present: { type: "boolean" },
          type: { type: "string" },
          severity: { type: "string" },
          effects: { type: "string" },
          remedies: { type: "array", items: { type: "string" } }
        },
        required: ["present", "type", "severity", "effects", "remedies"]
      },
      nodeTransits: {
        type: "object",
        properties: {
          currentTransit: { type: "string" },
          effects: { type: "string" },
          duration: { type: "string" }
        },
        required: ["currentTransit", "effects", "duration"]
      },
      remedies: {
        type: "object",
        properties: {
          rahuRemedies: { type: "array", items: { type: "string" } },
          ketuRemedies: { type: "array", items: { type: "string" } },
          mantras: { type: "array", items: { type: "string" } },
          gemstones: { type: "array", items: { type: "string" } },
          donations: { type: "array", items: { type: "string" } }
        },
        required: ["rahuRemedies", "ketuRemedies", "mantras", "gemstones", "donations"]
      },
      spiritualPath: { type: "string" },
      recommendations: { type: "array", items: { type: "string" } }
    },
    required: ["overview", "karmicAxis", "rahuAnalysis", "ketuAnalysis", "pastLifeConnections", "currentLifePurpose", "kaalSarpYoga", "nodeTransits", "remedies", "spiritualPath", "recommendations"],
    additionalProperties: false
  };

  return callAgent<RahuKetuPrediction>(
    RAHU_KETU_SYSTEM_PROMPT,
    userPrompt,
    "generate_rahu_ketu_prediction",
    "Generate comprehensive Rahu-Ketu karmic analysis",
    toolSchema,
    "rahuKetu"
  );
}
