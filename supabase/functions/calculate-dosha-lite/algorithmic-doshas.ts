// Algorithmic Dosha Calculations from Seer Planet Positions
// DO NOT trust Seer dosha flags - compute from planetary positions only

import { SeerKundli, degDelta } from "./seer-adapter.ts";

// Constants
const CONJ_ORB = 8;
const BOUNDARY_TOL = 2;

// Sign mappings
const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

// CURRENT transiting Saturn sign (sidereal) - UPDATE when Saturn changes sign
const CURRENT_SATURN_SIGN = "Pisces";

// Helper: Check if point p is between start and end on forward arc (modulo 360)
function isBetweenOnArc(p: number, start: number, end: number, inclusive = true): boolean {
  const dist = (p - start + 360) % 360;
  const arcLength = (end - start + 360) % 360;
  return inclusive ? dist <= arcLength : dist < arcLength;
}

// Helper: Get planet by name
function getPlanet(kundli: SeerKundli, name: string) {
  return kundli.planets.find(p => p.name === name);
}

// ============================================================================
// 1. KAAL SARPA DOSHA
// ============================================================================

export interface KaalSarpaResult {
  status: "present_full" | "present_partial" | "absent";
  type: string | null;
  orientation: "ascending" | "descending" | null;
  reasons: string[];
  debug: any;
}

export function calculateKaalSarpaDoshaAlgorithmic(kundli: SeerKundli): KaalSarpaResult {
  const rahu = getPlanet(kundli, "Rahu");
  const ketu = getPlanet(kundli, "Ketu");
  
  if (!rahu || !ketu) {
    return {
      status: "absent",
      type: null,
      orientation: null,
      reasons: ["Missing Rahu or Ketu position"],
      debug: {}
    };
  }

  const R = rahu.deg;
  const K = (R + 180) % 360;
  
  // Classical 7 planets
  const classicalPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const placements: any[] = [];
  let insideCount = 0;
  let boundaryPlanets: any[] = [];

  for (const name of classicalPlanets) {
    const planet = getPlanet(kundli, name);
    if (!planet) continue;

    const inside = isBetweenOnArc(planet.deg, R, K, true);
    const distToR = degDelta(planet.deg, R);
    const distToK = degDelta(planet.deg, K);
    const minDist = Math.min(distToR, distToK);

    placements.push({
      name,
      deg: planet.deg,
      inside,
      distToR,
      distToK,
      minDist
    });

    if (inside) {
      insideCount++;
    } else if (minDist <= BOUNDARY_TOL) {
      boundaryPlanets.push({ name, minDist });
    }
  }

  // Determine status based on traditional Vedic astrology definitions:
  // Purna (Full): All 7 planets inside
  // Ardh/Anshik (Partial): 5-6 planets inside (most astrologers accept this)
  // Absent: 4 or fewer planets inside
  let status: "present_full" | "present_partial" | "absent";
  let reasons: string[] = [];
  const outsideCount = 7 - insideCount;

  if (insideCount === 7) {
    status = "present_full";
    reasons.push("All 7 classical planets within Rahu→Ketu arc (Purna Kaal Sarp)");
  } else if (insideCount === 6) {
    status = "present_partial";
    const outsidePlanet = placements.find(p => !p.inside);
    if (boundaryPlanets.length > 0) {
      reasons.push(`6 planets inside, ${boundaryPlanets[0].name} on boundary (${boundaryPlanets[0].minDist.toFixed(1)}° from node) - Ardh Kaal Sarp`);
    } else {
      reasons.push(`6 planets inside, ${outsidePlanet?.name || '1 planet'} outside - Ardh Kaal Sarp`);
    }
  } else if (insideCount === 5) {
    status = "present_partial";
    const outsidePlanets = placements.filter(p => !p.inside).map(p => p.name);
    reasons.push(`5 planets inside, ${outsidePlanets.join(' and ')} outside - Anshik Kaal Sarp`);
  } else {
    status = "absent";
    reasons.push(`Only ${insideCount} planet(s) within Rahu→Ketu arc (need 5+ for Kaal Sarp)`);
  }

  // Variant name by Rahu house
  const variants = [
    "Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma",
    "Takshak", "Karkotak", "Shankhachur", "Ghatak", "Vishdhar", "Sheshnag"
  ];
  const variantType = status !== "absent" ? variants[rahu.house - 1] : null;

  return {
    status,
    type: variantType,
    orientation: status !== "absent" ? "ascending" : null,
    reasons,
    debug: {
      rahuDeg: R,
      ketuDeg: K,
      placements,
      insideCount,
      boundaryPlanets
    }
  };
}

// ============================================================================
// 2. MANGAL DOSHA WITH NULLIFICATION
// ============================================================================

export interface MangalDoshaResult {
  sources: {
    fromAsc: boolean;
    fromMoon: boolean;
    fromVenus: boolean;
  };
  status: "absent" | "present" | "present (nullified)";
  nullified: boolean;
  reasons: string[];
  debug: any;
}

