// Dasha Agent - Generates detailed Vimshottari and Yogini Dasha predictions

import { callAgent, getAgentLanguage, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import { getNakshatraWithPada } from "./utils/nakshatra.ts";
import { calculateAspects, getAspectsFromPlanet } from "./utils/aspects.ts";
import { planetName, signName, term, tmpl, planetSig } from "./lang-utils.ts";

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

export interface UpcomingMahadashaAntardashaPrediction {
  mahadasha: string;
  startDate: string;
  endDate: string;
  overview: string;
  antardashas: Array<{
    antardasha: string;
    startDate: string;
    endDate: string;
    duration: string;
    interpretation: string;
    focusAreas: string[];
    advice: string;
  }>;
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
  // Antardasha predictions for upcoming Mahadashas
  upcomingMahadashaAntardashaPredictions: UpcomingMahadashaAntardashaPrediction[];
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

// PLANET_SIGNIFICATIONS / _HI / _TE deleted — now use planetSig() from lang-utils.ts
// PLANET_NAME_HI/TE deleted — now use planetName() from lang-utils.ts
// SIGN_NAME_HI/TE deleted — now use signName() from lang-utils.ts

function planetContext(planet: string, allPlanets: SeerPlanet[]): string {
  const p = allPlanets.find((x) => x.name === planet);
  const pName = planetName(planet);
  if (!p) {
    return tmpl("dasha.planetContextUnavailable", { pName });
  }
  const sName = signName(p.sign);
  const retro = p.isRetro ? tmpl("dasha.planetContextRetro") || `, ${term("Retrograde")}` : "";
  return tmpl("dasha.planetContext", { pName, planet, sName, sign: p.sign, house: String(p.house), retro });
}

function isWeakNarrative(text: string | undefined, minLength = 130): boolean {
  const t = (text || "").trim();
  const lang = getAgentLanguage();
  // Hindi/Telugu scripts are more compact — halve the min-length requirement.
  // Also skip English-only generic-phrase detection for non-Latin scripts.
  const effectiveMin = lang === "en" ? minLength : Math.floor(minLength * 0.4);
  if (t.length < effectiveMin) return true;
  if (lang !== "en") return false;  // skip English pattern checks for non-English
  const genericPatterns = [
    /meaningful shift in priorities/i,
    /structured action/i,
    /work with sequence and timing/i,
    /distinct life chapter/i,
  ];
  return genericPatterns.some((rx) => rx.test(t));
}

function cleanTextArtifact(text: string | undefined): string {
  return String(text || "")
    .replace(/\s+landscapes\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function useOrFallbackArray(values: string[] | undefined, fallback: string[]): string[] {
  const clean = (values || []).map((v) => cleanTextArtifact(String(v))).filter(Boolean);
  const lang = getAgentLanguage();
  // For non-English: accept any AI content (even 1 item) to avoid English fallbacks
  // that render as invisible text under Devanagari/Telugu fonts.
  if (lang !== "en" && clean.length >= 1) return clean;
  return clean.length >= 3 ? clean : fallback;
}

function buildAntardashaInterpretation(
  mahadasha: string,
  antardasha: string,
  allPlanets: SeerPlanet[],
): string {
  const md = planetSig(mahadasha);
  const ad = planetSig(antardasha);
  const mdCtx = planetContext(mahadasha, allPlanets);
  const adCtx = planetContext(antardasha, allPlanets);
  const mdName = planetName(mahadasha);
  const adName = planetName(antardasha);
  return tmpl("dasha.antardasha.interpretation", {
    mdName, adName, mdThemes: md.themes, adThemes: ad.themes,
    mdCtx, adCtx, mdCaution: md.caution, adCaution: ad.caution,
  });
}

function buildAntardashaFocusAreas(mahadasha: string, antardasha: string): string[] {
  const md = planetSig(mahadasha);
  const ad = planetSig(antardasha);
  const mdName = planetName(mahadasha);
  const adName = planetName(antardasha);
  const vars = {
    mdName, adName, mdThemes: md.themes, adThemes: ad.themes,
    mdOpportunity: md.opportunity, adOpportunity: ad.opportunity,
    mdCaution: md.caution, adCaution: ad.caution,
  };
  return [
    tmpl("dasha.antardasha.focusAreas.0", vars),
    tmpl("dasha.antardasha.focusAreas.1", vars),
    tmpl("dasha.antardasha.focusAreas.2", vars),
  ];
}

function buildAntardashaAdvice(mahadasha: string, antardasha: string): string {
  const md = planetSig(mahadasha);
  const ad = planetSig(antardasha);
  return tmpl("dasha.antardasha.advice", {
    mdOpportunity: md.opportunity, adOpportunity: ad.opportunity,
    mdCaution: md.caution, adCaution: ad.caution,
  });
}

// ─── Shared Dasha Computation ───────────────────────────────────────────────

interface DashaComputedData {
  nakshatraInfo: ReturnType<typeof getNakshatraWithPada>;
  currentDasha: ReturnType<typeof calculateCurrentDasha>;
  yoginiInfo: ReturnType<typeof calculateYoginiDasha>;
  allAntardashas: ReturnType<typeof calculateAllAntardashas>;
  relevantCurrentAntardashas: ReturnType<typeof calculateAllAntardashas>;
  upcomingMahadashas: Array<{ planet: string; startDate: Date; endDate: Date }>;
  upcomingMahadashaAntardashaWindows: Array<{
    mahadasha: string; startDate: Date; endDate: Date;
    antardashas: ReturnType<typeof calculateAllAntardashas>;
  }>;
  formatDate: (d: Date) => string;
}

function computeDashaTimings(input: DashaInput): DashaComputedData {
  const { moonDegree, birthDate } = input;
  const nakshatraInfo = getNakshatraWithPada(moonDegree);
  const currentDasha = calculateCurrentDasha(moonDegree, birthDate);
  const yoginiInfo = calculateYoginiDasha(moonDegree, birthDate);
  const allAntardashas = calculateAllAntardashas(
    currentDasha.mahadasha, currentDasha.mahadashaStart, currentDasha.mahadashaEnd
  );
  const now = new Date();
  const relevantCurrentAntardashas = allAntardashas.filter((ad) => ad.endDate.getTime() >= now.getTime());
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  const upcomingMahadashas: Array<{ planet: string; startDate: Date; endDate: Date }> = [];
  let nextStart = currentDasha.mahadashaEnd;
  let nextIndex = (DASHA_ORDER.indexOf(currentDasha.mahadasha) + 1) % 9;
  for (let i = 0; i < 3; i++) {
    const planet = DASHA_ORDER[nextIndex];
    const years = DASHA_YEARS[planet];
    const startDate = new Date(nextStart);
    const endDate = addYearsToDate(nextStart, years);
    upcomingMahadashas.push({ planet, startDate, endDate });
    nextStart = endDate;
    nextIndex = (nextIndex + 1) % 9;
  }

  const upcomingMahadashaAntardashaWindows = upcomingMahadashas.map((md) => ({
    mahadasha: md.planet, startDate: md.startDate, endDate: md.endDate,
    antardashas: calculateAllAntardashas(md.planet, md.startDate, md.endDate),
  }));

  return {
    nakshatraInfo, currentDasha, yoginiInfo, allAntardashas,
    relevantCurrentAntardashas, upcomingMahadashas,
    upcomingMahadashaAntardashaWindows, formatDate,
  };
}

// ─── Result interfaces for split agents ─────────────────────────────────────

export interface DashaMahadashaResult {
  overview: string;
  vimshottariSystem: string;
  birthNakshatra: DashaPrediction["birthNakshatra"];
  currentMahadasha: DashaPrediction["currentMahadasha"];
  mahadashaPredictions: MahadashaPrediction[];
  upcomingDashas: DashaPrediction["upcomingDashas"];
  dashaSequence: DashaPrediction["dashaSequence"];
  yoginiDasha: YoginiDashaInfo;
  currentTransitImpact: string;
  periodRecommendations: string[];
  spiritualGuidance: string;
}

export interface DashaAntardashaResult {
  currentAntardasha: DashaPrediction["currentAntardasha"];
  antardashaPredictions: AntardashaPrediction[];
  upcomingMahadashaAntardashaPredictions: UpcomingMahadashaAntardashaPrediction[];
}

// ─── Mahadasha Agent ────────────────────────────────────────────────────────

const MAHADASHA_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Vimshottari and Yogini Dasha predictions.

Analyze each Mahadasha (major planetary period) considering:
1. The dasha lord's placement (sign, house, dignity) and the houses it ASPECTS via Drishti — during its period, the dasha lord activates both its occupied house and every house it aspects
2. What the dasha lord naturally signifies (karakatva)
3. Practical life predictions: career, relationships, health, finances, spirituality
4. Whether the dasha lord receives benefic or malefic Drishti from other planets

For Yogini Dasha, explain the unique characteristics of each Yogini and their planetary associations.

Provide specific, actionable predictions. Reference the planet's dignity, house placement, and aspects.`;

export async function generateDashaMahadashaPrediction(input: DashaInput): Promise<AgentResponse<DashaMahadashaResult>> {
  const { planets, moonDegree } = input;
  const cd = computeDashaTimings(input);
  const { nakshatraInfo, currentDasha, yoginiInfo, upcomingMahadashas, formatDate } = cd;
  const mahaPlanet = planets.find(p => p.name === currentDasha.mahadasha);

  // Compute Drishti for dasha lords — concise summary per planet
  const allAspects = calculateAspects(planets, planets[0]);
  const buildAspectSummary = (pName: string): string => {
    const pa = getAspectsFromPlanet(allAspects, pName);
    return pa.length > 0
      ? pa.map(a => `H${a.targetHouse}(${a.aspectType})`).join(', ')
      : 'standard 7th only';
  };

  const userPrompt = `Provide Mahadasha-level Vimshottari and Yogini Dasha analysis:

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
- Drishti on houses: ${buildAspectSummary(currentDasha.mahadasha)}

**Upcoming Mahadashas:**
${upcomingMahadashas.map(md => {
  const p = planets.find(pl => pl.name === md.planet);
  return `- ${md.planet}: ${formatDate(md.startDate)} to ${formatDate(md.endDate)}, in ${p?.sign || 'N/A'} (House ${p?.house || 'N/A'}), aspects: ${buildAspectSummary(md.planet)}`;
}).join("\n")}

**Current Yogini Dasha:**
- Yogini: ${yoginiInfo.currentYogini.name}
- Planet: ${yoginiInfo.currentYogini.planet}
- Duration: ${yoginiInfo.currentYogini.years} years
- Period: ${formatDate(yoginiInfo.currentYogini.startDate)} to ${formatDate(yoginiInfo.currentYogini.endDate)}

**All Planetary Positions for Reference:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house})${p.isRetro ? " [R]" : ""}`).join("\n")}

Focus on:
1. Deep analysis of current mahadasha themes
2. DETAILED predictions for EACH upcoming mahadasha (career, relationships, health, finances, spirituality)
3. Yogini Dasha analysis
4. Complete dasha sequence for life
5. Transit impact and recommendations

CRITICAL DEPTH REQUIREMENTS:
- Current Mahadasha interpretation must be multi-paragraph and deeply detailed.
- Each Mahadasha impact section (career/relationship/health/financial) must be a developed paragraph.`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph dasha overview" },
      vimshottariSystem: { type: "string", description: "Brief explanation of Vimshottari system" },
      birthNakshatra: {
        type: "object",
        properties: {
          name: { type: "string" }, lord: { type: "string" },
          startingDasha: { type: "string" }, balance: { type: "string" }
        },
        required: ["name", "lord", "startingDasha", "balance"]
      },
      currentMahadasha: {
        type: "object",
        properties: {
          planet: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" },
          planetSignificance: { type: "string" },
          interpretation: { type: "string", minLength: 320, description: "3-4 paragraph detailed analysis" },
          majorThemes: { type: "array", items: { type: "string" } },
          opportunities: { type: "array", items: { type: "string" } },
          challenges: { type: "array", items: { type: "string" } },
          advice: { type: "string", minLength: 100 }
        },
        required: ["planet", "startDate", "endDate", "planetSignificance", "interpretation", "majorThemes", "opportunities", "challenges", "advice"]
      },
      mahadashaPredictions: {
        type: "array", description: "Detailed predictions for each upcoming mahadasha",
        items: {
          type: "object",
          properties: {
            planet: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" },
            duration: { type: "string" },
            overview: { type: "string", minLength: 240, description: "2-3 paragraph overview" },
            careerImpact: { type: "string", minLength: 170 },
            relationshipImpact: { type: "string", minLength: 170 },
            healthImpact: { type: "string", minLength: 170 },
            financialImpact: { type: "string", minLength: 170 },
            spiritualGrowth: { type: "string", minLength: 140 },
            keyEvents: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            challenges: { type: "array", items: { type: "string" } },
            remedies: { type: "array", items: { type: "string" } }
          },
          required: ["planet", "startDate", "endDate", "duration", "overview", "careerImpact", "relationshipImpact", "healthImpact", "financialImpact", "spiritualGrowth", "keyEvents", "opportunities", "challenges", "remedies"]
        }
      },
      upcomingDashas: {
        type: "array", items: {
          type: "object",
          properties: { type: { type: "string" }, planet: { type: "string" }, period: { type: "string" }, briefPrediction: { type: "string" }, focus: { type: "string" } },
          required: ["type", "planet", "period", "briefPrediction", "focus"]
        }
      },
      dashaSequence: {
        type: "array", items: {
          type: "object",
          properties: { planet: { type: "string" }, years: { type: "number" }, approximatePeriod: { type: "string" }, lifeFocus: { type: "string" } },
          required: ["planet", "years", "approximatePeriod", "lifeFocus"]
        }
      },
      yoginiDasha: {
        type: "object", description: "Yogini Dasha analysis",
        properties: {
          currentYogini: {
            type: "object",
            properties: { name: { type: "string" }, planet: { type: "string" }, years: { type: "number" }, startDate: { type: "string" }, endDate: { type: "string" }, characteristics: { type: "string" }, lifeThemes: { type: "array", items: { type: "string" } }, predictions: { type: "string" } },
            required: ["name", "planet", "years", "startDate", "endDate", "characteristics", "lifeThemes", "predictions"]
          },
          upcomingYoginis: {
            type: "array", items: {
              type: "object",
              properties: { name: { type: "string" }, planet: { type: "string" }, years: { type: "number" }, approximatePeriod: { type: "string" }, briefPrediction: { type: "string" } },
              required: ["name", "planet", "years", "approximatePeriod", "briefPrediction"]
            }
          },
          yoginiSequence: {
            type: "array", items: {
              type: "object",
              properties: { name: { type: "string" }, planet: { type: "string" }, years: { type: "number" }, nature: { type: "string" } },
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
    required: ["overview", "vimshottariSystem", "birthNakshatra", "currentMahadasha", "mahadashaPredictions", "upcomingDashas", "dashaSequence", "yoginiDasha", "currentTransitImpact", "periodRecommendations", "spiritualGuidance"],
    additionalProperties: false
  };

  const aiResult = await callAgent<DashaMahadashaResult>(
    MAHADASHA_SYSTEM_PROMPT, userPrompt,
    "generate_mahadasha_prediction", "Generate Mahadasha and Yogini Dasha predictions", toolSchema,
    "dasha"
  );

  if (!aiResult.success || !aiResult.data) return aiResult;

  // Normalize with deterministic data
  const startingDasha = nakshatraInfo.nakshatra.lord;
  const NAKSHATRA_SPAN = 360 / 27;
  const nakshatraDegree = moonDegree % NAKSHATRA_SPAN;
  const nakshatraProgress = nakshatraDegree / NAKSHATRA_SPAN;
  const balanceYears = DASHA_YEARS[startingDasha] * (1 - nakshatraProgress);

  const allMahadashaPeriods = [
    { planet: currentDasha.mahadasha, startDate: currentDasha.mahadashaStart, endDate: currentDasha.mahadashaEnd },
    ...upcomingMahadashas,
  ];
  const mahadashaByPlanet = new Map(allMahadashaPeriods.map((md) => [md.planet, md] as const));

  const normalized: DashaMahadashaResult = {
    ...aiResult.data,
    birthNakshatra: {
      ...aiResult.data.birthNakshatra,
      name: nakshatraInfo.nakshatra.name, lord: nakshatraInfo.nakshatra.lord,
      startingDasha, balance: `${balanceYears.toFixed(2)} years`,
    },
    currentMahadasha: {
      ...aiResult.data.currentMahadasha,
      planet: currentDasha.mahadasha,
      startDate: formatDate(currentDasha.mahadashaStart),
      endDate: formatDate(currentDasha.mahadashaEnd),
    },
    mahadashaPredictions: (aiResult.data.mahadashaPredictions || []).map((md) => {
      const deterministic = mahadashaByPlanet.get(md.planet);
      if (!deterministic) return md;
      return { ...md, startDate: formatDate(deterministic.startDate), endDate: formatDate(deterministic.endDate) };
    }),
    yoginiDasha: {
      ...aiResult.data.yoginiDasha,
      currentYogini: {
        ...aiResult.data.yoginiDasha.currentYogini,
        name: yoginiInfo.currentYogini.name, planet: yoginiInfo.currentYogini.planet,
        years: yoginiInfo.currentYogini.years,
        startDate: formatDate(yoginiInfo.currentYogini.startDate),
        endDate: formatDate(yoginiInfo.currentYogini.endDate),
      },
    },
  };

  return { ...aiResult, data: normalized };
}

// ─── Antardasha Agent ───────────────────────────────────────────────────────

const ANTARDASHA_SYSTEM_PROMPT = `You are an expert Vedic astrologer specializing in Antardasha (sub-period) predictions.

For each Antardasha within a Mahadasha, analyze:
1. The interaction between Mahadasha lord and Antardasha lord — mutual Drishti, house exchange, or dispositorship strengthen the connection
2. The houses both lords ASPECT via Drishti — these life areas get activated during the sub-period
3. Specific focus areas, opportunities, and risks during the sub-period
4. Practical advice for navigating each sub-period

Provide specific, chart-linked predictions. Each interpretation must be a developed paragraph.`;

export async function generateDashaAntardashaPrediction(input: DashaInput): Promise<AgentResponse<DashaAntardashaResult>> {
  const { planets } = input;
  const cd = computeDashaTimings(input);
  const { currentDasha, relevantCurrentAntardashas, upcomingMahadashas,
          upcomingMahadashaAntardashaWindows, formatDate, allAntardashas } = cd;
  const mahaPlanet = planets.find(p => p.name === currentDasha.mahadasha);
  const antarPlanet = planets.find(p => p.name === currentDasha.antardasha);

  // Compute Drishti for Maha/Antar lords
  const allAspects = calculateAspects(planets, planets[0]);
  const mahaAspects = getAspectsFromPlanet(allAspects, currentDasha.mahadasha);
  const antarAspects = getAspectsFromPlanet(allAspects, currentDasha.antardasha);
  const mahaAspectsAntar = mahaPlanet && antarPlanet
    ? mahaAspects.some(a => a.targetHouse === antarPlanet.house) : false;
  const antarAspectsMaha = mahaPlanet && antarPlanet
    ? antarAspects.some(a => a.targetHouse === mahaPlanet.house) : false;
  const mutualAspect = mahaAspectsAntar && antarAspectsMaha;

  // NOTE: We only ask the AI for current-mahadasha antardashas (~9 items).
  // Upcoming-mahadasha antardashas (3×9 = 27 items) are generated deterministically
  // to keep the AI call fast (<60s) and within Supabase free-tier timeout.
  const userPrompt = `Provide Antardasha (sub-period) predictions for the CURRENT Mahadasha only:

**Current Mahadasha (context):**
- Planet: ${currentDasha.mahadasha}
- Period: ${formatDate(currentDasha.mahadashaStart)} to ${formatDate(currentDasha.mahadashaEnd)}
- Planet's Sign: ${mahaPlanet?.sign || "N/A"}, House: ${mahaPlanet?.house || "N/A"}
- Drishti on: ${mahaAspects.map(a => `H${a.targetHouse}`).join(', ') || 'none'}

**Current Antardasha:**
- Planet: ${currentDasha.antardasha}
- Period: ${formatDate(currentDasha.antardashaStart)} to ${formatDate(currentDasha.antardashaEnd)}
- Planet's Sign: ${antarPlanet?.sign || "N/A"}, House: ${antarPlanet?.house || "N/A"}
- Drishti on: ${antarAspects.map(a => `H${a.targetHouse}`).join(', ') || 'none'}
- Maha↔Antar aspect: ${mutualAspect ? 'MUTUAL (strong connection)' : mahaAspectsAntar ? `${currentDasha.mahadasha} aspects ${currentDasha.antardasha}` : antarAspectsMaha ? `${currentDasha.antardasha} aspects ${currentDasha.mahadasha}` : 'no direct aspect'}

**Current + Upcoming Antardashas in Current Mahadasha:**
${relevantCurrentAntardashas.map(ad => `- ${currentDasha.mahadasha}/${ad.antardasha}: ${formatDate(ad.startDate)} to ${formatDate(ad.endDate)} (~${ad.durationMonths} months)`).join("\n")}

**All Planetary Positions for Reference:**
${planets.map(p => `- ${p.name}: ${p.sign} (House ${p.house})${p.isRetro ? " [R]" : ""}`).join("\n")}

Focus on:
1. Current antardasha effects in detail
2. Predictions for EACH remaining antardasha within current mahadasha
- Each interpretation must be a substantial paragraph, not a one-liner.`;

  const toolSchema = {
    type: "object",
    properties: {
      currentAntardasha: {
        type: "object",
        properties: {
          planet: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" },
          interpretation: { type: "string", minLength: 180 },
          keyEvents: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["planet", "startDate", "endDate", "interpretation", "keyEvents", "recommendations"]
      },
      antardashaPredictions: {
        type: "array", description: "Predictions for each antardasha within current mahadasha",
        items: {
          type: "object",
          properties: {
            mahadasha: { type: "string" }, antardasha: { type: "string" },
            startDate: { type: "string" }, endDate: { type: "string" }, duration: { type: "string" },
            overview: { type: "string", minLength: 140 },
            focusAreas: { type: "array", items: { type: "string" } },
            predictions: { type: "array", items: { type: "string" } },
            advice: { type: "string", minLength: 90 }
          },
          required: ["mahadasha", "antardasha", "startDate", "endDate", "duration", "overview", "focusAreas", "predictions", "advice"]
        }
      },
    },
    required: ["currentAntardasha", "antardashaPredictions"],
    additionalProperties: false
  };

  const aiResult = await callAgent<DashaAntardashaResult>(
    ANTARDASHA_SYSTEM_PROMPT, userPrompt,
    "generate_antardasha_prediction", "Generate Antardasha sub-period predictions", toolSchema,
    "dasha"
  );

  if (!aiResult.success || !aiResult.data) return aiResult;

  // Normalize with deterministic data + fallbacks
  const antardashaByPlanet = new Map(allAntardashas.map((ad) => [ad.antardasha, ad] as const));
  const upcomingAntardashaWindowsByMahadasha = new Map(
    upcomingMahadashaAntardashaWindows.map((md) => [
      md.mahadasha, new Map(md.antardashas.map((ad) => [ad.antardasha, ad] as const)),
    ] as const)
  );
  const aiCurrentAntardashaByPlanet = new Map(
    (aiResult.data.antardashaPredictions || []).map((ad) => [ad.antardasha, ad] as const)
  );

  const lang = getAgentLanguage();

  const normalized: DashaAntardashaResult = {
    currentAntardasha: {
      ...aiResult.data.currentAntardasha,
      planet: currentDasha.antardasha,
      startDate: formatDate(currentDasha.antardashaStart),
      endDate: formatDate(currentDasha.antardashaEnd),
    },
    antardashaPredictions: relevantCurrentAntardashas.map((adWindow) => {
      const aiAd = aiCurrentAntardashaByPlanet.get(adWindow.antardasha);
      const deterministic = antardashaByPlanet.get(adWindow.antardasha);
      const fallbackInterpretation = buildAntardashaInterpretation(currentDasha.mahadasha, adWindow.antardasha, planets);
      return {
        mahadasha: currentDasha.mahadasha,
        antardasha: adWindow.antardasha,
        startDate: formatDate(deterministic?.startDate || adWindow.startDate),
        endDate: formatDate(deterministic?.endDate || adWindow.endDate),
        duration: lang === "hi" ? `~${adWindow.durationMonths} महीने` : lang === "te" ? `~${adWindow.durationMonths} నెలలు` : `~${adWindow.durationMonths} months`,
        overview: !isWeakNarrative(aiAd?.overview, 150)
          ? cleanTextArtifact(aiAd!.overview) : fallbackInterpretation,
        focusAreas: useOrFallbackArray(aiAd?.focusAreas,
          buildAntardashaFocusAreas(currentDasha.mahadasha, adWindow.antardasha)),
        predictions: useOrFallbackArray(aiAd?.predictions,
          lang === "hi"
            ? [
                `${planetName(currentDasha.mahadasha)}/${planetName(adWindow.antardasha)} चरण कार्य और जिम्मेदारी संरचनाओं में प्राथमिकताओं को पुनर्निर्धारित कर सकता है।`,
                `जब प्रतिबद्धताओं को क्रमबद्ध और समीक्षित किया जाता है तो परिणाम बेहतर होते हैं।`,
                `संबंध और वित्तीय निर्णय दीर्घकालिक स्थिरता के लिए मूल्यांकन करके लें।`,
              ]
            : lang === "te"
            ? [
                `${planetName(currentDasha.mahadasha)}/${planetName(adWindow.antardasha)} దశ పని మరియు బాధ్యత నిర్మాణాలలో ప్రాధాన్యతలను పునర్నిర్ణయించగలదు.`,
                `నిబద్ధతలను క్రమబద్ధంగా మరియు సమీక్షాపూర్వకంగా చేసినప్పుడు ఫలితాలు మెరుగుపడతాయి.`,
                `సంబంధ మరియు ఆర్థిక నిర్ణయాలను దీర్ఘకాలిక స్థిరత్వం కోసం మూల్యాంకనం చేసి తీసుకోండి.`,
              ]
            : [
                `This ${currentDasha.mahadasha}/${adWindow.antardasha} phase can reset priorities in work and responsibility structures.`,
                `Outcomes improve when commitments are sequenced and reviewed rather than rushed.`,
                `Relationship and financial choices should be evaluated for long-term stability before execution.`,
              ]),
        advice: !isWeakNarrative(aiAd?.advice, 90)
          ? cleanTextArtifact(aiAd!.advice)
          : buildAntardashaAdvice(currentDasha.mahadasha, adWindow.antardasha),
      };
    }),
    // Upcoming mahadasha antardashas are generated entirely deterministically.
    // This avoids the 27-item AI generation that was causing timeouts (3 mahadashas × 9 antardashas).
    // The deterministic content uses actual chart placements and planet significations.
    upcomingMahadashaAntardashaPredictions: upcomingMahadashaAntardashaWindows.map((mdWindow) => {
      const deterministicByAntardasha = upcomingAntardashaWindowsByMahadasha.get(mdWindow.mahadasha);
      return {
        mahadasha: mdWindow.mahadasha,
        startDate: formatDate(mdWindow.startDate),
        endDate: formatDate(mdWindow.endDate),
        overview: lang === "hi"
          ? `${planetName(mdWindow.mahadasha)} महादशा ${planetSig(mdWindow.mahadasha).themes} पर केंद्रित एक दीर्घकालिक कर्म अध्याय खोलती है। प्रत्येक अंतर्दशा गति, प्राथमिकताओं और जोखिम प्रोफ़ाइल को बदलती है। सर्वोत्तम रणनीति चरणबद्ध कार्यान्वयन है: उद्देश्य निर्धारित करें, प्रत्येक अंतर्दशा परिवर्तन पर पुनर्मूल्यांकन करें।`
          : lang === "te"
          ? `${planetName(mdWindow.mahadasha)} మహాదశ ${planetSig(mdWindow.mahadasha).themes} పై కేంద్రీకృతమైన దీర్ఘకాలిక కర్మ అధ్యాయాన్ని ప్రారంభిస్తుంది. ప్రతి అంతర్దశ వేగం, ప్రాధాన్యతలు మరియు ఫలితాలను మారుస్తుంది. ఉత్తమ వ్యూహం దశల వారీగా అమలు చేయడం: లక్ష్యాలను ముందుగా నిర్ణయించి, ప్రతి అంతర్దశ మార్పులో పునఃమూల్యాంకనం చేయండి.`
          : `${mdWindow.mahadasha} Mahadasha opens a long-form karmic chapter centered on ${planetSig(mdWindow.mahadasha).themes}. Each Antardasha modifies pace, priorities, and risk profile. The best strategy is phase-wise execution: define objectives early, re-evaluate at each Antardasha transition, and adjust commitments to preserve stability while compounding gains.`,
        antardashas: mdWindow.antardashas.map((adWindow) => {
          const deterministic = deterministicByAntardasha?.get(adWindow.antardasha);
          return {
            antardasha: adWindow.antardasha,
            startDate: formatDate(deterministic?.startDate || adWindow.startDate),
            endDate: formatDate(deterministic?.endDate || adWindow.endDate),
            duration: lang === "hi" ? `~${adWindow.durationMonths} महीने` : lang === "te" ? `~${adWindow.durationMonths} నెలలు` : `~${adWindow.durationMonths} months`,
            interpretation: buildAntardashaInterpretation(mdWindow.mahadasha, adWindow.antardasha, planets),
            focusAreas: buildAntardashaFocusAreas(mdWindow.mahadasha, adWindow.antardasha),
            advice: buildAntardashaAdvice(mdWindow.mahadasha, adWindow.antardasha),
          };
        }),
      };
    }),
  };

  return { ...aiResult, data: normalized };
}

// ─── Merge utility ──────────────────────────────────────────────────────────

export function mergeDashaResults(
  mahaResult: AgentResponse<DashaMahadashaResult>,
  antarResult: AgentResponse<DashaAntardashaResult>,
): AgentResponse<DashaPrediction> {
  // If both failed, return mahadasha error (more critical)
  if (!mahaResult.success && !antarResult.success) {
    return { success: false, error: mahaResult.error || antarResult.error, tokensUsed: (mahaResult.tokensUsed || 0) + (antarResult.tokensUsed || 0) };
  }

  const totalTokens = (mahaResult.tokensUsed || 0) + (antarResult.tokensUsed || 0);

  // Build empty defaults for whichever side failed
  const maha = mahaResult.data || {} as any;
  const antar = antarResult.data || {} as any;

  const merged: DashaPrediction = {
    overview: maha.overview || "",
    vimshottariSystem: maha.vimshottariSystem || "",
    birthNakshatra: maha.birthNakshatra || { name: "", lord: "", startingDasha: "", balance: "" },
    currentMahadasha: maha.currentMahadasha || { planet: "", startDate: "", endDate: "", planetSignificance: "", interpretation: "", majorThemes: [], opportunities: [], challenges: [], advice: "" },
    currentAntardasha: antar.currentAntardasha || { planet: "", startDate: "", endDate: "", interpretation: "", keyEvents: [], recommendations: [] },
    mahadashaPredictions: maha.mahadashaPredictions || [],
    antardashaPredictions: antar.antardashaPredictions || [],
    upcomingMahadashaAntardashaPredictions: antar.upcomingMahadashaAntardashaPredictions || [],
    upcomingDashas: maha.upcomingDashas || [],
    dashaSequence: maha.dashaSequence || [],
    yoginiDasha: maha.yoginiDasha || { currentYogini: { name: "", planet: "", years: 0, startDate: "", endDate: "", characteristics: "", lifeThemes: [], predictions: "" }, upcomingYoginis: [], yoginiSequence: [], systemExplanation: "" },
    currentTransitImpact: maha.currentTransitImpact || "",
    periodRecommendations: maha.periodRecommendations || [],
    spiritualGuidance: maha.spiritualGuidance || "",
  };

  return { success: true, data: merged, tokensUsed: totalTokens };
}
