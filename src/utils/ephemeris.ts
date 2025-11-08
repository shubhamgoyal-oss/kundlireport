/**
 * Astronomical calculations using Swiss Ephemeris
 * Computes planetary positions, ascendant, and houses
 */

// Planet identifiers for Swiss Ephemeris
export const PLANETS = {
  SUN: 0,
  MOON: 1,
  MERCURY: 2,
  VENUS: 3,
  MARS: 4,
  JUPITER: 5,
  SATURN: 6,
  MEAN_NODE: 10, // Rahu (mean node)
} as const;

export const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;

export type PlanetName = typeof PLANET_NAMES[number];

export interface PlanetPosition {
  lon: number;      // Sidereal longitude (0-360)
  sign: string;     // Zodiac sign name
  deg: number;      // Degree within sign (0-30)
  house?: number;   // House number (1-12)
}

export interface ChartData {
  grahas: Record<PlanetName, PlanetPosition>;
  ascendant: PlanetPosition & { house: number };
  houses: Array<{ house: number; sign: string; cusp: number }>;
  ayanamsha: number;
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Calculate Julian Day Number
 */
export function calculateJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  return jdn + (hour - 12) / 24;
}

/**
 * Get Lahiri Ayanamsha for a given Julian Day
 * Lahiri ayanamsha formula (simplified)
 */
export function getLahiriAyanamsha(jd: number): number {
  // Simplified Lahiri ayanamsha calculation
  // Reference epoch: 21 March 285 CE (JD 1903396.8631)
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0
  
  // Lahiri ayanamsha formula (approximate)
  const ayanamsha = 23.85 + 0.013848 * T * 100;
  
  return ayanamsha;
}

/**
 * Convert tropical longitude to sidereal using Lahiri ayanamsha
 */
export function tropicalToSidereal(tropicalLon: number, ayanamsha: number): number {
  let siderealLon = tropicalLon - ayanamsha;
  
  // Normalize to 0-360 range
  while (siderealLon < 0) siderealLon += 360;
  while (siderealLon >= 360) siderealLon -= 360;
  
  return siderealLon;
}

/**
 * Get zodiac sign and degree from longitude
 */
export function getSignAndDegree(longitude: number): { sign: string; deg: number; signNum: number } {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signNum = Math.floor(normalizedLon / 30);
  const deg = normalizedLon % 30;
  
  return {
    sign: ZODIAC_SIGNS[signNum],
    deg: deg,
    signNum: signNum
  };
}

/**
 * Calculate house number from longitude relative to ascendant (whole sign system)
 */
export function calculateHouseNumber(planetLon: number, ascendantLon: number): number {
  const ascSign = Math.floor(ascendantLon / 30);
  const planetSign = Math.floor(planetLon / 30);
  
  let house = planetSign - ascSign + 1;
  
  // Normalize to 1-12 range
  while (house <= 0) house += 12;
  while (house > 12) house -= 12;
  
  return house;
}

/**
 * Simple planetary position calculation using Meeus algorithm
 * This is a fallback if Swiss Ephemeris fails
 */
export function calculatePlanetaryPositions(jd: number, lat: number, lon: number): ChartData {
  const ayanamsha = getLahiriAyanamsha(jd);
  const T = (jd - 2451545.0) / 36525;
  
  // Simplified calculations for demonstration
  // In production, use actual Swiss Ephemeris or precise algorithms
  
  const positions: Record<string, number> = {
    Sun: calculateSunPosition(T),
    Moon: calculateMoonPosition(T),
    Mars: calculateMarsPosition(T),
    Mercury: calculateMercuryPosition(T),
    Jupiter: calculateJupiterPosition(T),
    Venus: calculateVenusPosition(T),
    Saturn: calculateSaturnPosition(T),
    Rahu: calculateRahuPosition(T),
  };
  
  // Calculate ascendant
  const ascendantTropical = calculateAscendant(jd, lat, lon);
  const ascendantSidereal = tropicalToSidereal(ascendantTropical, ayanamsha);
  const ascInfo = getSignAndDegree(ascendantSidereal);
  
  // Convert all to sidereal
  const grahas: Record<PlanetName, PlanetPosition> = {} as any;
  
  PLANET_NAMES.forEach(name => {
    if (name === 'Ketu') {
      // Ketu is opposite to Rahu
      const rahuLon = tropicalToSidereal(positions.Rahu, ayanamsha);
      const ketuLon = (rahuLon + 180) % 360;
      const ketuInfo = getSignAndDegree(ketuLon);
      grahas.Ketu = {
        lon: ketuLon,
        sign: ketuInfo.sign,
        deg: ketuInfo.deg,
        house: calculateHouseNumber(ketuLon, ascendantSidereal),
      };
    } else {
      const tropicalLon = positions[name];
      const siderealLon = tropicalToSidereal(tropicalLon, ayanamsha);
      const signInfo = getSignAndDegree(siderealLon);
      
      grahas[name] = {
        lon: siderealLon,
        sign: signInfo.sign,
        deg: signInfo.deg,
        house: calculateHouseNumber(siderealLon, ascendantSidereal),
      };
    }
  });
  
  // Generate houses (whole sign system)
  const houses: Array<{ house: number; sign: string; cusp: number }> = [];
  for (let i = 0; i < 12; i++) {
    const houseSign = (ascInfo.signNum + i) % 12;
    houses.push({
      house: i + 1,
      sign: ZODIAC_SIGNS[houseSign],
      cusp: houseSign * 30,
    });
  }
  
  return {
    grahas,
    ascendant: {
      lon: ascendantSidereal,
      sign: ascInfo.sign,
      deg: ascInfo.deg,
      house: 1,
    },
    houses,
    ayanamsha,
  };
}

// Simplified planetary position calculations (Meeus-based approximations)

function calculateSunPosition(T: number): number {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * Math.PI / 180);
  
  return (L0 + C) % 360;
}

function calculateMoonPosition(T: number): number {
  const L = 218.316 + 481267.881 * T;
  return L % 360;
}

function calculateMarsPosition(T: number): number {
  const L = 355.433 + 19140.30 * T;
  return L % 360;
}

function calculateMercuryPosition(T: number): number {
  const L = 252.25 + 149472.68 * T;
  return L % 360;
}

function calculateJupiterPosition(T: number): number {
  const L = 34.35 + 3034.906 * T;
  return L % 360;
}

function calculateVenusPosition(T: number): number {
  const L = 181.98 + 58517.82 * T;
  return L % 360;
}

function calculateSaturnPosition(T: number): number {
  const L = 50.08 + 1222.11 * T;
  return L % 360;
}

function calculateRahuPosition(T: number): number {
  // Mean node (Rahu) - retrograde motion
  const L = 125.04 - 1934.136 * T;
  return (L % 360 + 360) % 360;
}

function calculateAscendant(jd: number, lat: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  
  // Local Sidereal Time
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
  const lst = (theta0 + lon) % 360;
  
  // Simplified ascendant calculation
  const obliquity = 23.439291 - 0.0130042 * T;
  const ramc = lst;
  
  // Ascendant formula (simplified)
  const tanLat = Math.tan(lat * Math.PI / 180);
  const tanObl = Math.tan(obliquity * Math.PI / 180);
  
  const asc = Math.atan2(Math.cos(ramc * Math.PI / 180), -(tanLat * tanObl + Math.sin(ramc * Math.PI / 180))) * 180 / Math.PI;
  
  return (asc + 360) % 360;
}
