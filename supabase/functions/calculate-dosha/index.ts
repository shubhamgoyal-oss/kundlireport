import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BirthInput {
  name?: string;
  date: string;
  time?: string;
  tz: string;
  lat: number;
  lon: number;
  unknownTime?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: BirthInput = await req.json();
    
    console.log('Calculating dosha for:', { 
      date: input.date, 
      time: input.time, 
      lat: input.lat, 
      lon: input.lon,
      tz: input.tz 
    });

    // Validate input
    if (!input.date || !input.lat || !input.lon || !input.tz) {
      throw new Error('Missing required fields: date, lat, lon, tz');
    }

    // Convert date/time to UTC
    const birthDateTime = input.time 
      ? new Date(`${input.date}T${input.time}:00`)
      : new Date(`${input.date}T12:00:00`); // Default to noon if unknown

    console.log('Birth date/time (local):', birthDateTime.toISOString());

    // Calculate Julian Day
    const jd = calculateJulianDay(birthDateTime);
    console.log('Julian Day:', jd);

    // Calculate Lahiri Ayanamsha
    const ayanamsha = getLahiriAyanamsha(jd);
    console.log('Lahiri Ayanamsha:', ayanamsha);

    // Calculate planetary positions
    const chartData = calculatePlanetaryPositions(jd, input.lat, input.lon, input.unknownTime || false);
    
    console.log('Chart calculated successfully');

    // Calculate doshas
    const doshaResults = calculateAllDoshas(chartData);
    console.log('Dosha calculation complete:', doshaResults.summary);

    // Return complete results
    return new Response(
      JSON.stringify({
        success: true,
        summary: doshaResults.summary,
        details: doshaResults.details,
        chart: chartData,
        metadata: {
          ayanamsha: 'Lahiri',
          system: 'Sidereal',
          calculationUTC: new Date().toISOString(),
          jd: jd,
        },
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error calculating dosha:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Helper functions

function calculateJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
            Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  return jdn + (hour - 12) / 24;
}

function getLahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return 23.85 + 0.013848 * T * 100;
}

function tropicalToSidereal(tropicalLon: number, ayanamsha: number): number {
  let siderealLon = tropicalLon - ayanamsha;
  while (siderealLon < 0) siderealLon += 360;
  while (siderealLon >= 360) siderealLon -= 360;
  return siderealLon;
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function getSignAndDegree(longitude: number) {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signNum = Math.floor(normalizedLon / 30);
  const deg = normalizedLon % 30;
  
  return {
    sign: ZODIAC_SIGNS[signNum],
    deg: deg,
    signNum: signNum
  };
}

function calculateHouseNumber(planetLon: number, ascendantLon: number): number {
  const ascSign = Math.floor(ascendantLon / 30);
  const planetSign = Math.floor(planetLon / 30);
  
  let house = planetSign - ascSign + 1;
  while (house <= 0) house += 12;
  while (house > 12) house -= 12;
  
  return house;
}

function calculatePlanetaryPositions(jd: number, lat: number, lon: number, unknownTime: boolean) {
  const ayanamsha = getLahiriAyanamsha(jd);
  const T = (jd - 2451545.0) / 36525;
  
  // Calculate tropical positions
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
  
  let ascendantSidereal = 0;
  let ascInfo = { sign: 'Aries', deg: 0, signNum: 0 };
  
  // Only calculate ascendant if birth time is known
  if (!unknownTime) {
    const ascendantTropical = calculateAscendant(jd, lat, lon);
    ascendantSidereal = tropicalToSidereal(ascendantTropical, ayanamsha);
    ascInfo = getSignAndDegree(ascendantSidereal);
  }
  
  // Convert to sidereal
  const grahas: any = {};
  
  const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  
  planetNames.forEach(name => {
    if (name === 'Ketu') {
      const rahuLon = tropicalToSidereal(positions.Rahu, ayanamsha);
      const ketuLon = (rahuLon + 180) % 360;
      const ketuInfo = getSignAndDegree(ketuLon);
      grahas.Ketu = {
        lon: ketuLon,
        sign: ketuInfo.sign,
        deg: ketuInfo.deg,
        house: unknownTime ? null : calculateHouseNumber(ketuLon, ascendantSidereal),
      };
    } else {
      const tropicalLon = positions[name];
      const siderealLon = tropicalToSidereal(tropicalLon, ayanamsha);
      const signInfo = getSignAndDegree(siderealLon);
      
      grahas[name] = {
        lon: siderealLon,
        sign: signInfo.sign,
        deg: signInfo.deg,
        house: unknownTime ? null : calculateHouseNumber(siderealLon, ascendantSidereal),
      };
    }
  });
  
  // Generate houses (whole sign system) - only if time is known
  const houses: any[] = [];
  if (!unknownTime) {
    for (let i = 0; i < 12; i++) {
      const houseSign = (ascInfo.signNum + i) % 12;
      houses.push({
        house: i + 1,
        sign: ZODIAC_SIGNS[houseSign],
        cusp: houseSign * 30,
      });
    }
  }
  
  return {
    grahas,
    ascendant: unknownTime ? null : {
      lon: ascendantSidereal,
      sign: ascInfo.sign,
      deg: ascInfo.deg,
      house: 1,
    },
    houses,
    ayanamsha,
  };
}

// Simplified planetary calculations (Meeus-based)

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
  const L = 125.04 - 1934.136 * T;
  return (L % 360 + 360) % 360;
}

function calculateAscendant(jd: number, lat: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
                  0.000387933 * T * T - T * T * T / 38710000;
  const lst = (theta0 + lon) % 360;
  const obliquity = 23.439291 - 0.0130042 * T;
  const ramc = lst;
  
  const tanLat = Math.tan(lat * Math.PI / 180);
  const tanObl = Math.tan(obliquity * Math.PI / 180);
  
  const asc = Math.atan2(
    Math.cos(ramc * Math.PI / 180), 
    -(tanLat * tanObl + Math.sin(ramc * Math.PI / 180))
  ) * 180 / Math.PI;
  
  return (asc + 360) % 360;
}

// Dosha calculation functions
function calculateAllDoshas(chart: any) {
  const mangal = calculateMangalDosha(chart);
  const kaalSarp = calculateKaalSarpDosha(chart);
  const pitra = calculatePitraDosha(chart);
  const sadeSati = calculateSadeSati(chart);

  return {
    summary: {
      mangal: mangal.canceled ? 'canceled' : (mangal.present ? 'present' : 'absent'),
      mangalSeverity: mangal.severity || undefined,
      kaalSarp: kaalSarp.present ? 'present' : 'absent',
      kaalSarpType: kaalSarp.type || undefined,
      pitra: pitra.present ? 'present' : 'absent',
      shaniSadeSati: sadeSati.active ? 'active' : 'inactive',
      shaniPhase: sadeSati.phase || undefined,
    },
    details: {
      mangal: {
        triggeredBy: mangal.triggeredBy,
        placements: mangal.placements,
        notes: mangal.notes,
        explanation: getMangalExplanation(mangal),
        remedies: getMangalRemedies(mangal),
      },
      kaalSarp: {
        triggeredBy: kaalSarp.triggeredBy,
        placements: kaalSarp.placements,
        notes: kaalSarp.notes,
        explanation: getKaalSarpExplanation(kaalSarp),
        remedies: getKaalSarpRemedies(),
      },
      pitra: {
        triggeredBy: pitra.triggeredBy,
        placements: pitra.placements,
        notes: pitra.notes,
        explanation: getPitraExplanation(pitra),
        remedies: getPitraRemedies(),
      },
      sadeSati: {
        triggeredBy: sadeSati.triggeredBy,
        placements: sadeSati.placements,
        notes: sadeSati.notes,
        explanation: getSadeSatiExplanation(sadeSati),
        remedies: getSadeSatiRemedies(),
      },
    },
  };
}

const MANGAL_DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];

function calculateMangalDosha(chart: any) {
  const mars = chart.grahas.Mars;
  const jupiter = chart.grahas.Jupiter;
  
  if (!mars || !chart.ascendant) {
    return {
      present: false,
      severity: null,
      canceled: false,
      triggeredBy: [],
      placements: [],
      notes: ['Birth time unknown - cannot calculate from Lagna']
    };
  }

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];
  let canceled = false;

  const marsHouseFromLagna = mars.house!;
  if (MANGAL_DOSHA_HOUSES.includes(marsHouseFromLagna)) {
    triggeredBy.push('Mars from Lagna');
    placements.push(`Mars in ${marsHouseFromLagna}th house from Lagna (${mars.sign} ${mars.deg.toFixed(1)}°)`);
  }

  const moon = chart.grahas.Moon;
  const marsHouseFromMoon = calculateHouseFrom(mars.lon, moon.lon);
  if (MANGAL_DOSHA_HOUSES.includes(marsHouseFromMoon)) {
    triggeredBy.push('Mars from Moon');
    placements.push(`Mars in ${marsHouseFromMoon}th house from Moon`);
  }

  if (mars.sign === 'Aries' || mars.sign === 'Scorpio' || mars.sign === 'Capricorn') {
    canceled = true;
    notes.push(`Mars is ${mars.sign === 'Capricorn' ? 'exalted' : 'in own sign'} (${mars.sign}) - Dosha canceled`);
  }

  const jupiterMarsDistance = Math.abs(jupiter.lon - mars.lon);
  if (jupiterMarsDistance < 8 || Math.abs(jupiterMarsDistance - 180) < 8) {
    canceled = true;
    notes.push('Jupiter aspects/conjuncts Mars - beneficial mitigation');
  }

  let severity: any = null;
  if (triggeredBy.length > 0 && !canceled) {
    severity = triggeredBy.length === 1 ? 'mild' : 'moderate';
    
    const aspectsLagna = Math.abs(mars.lon - chart.ascendant.lon);
    if (aspectsLagna < 8 || Math.abs(aspectsLagna - 90) < 8 || Math.abs(aspectsLagna - 180) < 8) {
      severity = 'strong';
      notes.push('Mars strongly aspects Lagna');
    }
  }

  return { present: triggeredBy.length > 0 && !canceled, severity, canceled, triggeredBy, placements, notes };
}

