// Dasha Agent - Generates detailed Vimshottari Dasha predictions

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";

export interface DashaPrediction {
  overview: string;
  vimshottariSystem: string;
  birthNakshatra: {
    name: string;
    lord: string;
    startingDasha: string;
    balance: string;
  };
  currentMahadasha: {
    planet: string;
    startDate: string;
    endDate: string;
    planetSignificance: string;
    interpretation: string;
    majorThemes: string[];
    opportunities: string[];
    challenges: string[];
    advice: string;
  };
  currentAntardasha: {
    planet: string;
    startDate: string;
    endDate: string;
    interpretation: string;
    keyEvents: string[];
    recommendations: string[];
  };
  upcomingDashas: Array<{
    type: string;
    planet: string;
    period: string;
    briefPrediction: string;
    focus: string;
  }>;
  dashaSequence: Array<{
    planet: string;
    years: number;
    approximatePeriod: string;
    lifeFocus: string;
  }>;
  currentTransitImpact: string;
  periodRecommendations: string[];
  spiritualGuidance: string;
}

const DASHA_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Vimshottari Dasha predictions.

The Vimshottari Dasha system is a 120-year planetary period system based on Moon's Nakshatra at birth.

For each dasha period, analyze:
1. The dasha lord's placement in the chart (sign, house, aspects)
2. What the dasha lord naturally signifies
3. How the dasha lord connects to other planets
4. The antardasha sequence within the mahadasha
5. Practical life predictions during this period

Provide specific, actionable predictions. Reference the planet's dignity and house placement.
Include timing guidance and recommendations for each period.`;

interface DashaInput {
  planets: SeerPlanet[];
  moonDegree: number;
  birthDate: Date;
}

// Vimshottari dasha years
const DASHA_YEARS: Record<string, number> = {
  Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16,
  Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20
};

const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

// Nakshatra lords
const NAKSHATRA_LORDS: string[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
];

function calculateCurrentDasha(moonDegree: number, birthDate: Date): {
  mahadasha: string;
  mahadashaStart: Date;
  mahadashaEnd: Date;
  antardasha: string;
  antardashaStart: Date;
  antardashaEnd: Date;
} {
  // Calculate nakshatra index
  const nakshatraIndex = Math.floor(moonDegree / (360 / 27));
  const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex];
  
  // Calculate balance of dasha at birth
  const nakshatraDegree = moonDegree % (360 / 27);
  const nakshatraProgress = nakshatraDegree / (360 / 27);
  const dashaYears = DASHA_YEARS[nakshatraLord];
  const balanceYears = dashaYears * (1 - nakshatraProgress);
  
  // Find current dasha
  let currentDate = new Date(birthDate);
  let dashaIndex = DASHA_ORDER.indexOf(nakshatraLord);
  let firstDasha = true;
  
  const now = new Date();
  let mahadasha = nakshatraLord;
  let mahadashaStart = new Date(birthDate);
  let mahadashaEnd = new Date(birthDate);
  
  while (currentDate < now) {
    const years = firstDasha ? balanceYears : DASHA_YEARS[DASHA_ORDER[dashaIndex]];
    mahadasha = DASHA_ORDER[dashaIndex];
    mahadashaStart = new Date(currentDate);
    mahadashaEnd = new Date(currentDate);
    mahadashaEnd.setFullYear(mahadashaEnd.getFullYear() + Math.floor(years));
    mahadashaEnd.setMonth(mahadashaEnd.getMonth() + Math.round((years % 1) * 12));
    
    if (mahadashaEnd > now) break;
    
    currentDate = mahadashaEnd;
    dashaIndex = (dashaIndex + 1) % 9;
    firstDasha = false;
  }
  
  // Calculate antardasha (simplified)
  const mahadashaDuration = mahadashaEnd.getTime() - mahadashaStart.getTime();
  const elapsedInMahadasha = now.getTime() - mahadashaStart.getTime();
  const mahadashaProgress = elapsedInMahadasha / mahadashaDuration;
  
  // Antardasha proportions
  let antardasha = mahadasha;
  let antardashaStart = new Date(mahadashaStart);
  let antardashaEnd = new Date(mahadashaStart);
  
  let adProgress = 0;
  const mahadashaYears = DASHA_YEARS[mahadasha];
  const adDashaIndex = DASHA_ORDER.indexOf(mahadasha);
  
  for (let i = 0; i < 9; i++) {
    const adPlanet = DASHA_ORDER[(adDashaIndex + i) % 9];
    const adYears = (DASHA_YEARS[adPlanet] * mahadashaYears) / 120;
    const adProportion = adYears / mahadashaYears;
    
    if (adProgress + adProportion > mahadashaProgress) {
      antardasha = adPlanet;
      antardashaStart = new Date(mahadashaStart.getTime() + adProgress * mahadashaDuration);
      antardashaEnd = new Date(mahadashaStart.getTime() + (adProgress + adProportion) * mahadashaDuration);
      break;
    }
    adProgress += adProportion;
  }
  
  return {
    mahadasha,
    mahadashaStart,
    mahadashaEnd,
    antardasha,
    antardashaStart,
    antardashaEnd
  };
}

export async function generateDashaPrediction(input: DashaInput): Promise<AgentResponse<DashaPrediction>> {
  const { planets, moonDegree, birthDate } = input;
  
  const nakshatraInfo = getNakshatraWithPada(moonDegree);
  const currentDasha = calculateCurrentDasha(moonDegree, birthDate);
  
  const mahaPlanet = planets.find(p => p.name === currentDasha.mahadasha);
  const antarPlanet = planets.find(p => p.name === currentDasha.antardasha);
  
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  const userPrompt = `Provide comprehensive Vimshottari Dasha analysis:

