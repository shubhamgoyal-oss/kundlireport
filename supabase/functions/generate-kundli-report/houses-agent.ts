// Houses Agent - Generates detailed Bhavphal (12 house) analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";
import { getSignLord } from "./utils/dignity.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

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

const HOUSE_HINDI: Record<number, string> = {
  1: "प्रथम भाव", 2: "द्वितीय भाव", 3: "तृतीय भाव", 4: "चतुर्थ भाव",
  5: "पंचम भाव", 6: "षष्ठ भाव", 7: "सप्तम भाव", 8: "अष्टम भाव",
  9: "नवम भाव", 10: "दशम भाव", 11: "एकादश भाव", 12: "द्वादश भाव"
};

const SIGN_HINDI: Record<string, string> = {
  Aries: "मेष", Taurus: "वृष", Gemini: "मिथुन", Cancer: "कर्क",
  Leo: "सिंह", Virgo: "कन्या", Libra: "तुला", Scorpio: "वृश्चिक",
  Sagittarius: "धनु", Capricorn: "मकर", Aquarius: "कुम्भ", Pisces: "मीन",
};

const PLANET_HINDI: Record<string, string> = {
  Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध",
  Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु",
};

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

For each house, provide a detailed 3-4 paragraph interpretation covering:
1. The significance of the sign placed in this house and its elemental nature
2. The placement and condition of the house lord - where it sits and what that means
3. Any planets occupying this house and their combined effect
4. Practical life predictions based on this house's significations
5. Timing indications for when results may manifest

Be specific, reference planetary combinations, and provide actionable insights.
Use a warm but authoritative tone. Reference classical texts naturally.
Each prediction should be 2-3 sentences with clear guidance.`;

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

  const userPrompt = `Analyze House ${houseNumber} (${houseInfo.name}) in detail:

**House Configuration:**
- House Number: ${houseNumber} (${HOUSE_HINDI[houseNumber]})
- Sign in House: ${sign} (${SIGN_HINDI[sign]})
- House Lord: ${lord} (${PLANET_HINDI[lord]})
- Lord's Position: House ${lordPlanet?.house || "N/A"} in ${lordPlanet?.sign || "N/A"}
- Lord Retrograde: ${lordPlanet?.isRetro ? "Yes" : "No"}

**Occupants in House ${houseNumber}:**
${occupantNames.length > 0 ? occupantNames.map(p => `- ${p} (${PLANET_HINDI[p]})`).join("\n") : "- Empty (no planets)"}

**House Significations:**
- Name: ${houseInfo.name}
- Nature: ${houseInfo.nature}
- Areas of Life: ${houseInfo.areas}

Provide comprehensive Bhavphal analysis with:
1. Deep interpretation of sign + lord placement
2. Effect of any occupants
3. 4-5 specific life predictions
4. Strengths and challenges
5. Timing guidance for results`;

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
    toolSchema
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