function calculateKaalSarpDosha(chart: any) {
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  
  const rahuLon = rahu.lon;
  const ketuLon = ketu.lon;
  
  const planets = [
    chart.grahas.Sun, chart.grahas.Moon, chart.grahas.Mars,
    chart.grahas.Mercury, chart.grahas.Jupiter, chart.grahas.Venus, chart.grahas.Saturn,
  ];

  let allPlanetsInArc = true;
  for (const planet of planets) {
    if (!isInRahuKetuArc(planet.lon, rahuLon, ketuLon)) {
      allPlanetsInArc = false;
      break;
    }
  }

  const KAAL_SARP_TYPES = ['Anant', 'Kulik', 'Vasuki', 'Shankhapal', 'Padam', 'Mahapadma',
    'Takshak', 'Karkotak', 'Shankhachur', 'Ghatak', 'Vishdhar', 'Sheshnag'];

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  let type: string | null = null;

  if (allPlanetsInArc) {
    triggeredBy.push('All planets between Rahu and Ketu');
    if (rahu.house) {
      type = KAAL_SARP_TYPES[rahu.house - 1];
      placements.push(`Rahu in ${rahu.house}th house (${rahu.sign}), Type: ${type}`);
    }
  }

  return { present: allPlanetsInArc, type, triggeredBy, placements, notes: [] };
}

