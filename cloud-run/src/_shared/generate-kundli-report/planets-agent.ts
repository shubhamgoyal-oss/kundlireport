// Planets Agent - Generates detailed planetary profiles for all 9 planets

import { callAgent, type AgentResponse } from "./agent-base";
import { calculateDignity, getDignityDescription, getSignLord, type Dignity } from "./utils/dignity";
import { calculateAspects, getAspectsFromPlanet, type Aspect } from "./utils/aspects";
import type { SeerPlanet } from "./seer-adapter";
import { planetName, signName } from "./lang-utils";

export interface PlanetProfile {
  planet: string;
  planetHindi: string;
  sign: string;
  signHindi: string;
  house: number;
  degree: number;
  isRetrograde: boolean;
  dignity: Dignity;
  dignityDescription: string;
  nakshatra: string;
  nakshatraLord: string;
  signLord: string;
  signLordHouse: number;
  placementAnalysis: string;
  houseSignificance: string;
  aspects: Array<{
    aspectType: string;
    targetHouse: number;
    interpretation: string;
  }>;
  retrogradeEffect: string;
  dashaInfluence: string;
  remedies: string[];
}

// Language-aware lookups now come from lang-utils.ts → language packs
// (deleted PLANET_HINDI/TE, SIGN_HINDI/TE + planetLocal/signLocal)

const PLANET_SIGNIFICATIONS: Record<string, string> = {
  Sun: "Soul, father, authority, government, health, ego, leadership, vitality",
  Moon: "Mind, mother, emotions, nurturing, public, liquids, travel, intuition",
  Mars: "Energy, courage, siblings, property, accidents, surgery, competition",
  Mercury: "Intelligence, communication, business, education, speech, writing",
  Jupiter: "Wisdom, children, wealth, spirituality, teachers, fortune, expansion",
  Venus: "Love, marriage, arts, luxury, vehicles, beauty, pleasures, relationships",
  Saturn: "Karma, delays, discipline, service, longevity, suffering, hard work",
  Rahu: "Obsession, foreign, unconventional, technology, illusion, ambition",
  Ketu: "Spirituality, liberation, past life, detachment, intuition, isolation",
};

const HOUSE_SIGNIFICATIONS: Record<number, string> = {
  1: "Self, body, personality, health, new beginnings",
  2: "Wealth, family, speech, food, early education",
  3: "Siblings, courage, communication, short travel, skills",
  4: "Mother, home, property, vehicles, education, peace of mind",
  5: "Children, creativity, romance, speculation, past karma",
  6: "Enemies, diseases, debts, service, daily work, pets",
  7: "Spouse, partnership, business, public dealings, contracts",
  8: "Longevity, transformation, inheritance, occult, sudden events",
  9: "Fortune, father, religion, higher education, long travel, dharma",
  10: "Career, reputation, authority, public life, achievements",
  11: "Gains, friends, elder siblings, wishes, income, social networks",
  12: "Losses, expenses, foreign, spirituality, liberation, isolation",
};

const PLANETS_SYSTEM_PROMPT = `You are an expert Vedic astrologer providing detailed planetary analysis.

For each planet, consider:
1. Its natural significations (karakatva)
2. The house it occupies and what that house represents
3. The sign placement and resulting dignity (strength/weakness)
4. Any retrograde motion and its psychological/karmic meaning
5. Aspects it casts on other houses
6. The condition of its dispositor (sign lord)

Provide interpretations that are:
- Specific to the placement combination
- Psychologically insightful
- Practical and actionable
- Balanced (both positive potential and challenges)

Reference classical texts naturally. Use a warm, empowering tone.`;

interface PlanetInput {
  planet: SeerPlanet;
  allPlanets: SeerPlanet[];
  asc: SeerPlanet;
}

