// Houses Agent - Generates detailed Bhavphal (12 house) analysis

import { callAgent, type AgentResponse } from "./agent-base";
import { getSignLord } from "./utils/dignity";
import { calculateAspects, getAspectsOnHouse, type Aspect } from "./utils/aspects";
import type { SeerPlanet } from "./seer-adapter";
import { planetName, signName, houseName } from "./lang-utils";

export interface HouseAnalysis {
  house: number;
  houseHindi: string;
  sign: string;
  signHindi: string;
  lord: string;
  lordHindi: string;
  lordHouse: number;
  lordSign: string;
  occupants: string[];
  houseNature: string;
  significance: string;
  interpretation: string;
  predictions: string[];
  strengths: string[];
  challenges: string[];
  timing: string;
}

// Language-aware lookups now come from lang-utils.ts → language packs
// (deleted HOUSE/SIGN/PLANET × HI/TE dicts + houseName/signLocal/planetLocal)

const HOUSE_SIGNIFICATIONS: Record<number, { name: string; areas: string; nature: string }> = {
  1: { name: "Lagna/Ascendant", areas: "Self, body, personality, health, vitality, appearance, general well-being, new beginnings", nature: "Kendra (Angular), Trikona" },
  2: { name: "Dhana Bhava", areas: "Wealth, family, speech, food habits, early education, face, right eye, values", nature: "Maraka (Death-inflicting)" },
  3: { name: "Sahaj Bhava", areas: "Siblings, courage, communication, short travels, skills, hands, ears, neighbors", nature: "Upachaya (Growth)" },
  4: { name: "Sukha Bhava", areas: "Mother, home, property, vehicles, education, mental peace, comforts, chest, heart", nature: "Kendra (Angular)" },
  5: { name: "Putra Bhava", areas: "Children, creativity, romance, speculation, past karma, intelligence, stomach", nature: "Trikona (Trine)" },
  6: { name: "Shatru Bhava", areas: "Enemies, diseases, debts, service, daily work, pets, maternal uncle, obstacles", nature: "Dusthana (Malefic), Upachaya" },
  7: { name: "Kalatra Bhava", areas: "Spouse, marriage, partnerships, business deals, public dealings, contracts", nature: "Kendra (Angular), Maraka" },
  8: { name: "Randhra Bhava", areas: "Longevity, transformation, inheritance, occult, sudden events, death, chronic illness", nature: "Dusthana (Malefic)" },
  9: { name: "Dharma Bhava", areas: "Fortune, father, religion, higher education, long travel, dharma, guru, thighs", nature: "Trikona (Trine)" },
  10: { name: "Karma Bhava", areas: "Career, reputation, authority, public life, achievements, government, knees", nature: "Kendra (Angular)" },
  11: { name: "Labha Bhava", areas: "Gains, friends, elder siblings, wishes fulfilled, income, social networks, ankles", nature: "Upachaya (Growth)" },
  12: { name: "Vyaya Bhava", areas: "Losses, expenses, foreign lands, spirituality, liberation, isolation, feet, sleep", nature: "Dusthana (Malefic)" }
};

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const HOUSES_SYSTEM_PROMPT = `You are an expert Vedic astrologer providing comprehensive Bhavphal (house) analysis.

For each house, give proper weightage to ALL of the following factors:
1. **Sign & element**: The sign placed in this house and its elemental/modal nature
2. **House lord placement**: Where the lord sits, its dignity, and the axis it creates
3. **Occupants**: Planets physically sitting in the house — their nature, dignity, conjunctions
4. **Drishti (planetary aspects)**: Which planets cast Drishti on this house (7th aspect from all planets; special aspects — Mars 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th). Benefic Drishti (Jupiter, Venus, well-placed Mercury/Moon) strengthens a house; malefic Drishti (Saturn, Mars, Rahu) creates challenges. Mutual aspects and aspect strength matter.
5. **Practical predictions**: Synthesize all factors into specific life predictions with timing

Do NOT treat occupants alone as the whole picture — Drishti often matters more than occupancy. A house with no planets but Jupiter's 5th aspect and Saturn's 10th aspect has very different results from an empty unaspected house.

Be specific, reference planetary combinations, and provide actionable insights.
Use a warm but authoritative tone. Each prediction should be 2-3 sentences.`;

interface HouseInput {
  houseNumber: number;
  sign: string;
  signIdx: number;
  planets: SeerPlanet[];
  allPlanets: SeerPlanet[];
}