function calculatePitraDosha(chart: any) {
  const triggeredBy: string[] = [];
  const placements: string[] = [];

  const sun = chart.grahas.Sun;
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  const saturn = chart.grahas.Saturn;

  if (rahu.house === 9) {
    triggeredBy.push('Rahu in 9th house');
    placements.push(`Rahu in 9th house (${rahu.sign})`);
  }
  if (ketu.house === 9) {
    triggeredBy.push('Ketu in 9th house');
    placements.push(`Ketu in 9th house (${ketu.sign})`);
  }

  const sunRahuDist = Math.abs(sun.lon - rahu.lon);
  if (sunRahuDist < 8 || sunRahuDist > 352) {
    triggeredBy.push('Sun conjunct Rahu');
    placements.push(`Sun conjunct Rahu`);
  }

  const sunKetuDist = Math.abs(sun.lon - ketu.lon);
  if (sunKetuDist < 8 || sunKetuDist > 352) {
    triggeredBy.push('Sun conjunct Ketu');
    placements.push(`Sun conjunct Ketu`);
  }

  const sunSaturnDist = Math.abs(sun.lon - saturn.lon);
  if (Math.abs(sunSaturnDist - 180) < 6 || sunSaturnDist < 6) {
    triggeredBy.push('Sun aspected by Saturn');
    placements.push(`Sun-Saturn aspect`);
  }

  return { present: triggeredBy.length > 0, triggeredBy, placements, notes: [] };
}