**Birth Nakshatra:**
- Name: ${nakshatraInfo.nakshatra.name}
- Pada: ${nakshatraInfo.pada}
- Lord: ${nakshatraInfo.nakshatra.lord}

**Current Mahadasha:**
- Planet: ${currentDasha.mahadasha}
- Period: ${formatDate(currentDasha.mahadashaStart)} to ${formatDate(currentDasha.mahadashaEnd)}
- Planet's Sign: ${mahaPlanet?.sign || "N/A"}
- Planet's House: ${mahaPlanet?.house || "N/A"}
- Retrograde: ${mahaPlanet?.isRetro ? "Yes" : "No"}

**Current Antardasha:**
- Planet: ${currentDasha.antardasha}
- Period: ${formatDate(currentDasha.antardashaStart)} to ${formatDate(currentDasha.antardashaEnd)}
- Planet's Sign: ${antarPlanet?.sign || "N/A"}
- Planet's House: ${antarPlanet?.house || "N/A"}

**All Planetary Positions for Reference:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house})${p.isRetro ? " [R]" : ""}`).join("\n")}

Provide detailed dasha predictions with:
1. Deep analysis of current mahadasha themes
2. Current antardasha effects
3. Upcoming periods overview
4. Complete dasha sequence for life
5. Specific recommendations`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph dasha overview" },
      vimshottariSystem: { type: "string", description: "Brief explanation of Vimshottari system" },
      birthNakshatra: {
        type: "object",
        properties: {
          name: { type: "string" },
          lord: { type: "string" },
          startingDasha: { type: "string" },
          balance: { type: "string" }
        },
        required: ["name", "lord", "startingDasha", "balance"]
      },
      currentMahadasha: {
        type: "object",
        properties: {
          planet: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          planetSignificance: { type: "string" },
          interpretation: { type: "string", description: "3-4 paragraph detailed analysis" },
          majorThemes: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
          challenges: { type: "array", items: { type: "string" } },
          advice: { type: "string" }
        },
        required: ["planet", "startDate", "endDate", "planetSignificance", "interpretation", "majorThemes", "opportunities", "challenges", "advice"]
      },
      currentAntardasha: {
        type: "object",
        properties: {
          planet: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          interpretation: { type: "string" },
          keyEvents: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "startDate", "endDate", "interpretation", "keyEvents", "recommendations"]
      },
      upcomingDashas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            planet: { type: "string" },
            period: { type: "string" },
            briefPrediction: { type: "string" },
            focus: { type: "string" }
          },
          required: ["type", "planet", "period", "briefPrediction", "focus"]
        }
      },
      dashaSequence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            planet: { type: "string" },
            years: { type: "number" },
            approximatePeriod: { type: "string" },
            lifeFocus: { type: "string" }
          },
          required: ["planet", "years", "approximatePeriod", "lifeFocus"]
        }
      },
      currentTransitImpact: { type: "string" },
      periodRecommendations: { type: "array", items: { type: "string" } },
      spiritualGuidance: { type: "string" }
    },
    required: ["overview", "vimshottariSystem", "birthNakshatra", "currentMahadasha", "currentAntardasha", "upcomingDashas", "dashaSequence", "currentTransitImpact", "periodRecommendations", "spiritualGuidance"],
    additionalProperties: false
  };

  return callAgent<DashaPrediction>(
    DASHA_SYSTEM_PROMPT,
    userPrompt,
    "generate_dasha_prediction",
    "Generate comprehensive Vimshottari Dasha predictions",
    toolSchema
  );
}
