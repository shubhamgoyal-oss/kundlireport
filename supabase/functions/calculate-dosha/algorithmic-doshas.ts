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

  // Determine status
  let status: "present_full" | "present_partial" | "absent";
  let reasons: string[] = [];

  if (insideCount === 7) {
    status = "present_full";
    reasons.push("All 7 classical planets within Rahu→Ketu arc");
  } else if (insideCount === 6 && boundaryPlanets.length === 1) {
    status = "present_partial";
    reasons.push(`6 planets inside, ${boundaryPlanets[0].name} on boundary (${boundaryPlanets[0].minDist.toFixed(1)}° from node)`);
  } else {
    status = "absent";
    const outsideCount = 7 - insideCount;
    reasons.push(`${outsideCount} planet(s) outside Rahu→Ketu arc (>2° from nodes)`);
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
  const moon = getPlanet(kundli, "Moon");
  const venus = getPlanet(kundli, "Venus");
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

  const triggerHouses = [1, 2, 4, 7, 8, 12];
  const reasons: string[] = [];
  const nullifications: string[] = [];
  
  // Check presence from each reference
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
    const houseFromMoon = ((mars.signIdx - moon.signIdx + 12) % 12) + 1;
    if (triggerHouses.includes(houseFromMoon)) {
      sources.fromMoon = true;
      reasons.push(`Mars in H${houseFromMoon} from Moon`);
    }
  }

  // House from Venus
  if (venus) {
    const houseFromVenus = ((mars.signIdx - venus.signIdx + 12) % 12) + 1;
    if (triggerHouses.includes(houseFromVenus)) {
      sources.fromVenus = true;
      reasons.push(`Mars in H${houseFromVenus} from Venus`);
    }
  }

  const isPresent = sources.fromAsc || sources.fromMoon || sources.fromVenus;
  
  if (!isPresent) {
    return {
      sources,
      status: "absent",
      nullified: false,
      reasons: ["Mars not in trigger houses (1,2,4,7,8,12) from any reference"],
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

  // Rule 4: Venus softening
  if (venus) {
    const marsVenDelta = degDelta(mars.deg, venus.deg);
    if (marsVenDelta <= CONJ_ORB) {
      nullified = true;
      nullifications.push(`Venus conjunction (${marsVenDelta.toFixed(1)}° orb)`);
    }
  }

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

  // Try to use shadhe_sati_dosha events first (PREFERRED METHOD)
  const vedic = seerResponse?.vedic_horoscope || seerResponse?.data?.vedic_horoscope;
  const events = vedic?.shadhe_sati_dosha;

  if (events && Array.isArray(events) && events.length > 0) {
    // Use events-based calculation
    const now = Date.now();
    const windows: any[] = [];
    
    let currentWindow: any = null;
    
    for (const event of events) {
      const eventTime = parseInt(event.millisecond);
      const eventDate = new Date(eventTime).toISOString().split('T')[0];
      
      if (event.type?.includes("RISING_START")) {
        currentWindow = { phase: "rising", start: eventDate, startTime: eventTime };
      } else if (event.type?.includes("PEAK_START")) {
        if (currentWindow) {
          currentWindow.end = eventDate;
          windows.push(currentWindow);
        }
        currentWindow = { phase: "peak", start: eventDate, startTime: eventTime };
      } else if (event.type?.includes("SETTING_START")) {
        if (currentWindow) {
          currentWindow.end = eventDate;
          windows.push(currentWindow);
        }
        currentWindow = { phase: "setting", start: eventDate, startTime: eventTime };
      } else if (event.type?.includes("SETTING_END")) {
        if (currentWindow) {
          currentWindow.end = eventDate;
          currentWindow.endTime = eventTime;
          windows.push(currentWindow);
          currentWindow = null;
        }
      }
    }

    // Check which window contains today
    for (const window of windows) {
      if (window.startTime <= now && (!window.endTime || window.endTime >= now)) {
        return {
          active: true,
          phase: window.phase,
          source: "events",
          window: { start: window.start, end: window.end || "ongoing" },
          reasons: [`Currently in ${window.phase} phase of Sade Sati`],
          debug: { windows, now, moonSign: moon.sign }
        };
      }
    }

    // Not in any window - use events as authoritative source
    return {
      active: false,
      phase: null,
      source: "events",
      window: null,
      reasons: ["Not currently in Sade Sati period according to event timeline"],
      debug: { windows, moonSign: moon.sign }
    };
  }

  // CRITICAL: Do NOT use natal Saturn position as fallback
  // Sade Sati requires CURRENT transiting Saturn position, which we don't have
  // If events are not available, mark as inactive rather than give wrong answer
  return {
    active: false,
    phase: null,
    source: "current_saturn",
    window: null,
    reasons: ["Sade Sati event data not available from API; cannot determine current transit status"],
    debug: { moonSign: moon.sign, note: "Natal Saturn position cannot be used for transit calculation" }
  };
}