function calculateSadeSati(chart: any) {
  const moonSign = Math.floor(chart.grahas.Moon.lon / 30);
  const saturnSign = Math.floor(chart.grahas.Saturn.lon / 30);
  
  let phase: any = null;
  let active = false;
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const diff = (saturnSign - moonSign + 12) % 12;
  
  if (diff === 11) {
    active = true;
    phase = 1;
    triggeredBy.push('Saturn transiting 12th from Moon');
    notes.push('Phase 1: Rising phase');
  } else if (diff === 0) {
    active = true;
    phase = 2;
    triggeredBy.push('Saturn over Moon sign');
    notes.push('Phase 2: Peak phase');
  } else if (diff === 1) {
    active = true;
    phase = 3;
    triggeredBy.push('Saturn transiting 2nd from Moon');
    notes.push('Phase 3: Setting phase');
  }

  return { active, phase, triggeredBy, placements, notes };
}

function calculateHouseFrom(planetLon: number, refLon: number): number {
  const refSign = Math.floor(refLon / 30);
  const planetSign = Math.floor(planetLon / 30);
  let house = planetSign - refSign + 1;
  while (house <= 0) house += 12;
  while (house > 12) house -= 12;
  return house;
}

function isInRahuKetuArc(planetLon: number, rahuLon: number, ketuLon: number): boolean {
  const normalizedPlanet = ((planetLon % 360) + 360) % 360;
  const normalizedRahu = ((rahuLon % 360) + 360) % 360;
  const normalizedKetu = ((ketuLon % 360) + 360) % 360;
  
  if (normalizedRahu < normalizedKetu) {
    return normalizedPlanet >= normalizedRahu && normalizedPlanet <= normalizedKetu;
  } else {
    return normalizedPlanet >= normalizedRahu || normalizedPlanet <= normalizedKetu;
  }
}

// Explanations and remedies
function getMangalExplanation(m: any): string {
  if (!m.present) return 'No Mangal Dosha detected.';
  if (m.canceled) return `Mangal Dosha canceled: ${m.notes.join(', ')}`;
  return `Mangal Dosha (${m.severity}) detected in ${m.triggeredBy.join(' and ')}.`;
}

function getKaalSarpExplanation(k: any): string {
  if (!k.present) return 'No Kaal Sarp Dosha detected.';
  return `Kaal Sarp Dosha (${k.type || 'Unknown'} type) is present.`;
}

function getPitraExplanation(p: any): string {
  if (!p.present) return 'No Pitra Dosha detected.';
  return `Pitra Dosha indicators: ${p.triggeredBy.join(', ')}`;
}

function getSadeSatiExplanation(s: any): string {
  if (!s.active) return 'Not in Sade Sati period.';
  return `Sade Sati active (Phase ${s.phase}): ${s.notes[0]}`;
}

function getMangalRemedies(m: any): string[] {
  if (!m.present) return [];
  return ['Recite Hanuman Chalisa', 'Fast on Tuesdays', 'Donate red items'];
}

function getKaalSarpRemedies(): string[] {
  return ['Visit Trimbakeshwar temple', 'Recite Maha Mrityunjaya Mantra', 'Feed stray dogs'];
}

function getPitraRemedies(): string[] {
  return ['Perform Shraddha ceremony', 'Feed brahmins on amavasya', 'Recite Pitra Gayatri'];
}

function getSadeSatiRemedies(): string[] {
  return ['Recite Shani mantra', 'Light mustard oil lamp on Saturdays', 'Donate black items'];
}
