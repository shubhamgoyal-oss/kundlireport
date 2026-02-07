// Dasha Agent - Generates detailed Vimshottari and Yogini Dasha predictions

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";

export interface MahadashaPrediction {
  planet: string;
  startDate: string;
  endDate: string;
  duration: string;
  overview: string;
  careerImpact: string;
  relationshipImpact: string;
  healthImpact: string;
  financialImpact: string;
  spiritualGrowth: string;
  keyEvents: string[];
  opportunities: string[];
  challenges: string[];
  remedies: string[];
}

export interface AntardashaPrediction {
  mahadasha: string;
  antardasha: string;
  startDate: string;
  endDate: string;
  duration: string;
  overview: string;
  focusAreas: string[];
  predictions: string[];
  advice: string;
}

export interface YoginiDashaInfo {
  currentYogini: {
    name: string;
    planet: string;
    years: number;
    startDate: string;
    endDate: string;
    characteristics: string;
    lifeThemes: string[];
    predictions: string;
  };
  upcomingYoginis: Array<{
    name: string;
    planet: string;
    years: number;
    approximatePeriod: string;
    briefPrediction: string;
  }>;
  yoginiSequence: Array<{
    name: string;
    planet: string;
    years: number;
    nature: string;
  }>;
  systemExplanation: string;
}

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
  // Detailed predictions for each Mahadasha
  mahadashaPredictions: MahadashaPrediction[];
  // Detailed Antardasha predictions within current Mahadasha
  antardashaPredictions: AntardashaPrediction[];
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
  // Yogini Dasha System
  yoginiDasha: YoginiDashaInfo;
  currentTransitImpact: string;
  periodRecommendations: string[];
  spiritualGuidance: string;
}

const DASHA_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Vimshottari and Yogini Dasha predictions.

The Vimshottari Dasha system is a 120-year planetary period system based on Moon's Nakshatra at birth.
The Yogini Dasha system is a 36-year cycle with 8 Yoginis, each associated with a planet.

For each dasha period, analyze:
1. The dasha lord's placement in the chart (sign, house, aspects)
2. What the dasha lord naturally signifies
3. How the dasha lord connects to other planets
4. The antardasha sequence within the mahadasha
5. Practical life predictions during this period

For each Mahadasha, provide comprehensive predictions covering:
- Career and professional life
- Relationships and family
- Health and wellness
- Financial matters
- Spiritual development

For Yogini Dasha, explain the unique characteristics of each Yogini and their planetary associations.

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

// Yogini Dasha system
const YOGINI_ORDER = [
  { name: "Mangala", planet: "Moon", years: 1 },
  { name: "Pingala", planet: "Sun", years: 2 },
  { name: "Dhanya", planet: "Jupiter", years: 3 },
  { name: "Bhramari", planet: "Mars", years: 4 },
  { name: "Bhadrika", planet: "Mercury", years: 5 },
  { name: "Ulka", planet: "Saturn", years: 6 },
  { name: "Siddha", planet: "Venus", years: 7 },
  { name: "Sankata", planet: "Rahu", years: 8 }
];