export async function generatePlanetProfile(input: PlanetInput): Promise<AgentResponse<PlanetProfile>> {
  const { planet, allPlanets, asc } = input;
  
  const dignity = calculateDignity(planet.name, planet.signIdx, planet.deg);
  const dignityDesc = getDignityDescription(dignity);
  const signLord = getSignLord(planet.signIdx);
  const signLordPlanet = allPlanets.find(p => p.name === signLord);
  const aspects = calculateAspects(allPlanets, asc);
  const planetAspects = getAspectsFromPlanet(aspects, planet.name);

  const userPrompt = `Analyze ${planet.name} in detail:

**Basic Position:**
- Planet: ${planet.name} (${planetName(planet.name)})
- Sign: ${planet.sign} (${signName(planet.sign)})
- House: ${planet.house}
- Degree: ${planet.deg.toFixed(2)}°
- Retrograde: ${planet.isRetro ? "Yes" : "No"}

**Dignity & Strength:**
- Dignity: ${dignity} - ${dignityDesc}
- Sign Lord: ${signLord}
- Sign Lord placed in: House ${signLordPlanet?.house || "N/A"}, ${signLordPlanet?.sign || "N/A"}

**Natural Significations of ${planet.name}:**
${PLANET_SIGNIFICATIONS[planet.name]}

**House ${planet.house} Significations:**
${HOUSE_SIGNIFICATIONS[planet.house]}

**Aspects Cast by ${planet.name}:**
${planetAspects.map(a => `- ${a.aspectType} aspect on House ${a.targetHouse}`).join("\n") || "Standard 7th aspect only"}

Provide a comprehensive analysis covering placement meaning, house effects, aspects, and if retrograde, its special significance.`;

  const toolSchema = {
    type: "object",
    properties: {
      planet: { type: "string" },
      planetHindi: { type: "string" },
      sign: { type: "string" },
      signHindi: { type: "string" },
      house: { type: "number" },
      degree: { type: "number" },
      isRetrograde: { type: "boolean" },
      dignity: { type: "string" },
      dignityDescription: { type: "string" },
      nakshatra: { type: "string" },
      nakshatraLord: { type: "string" },
      signLord: { type: "string" },
      signLordHouse: { type: "number" },
      placementAnalysis: { type: "string", description: "3-4 paragraph analysis of this planet's placement" },
      houseSignificance: { type: "string", description: "How this planet affects the house it occupies" },
      aspects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            aspectType: { type: "string" },
            targetHouse: { type: "number" },
            interpretation: { type: "string" }
          },
          required: ["aspectType", "targetHouse", "interpretation"]
        }
      },
      retrogradeEffect: { type: "string", description: "Effect of retrograde if applicable, or 'Not applicable'" },
      dashaInfluence: { type: "string", description: "How this planet will behave during its dasha period" },
      remedies: { type: "array", items: { type: "string" }, description: "2-3 specific remedies for this planet" }
    },
    required: ["planet", "planetHindi", "sign", "signHindi", "house", "degree", "isRetrograde", "dignity", "dignityDescription", "signLord", "signLordHouse", "placementAnalysis", "houseSignificance", "aspects", "retrogradeEffect", "dashaInfluence", "remedies"],
    additionalProperties: false
  };

  return callAgent<PlanetProfile>(
    PLANETS_SYSTEM_PROMPT,
    userPrompt,
    "generate_planet_profile",
    "Generate detailed planetary profile analysis",
    toolSchema,
    "planets"
  );
}

// Generate all planet profiles in parallel batches
export async function generateAllPlanetProfiles(
  planets: SeerPlanet[],
  asc: SeerPlanet
): Promise<PlanetProfile[]> {
  const results: PlanetProfile[] = [];
  
  // Process in batches of 3 to avoid rate limits
  for (let i = 0; i < planets.length; i += 3) {
    const batch = planets.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(planet => generatePlanetProfile({ planet, allPlanets: planets, asc }))
    );
    
    for (const result of batchResults) {
      if (result.success && result.data) {
        results.push(result.data);
      }
    }
  }
  
  return results;
}