export function calculateMangalDoshaAlgorithmic(kundli: SeerKundli): MangalDoshaResult {
  const mars = getPlanet(kundli, "Mars");
  const jupiter = getPlanet(kundli, "Jupiter");
  const asc = kundli.asc;

  if (!mars) {
    return {
      sources: { fromAsc: false, fromMoon: false, fromVenus: false },
      status: "absent",
      nullified: false,
      reasons: ["Mars position not available"],
      debug: {}
    };
  }

  // Traditional Mangal Dosha: only houses 1, 4, 7, 8 from Lagna (not 2 and 12)
  const triggerHouses = [1, 4, 7, 8];
  const reasons: string[] = [];
  const nullifications: string[] = [];
  
  // Check presence ONLY from Ascendant (as per Lagna)
  const sources = {
    fromAsc: false,
    fromMoon: false,
    fromVenus: false
  };

  // House from Ascendant ONLY
  if (triggerHouses.includes(mars.house)) {
    sources.fromAsc = true;
    reasons.push(`Mars in H${mars.house} from Ascendant`);
  }

  const isPresent = sources.fromAsc;
  
  if (!isPresent) {
    return {
      sources,
      status: "absent",
      nullified: false,
      reasons: ["Mars not in trigger houses (1,4,7,8) from Ascendant"],
      debug: { marsHouse: mars.house, marsSign: mars.sign }
    };
  }

  // Check nullification rules
  let nullified = false;

  // Rule 1: Own/Exaltation sign
  if (["Aries", "Scorpio", "Capricorn"].includes(mars.sign)) {
    nullified = true;
    nullifications.push(`Mars in ${mars.sign} (own/exalted sign)`);
  }

  // Rule 2: House-Sign exceptions
  const exceptions: Record<number, string[]> = {
    2: ["Gemini", "Virgo"],
    4: ["Aries", "Scorpio"],
    7: ["Cancer", "Capricorn"],
    8: ["Sagittarius", "Pisces"],
    12: ["Taurus", "Libra"]
  };

  if (sources.fromAsc && exceptions[mars.house]?.includes(mars.sign)) {
    nullified = true;
    nullifications.push(`H${mars.house} exception: Mars in ${mars.sign}`);
  }

  // Rule 3: Jupiter protection
  if (jupiter) {
    const marsJupDelta = degDelta(mars.deg, jupiter.deg);
    if (marsJupDelta <= CONJ_ORB) {
      nullified = true;
      nullifications.push(`Jupiter conjunction (${marsJupDelta.toFixed(1)}° orb)`);
    }

    // Whole-sign aspect (5th, 7th, 9th from Mars)
    const jupHouseFromMars = ((jupiter.signIdx - mars.signIdx + 12) % 12) + 1;
    if ([5, 7, 9].includes(jupHouseFromMars)) {
      nullified = true;
      nullifications.push(`Jupiter in ${jupHouseFromMars}th sign from Mars`);
    }
  }

  // Rule 4: Venus softening (removed - only checking from Lagna now)

  const status = nullified ? "present (nullified)" : "present";

  return {
    sources,
    status,
    nullified,
    reasons: [...reasons, ...nullifications.map(n => `Nullified: ${n}`)],
    debug: {
      marsHouse: mars.house,
      marsSign: mars.sign,
      marsDeg: mars.deg,
      nullificationRules: nullifications
    }
  };
}

// ============================================================================
// 3. SADE SATI (Transit-based)
// ============================================================================

export interface SadeSatiResult {
  active: boolean;
  phase: "rising" | "peak" | "setting" | null;
  source: "events" | "current_saturn";
  window: { start: string; end: string } | null;
  reasons: string[];
  debug: any;
}

export function calculateSadeSatiAlgorithmic(
  kundli: SeerKundli,
  seerResponse: any
): SadeSatiResult {
  const moon = getPlanet(kundli, "Moon");
  
  if (!moon) {
    return {
      active: false,
      phase: null,
      source: "current_saturn",
      window: null,
      reasons: ["Moon position not available"],
      debug: {}
    };
  }

  // Use CURRENT_SATURN_SIGN constant for transit calculation
  // Map sign name to index
  const currentSaturnIdx = SIGN_NAMES.indexOf(CURRENT_SATURN_SIGN);
  
  if (currentSaturnIdx === -1) {
    return {
      active: false,
      phase: null,
      source: "current_saturn",
      window: null,
      reasons: ["Invalid CURRENT_SATURN_SIGN configuration"],
      debug: { CURRENT_SATURN_SIGN }
    };
  }

  // Calculate Saturn's position relative to Moon
  // saturnRelToMoon = 0 means same sign (Peak)
  // saturnRelToMoon = 11 means Saturn 1 sign before Moon (Rising)
  // saturnRelToMoon = 1 means Saturn 1 sign after Moon (Setting)
  const saturnRelToMoon = (currentSaturnIdx - moon.signIdx + 12) % 12;
  
  console.log(`[SADE_SATI_DEBUG] Moon: ${moon.sign} (idx ${moon.signIdx}), Current Saturn: ${CURRENT_SATURN_SIGN} (idx ${currentSaturnIdx}), Relative: ${saturnRelToMoon}`);
  
  if (saturnRelToMoon === 11) {
    // Saturn is 1 sign before Moon (12th from Moon = Rising phase)
    return {
      active: true,
      phase: "rising",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Rising phase)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  } else if (saturnRelToMoon === 0) {
    // Saturn same sign as Moon (Peak phase)
    return {
      active: true,
      phase: "peak",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Peak phase)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  } else if (saturnRelToMoon === 1) {
    // Saturn is 1 sign after Moon (Setting phase)
    return {
      active: true,
      phase: "setting",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Setting phase)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  }

  return {
    active: false,
    phase: null,
    source: "current_saturn",
    window: null,
    reasons: [`Saturn not in Sade Sati position. Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign}`],
    debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
  };
}