// Convert years to milliseconds for precise calculations
const DAYS_PER_YEAR = 365.25; // Account for leap years
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addYearsToDate(date: Date, years: number): Date {
  // Use precise day-based calculation instead of setFullYear/setMonth
  const days = years * DAYS_PER_YEAR;
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function calculateCurrentDasha(moonDegree: number, birthDate: Date): {
  mahadasha: string;
  mahadashaStart: Date;
  mahadashaEnd: Date;
  antardasha: string;
  antardashaStart: Date;
  antardashaEnd: Date;
} {
  // Calculate nakshatra index (each nakshatra = 13°20' = 13.333...°)
  const NAKSHATRA_SPAN = 360 / 27; // 13.333... degrees
  const nakshatraIndex = Math.floor(moonDegree / NAKSHATRA_SPAN);
  const nakshatraLord = NAKSHATRA_LORDS[nakshatraIndex];
  
  // Calculate balance of dasha at birth
  // The balance is the remaining portion of the first dasha
  const nakshatraDegree = moonDegree % NAKSHATRA_SPAN;
  const nakshatraProgress = nakshatraDegree / NAKSHATRA_SPAN;
  const dashaYears = DASHA_YEARS[nakshatraLord];
  // Balance = remaining years of first dasha (1 - progress already traversed)
  const balanceYears = dashaYears * (1 - nakshatraProgress);
  
  // Find current dasha using precise day-based calculations
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
    mahadashaEnd = addYearsToDate(currentDate, years);
    
    if (mahadashaEnd > now) break;
    
    currentDate = mahadashaEnd;
    dashaIndex = (dashaIndex + 1) % 9;
    firstDasha = false;
  }
  
  // Calculate antardasha using precise proportions
  const mahadashaDuration = mahadashaEnd.getTime() - mahadashaStart.getTime();
  const elapsedInMahadasha = now.getTime() - mahadashaStart.getTime();
  const mahadashaProgress = elapsedInMahadasha / mahadashaDuration;
  
  // Antardasha proportions based on Vimshottari rules
  let antardasha = mahadasha;
  let antardashaStart = new Date(mahadashaStart);
  let antardashaEnd = new Date(mahadashaStart);
  
  let adProgress = 0;
  const mahadashaYears = DASHA_YEARS[mahadasha];
  const adDashaIndex = DASHA_ORDER.indexOf(mahadasha);
  
  for (let i = 0; i < 9; i++) {
    const adPlanet = DASHA_ORDER[(adDashaIndex + i) % 9];
    // Antardasha duration = (AD lord years × MD lord years) / 120
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

function calculateYoginiDasha(moonDegree: number, birthDate: Date): {
  currentYogini: { name: string; planet: string; years: number; startDate: Date; endDate: Date };
  sequence: Array<{ name: string; planet: string; years: number; startDate: Date; endDate: Date }>;
} {
  // Yogini dasha starts from birth nakshatra
  const NAKSHATRA_SPAN = 360 / 27;
  const nakshatraIndex = Math.floor(moonDegree / NAKSHATRA_SPAN);
  const yoginiIndex = nakshatraIndex % 8;
  
  // Calculate balance using precise method
  const nakshatraDegree = moonDegree % NAKSHATRA_SPAN;
  const nakshatraProgress = nakshatraDegree / NAKSHATRA_SPAN;
  const firstYogini = YOGINI_ORDER[yoginiIndex];
  const balanceYears = firstYogini.years * (1 - nakshatraProgress);
  
  const now = new Date();
  let currentDate = new Date(birthDate);
  let yIndex = yoginiIndex;
  let firstDasha = true;
  
  const sequence: Array<{ name: string; planet: string; years: number; startDate: Date; endDate: Date }> = [];
  let currentYogini = { ...YOGINI_ORDER[yIndex], startDate: new Date(birthDate), endDate: new Date(birthDate) };
  
  // Build full sequence using precise day-based calculations
  let tempDate = new Date(birthDate);
  let tempFirst = true;
  let tempIdx = yoginiIndex;
  
  for (let cycle = 0; cycle < 4; cycle++) { // 4 cycles = 144 years
    for (let i = 0; i < 8; i++) {
      const yogini = YOGINI_ORDER[(tempIdx + i) % 8];
      const years = (cycle === 0 && i === 0 && tempFirst) ? balanceYears : yogini.years;
      const startDate = new Date(tempDate);
      const endDate = addYearsToDate(tempDate, years);
      
      sequence.push({
        name: yogini.name,
        planet: yogini.planet,
        years: yogini.years,
        startDate,
        endDate
      });
      
      if (startDate <= now && endDate > now) {
        currentYogini = { ...yogini, startDate, endDate };
      }
      
      tempDate = endDate;
      tempFirst = false;
    }
    tempIdx = (tempIdx + 8) % 8;
  }
  
  return { currentYogini, sequence };
}

function calculateAllAntardashas(mahadasha: string, mahadashaStart: Date, mahadashaEnd: Date): Array<{
  antardasha: string;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
}> {
  const result: Array<{ antardasha: string; startDate: Date; endDate: Date; durationMonths: number }> = [];
  const mahadashaYears = DASHA_YEARS[mahadasha];
  const mahadashaDuration = mahadashaEnd.getTime() - mahadashaStart.getTime();
  const adDashaIndex = DASHA_ORDER.indexOf(mahadasha);
  
  let adStartTime = mahadashaStart.getTime();
  
  for (let i = 0; i < 9; i++) {
    const adPlanet = DASHA_ORDER[(adDashaIndex + i) % 9];
    // Antardasha duration formula: (AD lord years × MD lord years) / 120
    const adYears = (DASHA_YEARS[adPlanet] * mahadashaYears) / 120;
    const adProportion = adYears / mahadashaYears;
    const adDuration = adProportion * mahadashaDuration;
    
    const startDate = new Date(adStartTime);
    const endDate = new Date(adStartTime + adDuration);
    // More precise month calculation
    const durationDays = adDuration / MS_PER_DAY;
    const durationMonths = Math.round(durationDays / 30.4375); // Average days per month
    
    result.push({
      antardasha: adPlanet,
      startDate,
      endDate,
      durationMonths
    });
    
    adStartTime += adDuration;
  }
  
  return result;
}

export async function generateDashaPrediction(input: DashaInput): Promise<AgentResponse<DashaPrediction>> {
  const { planets, moonDegree, birthDate } = input;
  
  const nakshatraInfo = getNakshatraWithPada(moonDegree);
  const currentDasha = calculateCurrentDasha(moonDegree, birthDate);
  const yoginiInfo = calculateYoginiDasha(moonDegree, birthDate);
  const allAntardashas = calculateAllAntardashas(
    currentDasha.mahadasha, 
    currentDasha.mahadashaStart, 
    currentDasha.mahadashaEnd
  );
  
  const mahaPlanet = planets.find(p => p.name === currentDasha.mahadasha);
  const antarPlanet = planets.find(p => p.name === currentDasha.antardasha);
  
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  // Calculate upcoming mahadashas
  const upcomingMahadashas: Array<{ planet: string; startDate: Date; endDate: Date }> = [];
  let nextStart = currentDasha.mahadashaEnd;
  let nextIndex = (DASHA_ORDER.indexOf(currentDasha.mahadasha) + 1) % 9;
  
  for (let i = 0; i < 3; i++) {
    const planet = DASHA_ORDER[nextIndex];
    const years = DASHA_YEARS[planet];
    const startDate = new Date(nextStart);
    const endDate = new Date(nextStart);
    endDate.setFullYear(endDate.getFullYear() + years);
    upcomingMahadashas.push({ planet, startDate, endDate });
    nextStart = endDate;
    nextIndex = (nextIndex + 1) % 9;
  }

  const userPrompt = `Provide comprehensive Vimshottari and Yogini Dasha analysis:

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

**All Antardashas in Current Mahadasha:**
${allAntardashas.map(ad => `- ${ad.antardasha}: ${formatDate(ad.startDate)} to ${formatDate(ad.endDate)} (~${ad.durationMonths} months)`).join("\n")}

**Upcoming Mahadashas:**
${upcomingMahadashas.map(md => {
  const p = planets.find(pl => pl.name === md.planet);
  return `- ${md.planet}: ${formatDate(md.startDate)} to ${formatDate(md.endDate)}, in ${p?.sign || 'N/A'} (House ${p?.house || 'N/A'})`;
}).join("\n")}

**Current Yogini Dasha:**
- Yogini: ${yoginiInfo.currentYogini.name}
- Planet: ${yoginiInfo.currentYogini.planet}
- Duration: ${yoginiInfo.currentYogini.years} years
- Period: ${formatDate(yoginiInfo.currentYogini.startDate)} to ${formatDate(yoginiInfo.currentYogini.endDate)}

**All Planetary Positions for Reference:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house})${p.isRetro ? " [R]" : ""}`).join("\n")}

Provide detailed dasha predictions with:
1. Deep analysis of current mahadasha themes
2. Current antardasha effects
3. DETAILED predictions for EACH upcoming mahadasha (career, relationships, health, finances, spirituality)
4. Predictions for EACH antardasha within current mahadasha
5. Yogini Dasha analysis with current and upcoming yoginis
6. Complete dasha sequence for life
7. Specific recommendations`;

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
      mahadashaPredictions: {
        type: "array",
        description: "Detailed predictions for each upcoming mahadasha",
        items: {
          type: "object",
          properties: {
            planet: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            duration: { type: "string" },
            overview: { type: "string", description: "2-3 paragraph overview" },
            careerImpact: { type: "string" },
            relationshipImpact: { type: "string" },
            healthImpact: { type: "string" },
            financialImpact: { type: "string" },
            spiritualGrowth: { type: "string" },
            keyEvents: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            challenges: { type: "array", items: { type: "string" } },
            remedies: { type: "array", items: { type: "string" } }
          },
          required: ["planet", "startDate", "endDate", "duration", "overview", "careerImpact", "relationshipImpact", "healthImpact", "financialImpact", "spiritualGrowth", "keyEvents", "opportunities", "challenges", "remedies"]
        }
      },
      antardashaPredictions: {
        type: "array",
        description: "Predictions for each antardasha within current mahadasha",
        items: {
          type: "object",
          properties: {
            mahadasha: { type: "string" },
            antardasha: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            duration: { type: "string" },
            overview: { type: "string" },
            focusAreas: { type: "array", items: { type: "string" } },
            predictions: { type: "array", items: { type: "string" } },
            advice: { type: "string" }
          },
          required: ["mahadasha", "antardasha", "startDate", "endDate", "duration", "overview", "focusAreas", "predictions", "advice"]
        }
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
      yoginiDasha: {
        type: "object",
        description: "Yogini Dasha analysis",
        properties: {
          currentYogini: {
            type: "object",
            properties: {
              name: { type: "string" },
              planet: { type: "string" },
              years: { type: "number" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              characteristics: { type: "string" },
              lifeThemes: { type: "array", items: { type: "string" } },
              predictions: { type: "string" }
            },
            required: ["name", "planet", "years", "startDate", "endDate", "characteristics", "lifeThemes", "predictions"]
          },
          upcomingYoginis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                planet: { type: "string" },
                years: { type: "number" },
                approximatePeriod: { type: "string" },
                briefPrediction: { type: "string" }
              },
              required: ["name", "planet", "years", "approximatePeriod", "briefPrediction"]
            }
          },
          yoginiSequence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                planet: { type: "string" },
                years: { type: "number" },
                nature: { type: "string" }
              },
              required: ["name", "planet", "years", "nature"]
            }
          },
          systemExplanation: { type: "string" }
        },
        required: ["currentYogini", "upcomingYoginis", "yoginiSequence", "systemExplanation"]
      },
      currentTransitImpact: { type: "string" },
      periodRecommendations: { type: "array", items: { type: "string" } },
      spiritualGuidance: { type: "string" }
    },
    required: ["overview", "vimshottariSystem", "birthNakshatra", "currentMahadasha", "currentAntardasha", "mahadashaPredictions", "antardashaPredictions", "upcomingDashas", "dashaSequence", "yoginiDasha", "currentTransitImpact", "periodRecommendations", "spiritualGuidance"],
    additionalProperties: false
  };

  return callAgent<DashaPrediction>(
    DASHA_SYSTEM_PROMPT,
    userPrompt,
    "generate_dasha_prediction",
    "Generate comprehensive Vimshottari and Yogini Dasha predictions",
    toolSchema
  );
}