export async function generateHouseAnalysis(input: HouseInput): Promise<AgentResponse<HouseAnalysis>> {
  const { houseNumber, sign, signIdx, planets, allPlanets } = input;

  const lord = getSignLord(signIdx);
  const lordPlanet = allPlanets.find(p => p.name === lord);
  const occupantNames = planets.map(p => p.name);
  const houseInfo = HOUSE_SIGNIFICATIONS[houseNumber];

  // Compute Drishti (aspects) on this house
  const allAspects = calculateAspects(allPlanets, allPlanets[0]); // asc not needed for aspect calc
  const aspectsOnHouse = getAspectsOnHouse(allAspects, houseNumber);
  // Exclude self-aspects (planets already IN this house)
  const occupantSet = new Set(occupantNames);
  const externalAspects = aspectsOnHouse.filter(a => !occupantSet.has(a.fromPlanet));

  const localHouseName = houseName(houseNumber);
  const localSignName = signName(sign);
  const localLordName = planetName(lord);

  const userPrompt = `Analyze House ${houseNumber} (${houseInfo.name}) in detail:

**House Configuration:**
- House Number: ${houseNumber} (${localHouseName})
- Sign in House: ${sign} (${localSignName})
- House Lord: ${lord} (${localLordName})
- Lord's Position: House ${lordPlanet?.house || "N/A"} in ${lordPlanet?.sign || "N/A"}
- Lord Retrograde: ${lordPlanet?.isRetro ? "Yes" : "No"}

**Occupants in House ${houseNumber}:**
${occupantNames.length > 0 ? occupantNames.map(p => `- ${p} (${planetName(p)})`).join("\n") : "- Empty (no planets)"}

**Drishti (Aspects) on House ${houseNumber}:**
${externalAspects.length > 0
  ? externalAspects.map(a => `- ${a.fromPlanet} (from House ${a.fromHouse}) casts ${a.aspectType} aspect`).join("\n")
  : "- No external planetary aspects on this house"}

**House Significations:**
- Name: ${houseInfo.name}
- Nature: ${houseInfo.nature}
- Areas of Life: ${houseInfo.areas}

Provide comprehensive Bhavphal analysis giving due weightage to ALL factors:
1. Sign + lord placement interpretation
2. Effect of occupants (if any)
3. **Impact of Drishti** — how aspecting planets modify this house's results
4. 4-5 specific life predictions synthesizing all factors
5. Strengths, challenges, and timing guidance`;

  const toolSchema = {
    type: "object",
    properties: {
      house: { type: "number" },
      houseHindi: { type: "string" },
      sign: { type: "string" },
      signHindi: { type: "string" },
      lord: { type: "string" },
      lordHindi: { type: "string" },
      lordHouse: { type: "number" },
      lordSign: { type: "string" },
      occupants: { type: "array", items: { type: "string" } },
      houseNature: { type: "string" },
      significance: { type: "string", description: "2-3 sentences on what this house governs" },
      interpretation: { type: "string", description: "3-4 paragraph detailed analysis" },
      predictions: { type: "array", items: { type: "string" }, description: "4-5 specific predictions" },
      strengths: { type: "array", items: { type: "string" }, description: "2-3 strengths from this house" },
      challenges: { type: "array", items: { type: "string" }, description: "2-3 challenges to watch" },
      timing: { type: "string", description: "When results may manifest" }
    },
    required: ["house", "houseHindi", "sign", "signHindi", "lord", "lordHindi", "lordHouse", "lordSign", "occupants", "houseNature", "significance", "interpretation", "predictions", "strengths", "challenges", "timing"],
    additionalProperties: false
  };

  return callAgent<HouseAnalysis>(
    HOUSES_SYSTEM_PROMPT,
    userPrompt,
    "generate_house_analysis",
    "Generate detailed Bhavphal house analysis",
    toolSchema,
    "houses"
  );
}

// Generate all 12 house analyses in batches
export async function generateAllHouseAnalyses(
  planets: SeerPlanet[],
  ascSignIdx: number
): Promise<HouseAnalysis[]> {
  const results: HouseAnalysis[] = [];

  // Build house data
  const houseData: HouseInput[] = [];
  for (let h = 1; h <= 12; h++) {
    const signIdx = (ascSignIdx + h - 1) % 12;
    const sign = SIGNS[signIdx];
    const housePlanets = planets.filter(p => p.house === h);
    houseData.push({
      houseNumber: h,
      sign,
      signIdx,
      planets: housePlanets,
      allPlanets: planets
    });
  }

  // Process in batches of 4 to avoid rate limits
  for (let i = 0; i < houseData.length; i += 4) {
    const batch = houseData.slice(i, i + 4);
    const batchResults = await Promise.all(
      batch.map(house => generateHouseAnalysis(house))
    );

    for (const result of batchResults) {
      if (result.success && result.data) {
        results.push(result.data);
      }
    }
  }

  return results.sort((a, b) => a.house - b.house);
}
