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
  severity: "severe" | "moderate" | "mild" | null;
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
      severity: null,
      type: null,
      orientation: null,
      reasons: ["Missing Rahu or Ketu position"],
      debug: {}
    };
  }

  const R = rahu.deg;
  const K = ketu.deg; // Use actual Ketu position, not R+180
  
  // Classical 7 planets
  const classicalPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const placements: any[] = [];
  let insideRahuToKetu = 0;  // Count in Rahu→Ketu arc
  let insideKetuToRahu = 0;  // Count in Ketu→Rahu arc

  for (const name of classicalPlanets) {
    const planet = getPlanet(kundli, name);
    if (!planet) continue;

    // Check which arc the planet falls in
    const inRahuToKetu = isBetweenOnArc(planet.deg, R, K, true);
    const inKetuToRahu = !inRahuToKetu; // If not in R→K, must be in K→R

    placements.push({
      name,
      deg: planet.deg,
      inRahuToKetu,
      inKetuToRahu
    });

    if (inRahuToKetu) {
      insideRahuToKetu++;
    } else {
      insideKetuToRahu++;
    }
  }

  // Determine which arc has more planets hemmed
  const maxInOneArc = Math.max(insideRahuToKetu, insideKetuToRahu);
  const dominantArc = insideRahuToKetu >= insideKetuToRahu ? "rahu_to_ketu" : "ketu_to_rahu";
  const orientation = dominantArc === "rahu_to_ketu" ? "ascending" : "descending";

  // Kaal Sarpa Dosha Definition with Severity:
  // Purna (Full): ALL 7 planets in one arc = SEVERE
  // Ardh: 6 planets in one arc = MODERATE  
  // Anshik: 5 planets in one arc = MILD
  // Absent: 4 or fewer planets in one arc
  let status: "present_full" | "present_partial" | "absent";
  let severity: "severe" | "moderate" | "mild" | null = null;
  let reasons: string[] = [];

  if (maxInOneArc === 7) {
    status = "present_full";
    severity = "severe";
    reasons.push(`All 7 classical planets within ${dominantArc === "rahu_to_ketu" ? "Rahu→Ketu" : "Ketu→Rahu"} arc (Purna Kaal Sarp - Severe)`);
  } else if (maxInOneArc === 6) {
    status = "present_partial";
    severity = "moderate";
    const outsideArc = dominantArc === "rahu_to_ketu" ? "Ketu→Rahu" : "Rahu→Ketu";
    const outsidePlanet = placements.find(p => dominantArc === "rahu_to_ketu" ? !p.inRahuToKetu : !p.inKetuToRahu);
    reasons.push(`6 planets in ${dominantArc === "rahu_to_ketu" ? "Rahu→Ketu" : "Ketu→Rahu"} arc, ${outsidePlanet?.name || '1 planet'} outside - Ardh Kaal Sarp (Moderate)`);
  } else if (maxInOneArc === 5) {
    status = "present_partial";
    severity = "mild";
    const outsidePlanets = placements.filter(p => dominantArc === "rahu_to_ketu" ? !p.inRahuToKetu : !p.inKetuToRahu).map(p => p.name);
    reasons.push(`5 planets in ${dominantArc === "rahu_to_ketu" ? "Rahu→Ketu" : "Ketu→Rahu"} arc, ${outsidePlanets.join(' and ')} outside - Anshik Kaal Sarp (Mild)`);
  } else {
    status = "absent";
    severity = null;
    reasons.push(`Only ${maxInOneArc} planet(s) in one arc (need 5+ for Kaal Sarp). Planets split: ${insideRahuToKetu} in Rahu→Ketu, ${insideKetuToRahu} in Ketu→Rahu`);
  }

  // Variant name by Rahu house
  const variants = [
    "Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma",
    "Takshak", "Karkotak", "Shankhachur", "Ghatak", "Vishdhar", "Sheshnag"
  ];
  const variantType = status !== "absent" ? variants[rahu.house - 1] : null;

  return {
    status,
    severity,
    type: variantType,
    orientation: status !== "absent" ? orientation : null,
    reasons,
    debug: {
      rahuDeg: R,
      ketuDeg: K,
      placements,
      insideRahuToKetu,
      insideKetuToRahu,
      maxInOneArc,
      dominantArc
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
  severity: "severe" | "moderate" | "mild" | null;
  nullified: boolean;
  reasons: string[];
  debug: any;
}

export function calculateMangalDoshaAlgorithmic(kundli: SeerKundli): MangalDoshaResult {
  const mars = getPlanet(kundli, "Mars");
  const moon = getPlanet(kundli, "Moon");
  const venus = getPlanet(kundli, "Venus");
  const jupiter = getPlanet(kundli, "Jupiter");
  const asc = kundli.asc;

  if (!mars) {
    return {
      sources: { fromAsc: false, fromMoon: false, fromVenus: false },
      status: "absent",
      severity: null,
      nullified: false,
      reasons: ["Mars position not available"],
      debug: {}
    };
  }

  // Classical Mangal Dosha trigger houses: 1, 2, 4, 7, 8, 12
  const triggerHouses = [1, 2, 4, 7, 8, 12];
  const reasons: string[] = [];
  const nullifications: string[] = [];
  
  // Check presence from Ascendant, Moon, and Venus
  const sources = {
    fromAsc: false,
    fromMoon: false,
    fromVenus: false
  };

  // House from Ascendant
  if (triggerHouses.includes(mars.house)) {
    sources.fromAsc = true;
    reasons.push(`Mars in H${mars.house} from Ascendant`);
  }

  // House from Moon
  if (moon) {
    const marsHouseFromMoon = ((mars.signIdx - moon.signIdx + 12) % 12) + 1;
    if (triggerHouses.includes(marsHouseFromMoon)) {
      sources.fromMoon = true;
      reasons.push(`Mars in H${marsHouseFromMoon} from Moon`);
    }
  }

  // House from Venus
  if (venus) {
    const marsHouseFromVenus = ((mars.signIdx - venus.signIdx + 12) % 12) + 1;
    if (triggerHouses.includes(marsHouseFromVenus)) {
      sources.fromVenus = true;
      reasons.push(`Mars in H${marsHouseFromVenus} from Venus`);
    }
  }

  const isPresent = sources.fromAsc || sources.fromMoon || sources.fromVenus;
  
  if (!isPresent) {
    return {
      sources,
      status: "absent",
      severity: null,
      nullified: false,
      reasons: ["Mars not in trigger houses (1,2,4,7,8,12) from Ascendant, Moon, or Venus"],
      debug: { marsHouse: mars.house, marsSign: mars.sign }
    };
  }

  // Check nullification rules
  let nullified = false;

  // Rule 1: Own/Exaltation sign (Aries, Scorpio, Capricorn)
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

  if (exceptions[mars.house]?.includes(mars.sign)) {
    nullified = true;
    nullifications.push(`H${mars.house} exception: Mars in ${mars.sign}`);
  }

  // Rule 3: Jupiter protection - conjunction
  if (jupiter) {
    const marsJupDelta = degDelta(mars.deg, jupiter.deg);
    if (marsJupDelta <= CONJ_ORB) {
      nullified = true;
      nullifications.push(`Jupiter conjunction (${marsJupDelta.toFixed(1)}° orb)`);
    }

    // Jupiter aspect - 5th, 7th, 9th sign from Mars
    const jupHouseFromMars = ((jupiter.signIdx - mars.signIdx + 12) % 12) + 1;
    if ([5, 7, 9].includes(jupHouseFromMars)) {
      nullified = true;
      nullifications.push(`Jupiter in ${jupHouseFromMars}th sign from Mars`);
    }
  }

  // Rule 4: Venus softening - conjunction
  if (venus) {
    const marsVenusDelta = degDelta(mars.deg, venus.deg);
    if (marsVenusDelta <= CONJ_ORB) {
      nullified = true;
      nullifications.push(`Venus conjunction (${marsVenusDelta.toFixed(1)}° orb)`);
    }
  }

  const status = nullified ? "present (nullified)" : "present";
  
  // Severity based on source count and nullification
  // Multiple sources = severe, single source = moderate, nullified = mild
  let severity: "severe" | "moderate" | "mild" | null = null;
  const activeSourceCount = [sources.fromAsc, sources.fromMoon, sources.fromVenus].filter(Boolean).length;
  
  if (nullified) {
    severity = "mild";
  } else if (activeSourceCount >= 2) {
    severity = "severe";
  } else {
    severity = "moderate";
  }

  return {
    sources,
    status,
    severity,
    nullified,
    reasons: [...reasons, ...nullifications.map(n => `Nullified: ${n}`)],
    debug: {
      marsHouse: mars.house,
      marsSign: mars.sign,
      marsDeg: mars.deg,
      moonSign: moon?.sign,
      venusSign: venus?.sign,
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
  severity: "severe" | "moderate" | "mild" | null;
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
      severity: null,
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
      severity: null,
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
    // Saturn is 1 sign before Moon (12th from Moon = Rising phase) - MILD
    return {
      active: true,
      phase: "rising",
      severity: "mild",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Rising phase - Mild)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  } else if (saturnRelToMoon === 0) {
    // Saturn same sign as Moon (Peak phase) - SEVERE
    return {
      active: true,
      phase: "peak",
      severity: "severe",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Peak phase - Severe)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  } else if (saturnRelToMoon === 1) {
    // Saturn is 1 sign after Moon (Setting phase) - MODERATE
    return {
      active: true,
      phase: "setting",
      severity: "moderate",
      source: "current_saturn",
      window: null,
      reasons: [`Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign} (Setting phase - Moderate)`],
      debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
    };
  }

  return {
    active: false,
    phase: null,
    severity: null,
    source: "current_saturn",
    window: null,
    reasons: [`Saturn not in Sade Sati position. Saturn in ${CURRENT_SATURN_SIGN}, Moon in ${moon.sign}`],
    debug: { saturnSign: CURRENT_SATURN_SIGN, moonSign: moon.sign, saturnRelToMoon }
  };
}
