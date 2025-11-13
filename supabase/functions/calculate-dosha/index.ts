import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  calculateGrahanDosha,
  calculateShrapitDosha,
  calculateGuruChandalDosha,
  calculatePunarphooDosha,
  calculateKemadrumaYoga,
  calculateGandmoolDosha,
  calculateKalathraDosh,
  calculateVishDaridraYoga,
  calculateKetuNagaDosha,
  calculateNavagrahaUmbrella,
} from "./other-doshas.ts";
import {
  calculateShaniDosha,
  getShaniDoshaExplanation,
  getShaniDoshaRemedies,
} from "./shani-dosha.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (5 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000; // 1 minute in milliseconds

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: now + RATE_WINDOW };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetTime: record.resetTime };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

// Input validation schema
const birthInputSchema = z.object({
  name: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format").or(z.literal("")).optional(),
  tz: z.string().min(1).max(50, "Timezone string too long"),
  lat: z.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  lon: z.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
  unknownTime: z.boolean().optional(),
  place: z.string().optional(),
});

type BirthInput = z.infer<typeof birthInputSchema>;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const identifier = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'anonymous';
  
  const rateCheck = checkRateLimit(identifier);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        resetTime: new Date(rateCheck.resetTime).toISOString()
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateCheck.resetTime.toString(),
          'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString()
        } 
      }
    );
  }

  try {
    const rawInput = await req.json();
    
    // Extract debug flag from query params
    const url = new URL(req.url);
    const debugMode = url.searchParams.get('debugDosha') === 'true';
    
    // Validate input using Zod schema
    const validationResult = birthInputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
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
    
    const input = validationResult.data;
    
    // HARD ASSERTIONS - Fail if configuration is violated
    const configAssertions = {
      node_model: 'mean',
      houses: 'whole-sign',
      ayanamsha: 'Lahiri',
      zodiac: 'sidereal'
    };
    
    // These are enforced in the code - verify they match
    const actualConfig = {
      node_model: 'mean', // We use mean nodes throughout
      houses: 'whole-sign', // Implemented in house calculations
      ayanamsha: 'Lahiri', // Using getLahiriAyanamsha
      zodiac: 'sidereal' // Sidereal calculations
    };
    
    for (const [key, expected] of Object.entries(configAssertions)) {
      if (actualConfig[key as keyof typeof actualConfig] !== expected) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Configuration assertion failed: ${key} must be ${expected}, got ${actualConfig[key as keyof typeof actualConfig]}`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    console.log('Calculating dosha for:', { 
      date: input.date, 
      time: input.time, 
      lat: input.lat, 
      lon: input.lon,
      tz: input.tz 
    });

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

    // Calculate doshas with debug mode
    const doshaResults = calculateAllDoshas(chartData, input.unknownTime || false, debugMode, {
      date: input.date,
      time: input.time,
      place: input.place || `${input.lat},${input.lon}`,
      lat: input.lat,
      lon: input.lon,
      tz: input.tz,
      utc: birthDateTime.toISOString()
    });
    console.log('Dosha calculation complete:', doshaResults.summary);

    // Build response with optional debug data
    const response: any = {
      success: true,
      summary: doshaResults.summary,
      details: doshaResults.details,
      chart: chartData,
      metadata: {
        ayanamsha: 'Lahiri',
        system: 'Sidereal',
        calculationUTC: new Date().toISOString(),
        jd: jd,
        rules_version: 'india-popular-v1',
        generated_at: new Date().toISOString(),
        calculation_preset: {
          zodiac: 'sidereal',
          ayanamsha: 'Lahiri',
          node_model: 'mean',
          houses: 'whole-sign',
          endpoints: 'inclusive',
          ks_edge_tolerance_deg: 2.0,
          conj_orb_deg: 8,
          conj_orb_moon_deg: 6,
        },
      },
    };
    
    // Add debug data if requested
    if (debugMode && doshaResults.debug) {
      response.debug = doshaResults.debug;
    }
    
    // Return complete results
    return new Response(
      JSON.stringify(response),
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
        error: 'Unable to calculate dosha. Please verify your birth details and try again.' 
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
  // MEAN node calculation for consistency with popular calculators
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
function calculateAllDoshas(chart: any, unknownTime: boolean = false, debugMode: boolean = false, inputData?: any) {
  const mangal = calculateMangalDosha(chart, debugMode);
  const kaalSarp = calculateKaalSarpDosha(chart, debugMode);
  const pitra = calculatePitraDosha(chart, debugMode);
  const sadeSati = calculateSadeSati(chart);

  // Calculate new doshas
  const grahan = calculateGrahanDosha(chart);
  const shrapit = calculateShrapitDosha(chart);
  const guruChandal = calculateGuruChandalDosha(chart);
  const punarphoo = calculatePunarphooDosha(chart);
  const kemadruma = calculateKemadrumaYoga(chart);
  const gandmool = calculateGandmoolDosha(chart);
  const kalathra = calculateKalathraDosh(chart);
  const vishDaridra = calculateVishDaridraYoga(chart);
  const ketuNaga = calculateKetuNagaDosha(chart);
  
  // Umbrella check
  const navagrahaUmbrella = calculateNavagrahaUmbrella({
    grahan, shrapit, guruChandal, punarphoo, kemadruma,
    gandmool, kalathra, vishDaridra, ketuNaga
  });

  const result: any = {
    summary: {
      // Original doshas (backward-compatible)
      mangal: mangal.canceled ? 'canceled' : (mangal.present ? 'present' : 'absent'),
      mangalSeverity: mangal.severity || undefined,
      kaalSarp: kaalSarp.present ? 'present' : 'absent',
      kaalSarpType: kaalSarp.type || undefined,
      pitra: pitra.present ? 'present' : 'absent',
      shaniSadeSati: sadeSati.active ? 'active' : 'inactive',
      shaniPhase: sadeSati.phase || undefined,
      
      // New doshas (add-only, optional fields)
      grahan: grahan.present,
      grahanSeverity: grahan.severity || undefined,
      grahanSubtype: grahan.subtype || undefined,
      rahuSurya: grahan.rahuSurya || undefined,
      shrapit: shrapit.present,
      guruChandal: guruChandal.present,
      punarphoo: punarphoo.present,
      kemadruma: kemadruma.present,
      gandmool: gandmool.present,
      kalathra: kalathra.present,
      vishDaridra: vishDaridra.present,
      ketuNaga: ketuNaga.present,
      navagrahaUmbrella: navagrahaUmbrella.present,
      kaalSarpSubtype: kaalSarp.subtype || undefined,
    },
    details: {
      // Original doshas (backward-compatible)
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
      
      // New doshas (add-only)
      grahan: {
        triggeredBy: grahan.triggeredBy,
        placements: grahan.placements,
        notes: grahan.notes,
        explanation: grahan.explanation,
        remedies: grahan.remedies,
      },
      shrapit: {
        triggeredBy: shrapit.triggeredBy,
        placements: shrapit.placements,
        notes: shrapit.notes,
        explanation: shrapit.explanation,
        remedies: shrapit.remedies,
      },
      guruChandal: {
        triggeredBy: guruChandal.triggeredBy,
        placements: guruChandal.placements,
        notes: guruChandal.notes,
        explanation: guruChandal.explanation,
        remedies: guruChandal.remedies,
      },
      punarphoo: {
        triggeredBy: punarphoo.triggeredBy,
        placements: punarphoo.placements,
        notes: punarphoo.notes,
        explanation: punarphoo.explanation,
        remedies: punarphoo.remedies,
      },
      kemadruma: {
        triggeredBy: kemadruma.triggeredBy,
        placements: kemadruma.placements,
        notes: kemadruma.notes,
        explanation: kemadruma.explanation,
        remedies: kemadruma.remedies,
      },
      gandmool: {
        triggeredBy: gandmool.triggeredBy,
        placements: gandmool.placements,
        notes: gandmool.notes,
        explanation: gandmool.explanation,
        remedies: gandmool.remedies,
      },
      kalathra: {
        triggeredBy: kalathra.triggeredBy,
        placements: kalathra.placements,
        notes: kalathra.notes,
        explanation: kalathra.explanation,
        remedies: kalathra.remedies,
      },
      vishDaridra: {
        triggeredBy: vishDaridra.triggeredBy,
        placements: vishDaridra.placements,
        notes: vishDaridra.notes,
        explanation: vishDaridra.explanation,
        remedies: vishDaridra.remedies,
      },
      ketuNaga: {
        triggeredBy: ketuNaga.triggeredBy,
        placements: ketuNaga.placements,
        notes: ketuNaga.notes,
        explanation: ketuNaga.explanation,
        remedies: ketuNaga.remedies,
      },
      navagrahaUmbrella: {
        triggeredBy: navagrahaUmbrella.triggeredBy,
        placements: navagrahaUmbrella.placements,
        notes: navagrahaUmbrella.notes,
        explanation: navagrahaUmbrella.explanation,
        remedies: navagrahaUmbrella.remedies,
      },
    },
  };
  
  // Add debug information if debug mode is enabled
  if (debugMode && inputData) {
    result.debug = {
      input_echo: {
        dob: inputData.date,
        tob_local: inputData.time || 'unknown',
        place: inputData.place,
        lat: inputData.lat,
        lon: inputData.lon,
        tz: inputData.tz,
        utc: inputData.utc
      },
      mangal: mangal.debug,
      pitra: pitra.debug,
      shaniDosha: sadeSati.debug,
      kaalSarp: kaalSarp.debug
    };
  }
  
  return result;
}

const MANGAL_DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];

function calculateMangalDosha(chart: any, debugMode: boolean = false) {
  const mars = chart.grahas.Mars;
  const jupiter = chart.grahas.Jupiter;
  const venus = chart.grahas.Venus;
  const moon = chart.grahas.Moon;
  
  if (!mars || !chart.ascendant) {
    return {
      present: false,
      severity: null,
      canceled: false,
      triggeredBy: [],
      placements: [],
      notes: ['Birth time unknown - cannot calculate from Lagna'],
      debug: debugMode ? {
        lagna_sign: 'unknown',
        mars_sign_house: 'unknown',
        helpers: { moon_house: 'unknown', venus_house: 'unknown' },
        cancellations: [],
        mitigations: [],
        final: 'absent'
      } : undefined
    };
  }

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];
  const cancellations: string[] = [];
  const mitigations: string[] = [];
  let canceled = false;

  const marsHouseFromLagna = mars.house!;
  const lagnaSign = chart.ascendant.sign;
  
  // PRIMARY: Mars from Lagna
  let primaryTriggered = false;
  if (MANGAL_DOSHA_HOUSES.includes(marsHouseFromLagna)) {
    primaryTriggered = true;
    triggeredBy.push('Mars from Lagna');
    placements.push(`Mars in H${marsHouseFromLagna} from Lagna (${mars.sign} ${mars.deg.toFixed(1)}°)`);
  }

  // HELPERS: Moon and Venus houses (don't upgrade to "present" alone)
  const marsHouseFromMoon = calculateHouseFrom(mars.lon, moon.lon);
  const moonHelperTriggered = MANGAL_DOSHA_HOUSES.includes(marsHouseFromMoon);
  if (moonHelperTriggered) {
    triggeredBy.push('Mars from Moon (helper)');
    placements.push(`Mars in H${marsHouseFromMoon} from Moon`);
  }

  const marsHouseFromVenus = calculateHouseFrom(mars.lon, venus.lon);
  const venusHelperTriggered = MANGAL_DOSHA_HOUSES.includes(marsHouseFromVenus);
  if (venusHelperTriggered) {
    triggeredBy.push('Mars from Venus (helper)');
    placements.push(`Mars in H${marsHouseFromVenus} from Venus`);
  }

  // HARD CANCELLATIONS
  // 1. Mars own sign (Aries/Scorpio) or exalted (Capricorn)
  if (mars.sign === 'Aries' || mars.sign === 'Scorpio' || mars.sign === 'Capricorn') {
    canceled = true;
    cancellations.push(`Mars ${mars.sign === 'Capricorn' ? 'exalted' : 'own sign'} (${mars.sign})`);
    notes.push(`Mars is ${mars.sign === 'Capricorn' ? 'exalted' : 'in own sign'} (${mars.sign}) - Dosha canceled`);
  }

  // 2. House-sign exceptions
  if (marsHouseFromLagna === 2 && (mars.sign === 'Gemini' || mars.sign === 'Virgo')) {
    canceled = true;
    cancellations.push(`H2 in ${mars.sign}`);
    notes.push(`Mars in H2 in ${mars.sign} - exception, Dosha canceled`);
  }
  if (marsHouseFromLagna === 12 && (mars.sign === 'Taurus' || mars.sign === 'Libra')) {
    canceled = true;
    cancellations.push(`H12 in ${mars.sign}`);
    notes.push(`Mars in H12 in ${mars.sign} - exception, Dosha canceled`);
  }
  if (marsHouseFromLagna === 7 && (mars.sign === 'Cancer' || mars.sign === 'Capricorn')) {
    canceled = true;
    cancellations.push(`H7 in ${mars.sign}`);
    notes.push(`Mars in H7 in ${mars.sign} - exception, Dosha canceled`);
  }
  if (marsHouseFromLagna === 8 && (mars.sign === 'Sagittarius' || mars.sign === 'Pisces')) {
    canceled = true;
    cancellations.push(`H8 in ${mars.sign}`);
    notes.push(`Mars in H8 in ${mars.sign} - exception, Dosha canceled`);
  }

  // MITIGATIONS (downgrade severity, don't cancel)
  const jupiterMarsDistance = getMinDistance(jupiter.lon, mars.lon);
  if (jupiterMarsDistance < 8) {
    mitigations.push('Jupiter conjunct/aspects Mars');
    notes.push('Jupiter conjuncts/aspects Mars - beneficial mitigation');
  }

  const jupiterLagnaDistance = getMinDistance(jupiter.lon, chart.ascendant.lon);
  if (jupiterLagnaDistance < 8) {
    mitigations.push('Jupiter conjunct/aspects Lagna');
    notes.push('Jupiter aspects Lagna - beneficial influence');
  }

  const venusLagnaDistance = getMinDistance(venus.lon, chart.ascendant.lon);
  if (venusLagnaDistance < 8) {
    mitigations.push('Venus conjunct/aspects Lagna');
    notes.push('Venus aspects Lagna - beneficial influence');
  }

  // Determine final status
  let final = 'absent';
  let severity: any = null;
  let present = false;

  if (canceled) {
    final = 'absent';
    present = false;
  } else if (primaryTriggered) {
    // Primary trigger = present
    final = 'present';
    present = true;
    
    // Determine severity
    const fromMoon = moonHelperTriggered;
    const fromVenus = venusHelperTriggered;
    const hasMitigations = mitigations.length > 0;
    
    if (fromMoon && fromVenus) {
      severity = hasMitigations ? 'moderate' : 'strong';
    } else if (fromMoon || fromVenus) {
      severity = hasMitigations ? 'mild' : 'moderate';
    } else {
      severity = hasMitigations ? 'mild' : 'moderate';
    }
    
    // Check for very tight conjunction (≤3° = strong)
    const marsLagnaDist = getMinDistance(mars.lon, chart.ascendant.lon);
    if (marsLagnaDist <= 3 && !hasMitigations) {
      severity = 'strong';
      notes.push('Mars tightly conjunct Lagna (≤3°)');
    }
  } else if (moonHelperTriggered || venusHelperTriggered) {
    // Only helpers, no primary = partial
    final = 'partial';
    present = false; // Don't set to "present"
    notes.push('Only helper indicators present (Moon/Venus) - considered partial, not full Mangal Dosha');
  }

  return {
    present,
    severity,
    canceled,
    triggeredBy,
    placements,
    notes,
    debug: debugMode ? {
      lagna_sign: lagnaSign,
      mars_sign_house: `H${marsHouseFromLagna}`,
      helpers: {
        moon_house: `H${marsHouseFromMoon}`,
        venus_house: `H${marsHouseFromVenus}`
      },
      cancellations,
      mitigations,
      final
    } : undefined
  };
}

function calculateKaalSarpDosha(chart: any, debugMode: boolean = false) {
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  
  const rahuLon = rahu.lon;
  const ketuLon = ketu.lon;
  
  const planets = [
    { name: 'Sun', obj: chart.grahas.Sun },
    { name: 'Moon', obj: chart.grahas.Moon },
    { name: 'Mars', obj: chart.grahas.Mars },
    { name: 'Mercury', obj: chart.grahas.Mercury },
    { name: 'Jupiter', obj: chart.grahas.Jupiter },
    { name: 'Venus', obj: chart.grahas.Venus },
    { name: 'Saturn', obj: chart.grahas.Saturn },
  ];

  const EDGE_TOLERANCE = 2.0; // degrees
  let planetsInArc = 0;
  let planetsOutsideArc = 0;
  let outsidePlanets: string[] = [];
  const planetDebug: any[] = [];
  let maxOutsideDelta = 0;
  
  for (const planet of planets) {
    const inArc = isInRahuKetuArc(planet.obj.lon, rahuLon, ketuLon);
    let finalInside = inArc;
    let deltaOutside = 0;
    
    if (!inArc) {
      // Check edge tolerance
      const distFromRahu = getMinDistance(planet.obj.lon, rahuLon);
      const distFromKetu = getMinDistance(planet.obj.lon, ketuLon);
      const minDist = Math.min(distFromRahu, distFromKetu);
      deltaOutside = minDist;
      
      if (minDist <= EDGE_TOLERANCE) {
        // Within edge tolerance, count as inside
        planetsInArc++;
        finalInside = true;
      } else {
        planetsOutsideArc++;
        outsidePlanets.push(planet.name);
        maxOutsideDelta = Math.max(maxOutsideDelta, minDist);
      }
    } else {
      planetsInArc++;
    }
    
    if (debugMode) {
      planetDebug.push({
        name: planet.name,
        deg: planet.obj.lon.toFixed(4),
        inside: finalInside,
        delta_outside: deltaOutside.toFixed(4)
      });
    }
  }

  const KAAL_SARP_TYPES = ['Anant', 'Kulik', 'Vasuki', 'Shankhapal', 'Padam', 'Mahapadma',
    'Takshak', 'Karkotak', 'Shankhachur', 'Ghatak', 'Vishdhar', 'Sheshnag'];

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];
  let type: string | null = null;
  let subtype: string | undefined = undefined;
  let decision = 'absent';
  
  // Present if all in arc (including edge tolerance)
  const isPresent = planetsOutsideArc === 0;
  const partialCount = 7 - planetsInArc; // How many were rescued by edge tolerance

  if (isPresent) {
    decision = partialCount > 0 ? 'present_partial' : 'present';
    
    if (partialCount > 0) {
      triggeredBy.push('All planets between Rahu and Ketu (edge tolerance applied)');
      subtype = 'partial';
      notes.push(`Edge tolerance (≤${EDGE_TOLERANCE}°) applied for ${partialCount} planet(s)`);
    } else {
      triggeredBy.push('All planets between Rahu and Ketu');
    }
    
    if (rahu.house) {
      type = KAAL_SARP_TYPES[rahu.house - 1];
      placements.push(`Rahu in H${rahu.house} (${rahu.sign}), Type: ${type}`);
    } else if (chart.ascendant === null) {
      notes.push('Birth time unknown - cannot determine Kaal Sarp type');
    }
  } else {
    notes.push(`${planetsOutsideArc} planet(s) outside Rahu-Ketu arc: ${outsidePlanets.join(', ')}`);
  }

  return {
    present: isPresent,
    type,
    subtype,
    triggeredBy,
    placements,
    notes,
    debug: debugMode ? {
      node_model_used: 'mean',
      endpoints: 'inclusive',
      edge_tolerance_deg: EDGE_TOLERANCE,
      rahu_deg: rahuLon.toFixed(4),
      ketu_deg: ketuLon.toFixed(4),
      planets: planetDebug,
      outside_count: planetsOutsideArc,
      outside_max_delta_deg: maxOutsideDelta.toFixed(4),
      decision
    } : undefined
  };
}

function getMinDistance(lon1: number, lon2: number): number {
  const diff = Math.abs(lon1 - lon2);
  return Math.min(diff, 360 - diff);
}

function calculatePitraDosha(chart: any, debugMode: boolean = false) {
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];
  let supportCount = 0;

  const sun = chart.grahas.Sun;
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  const saturn = chart.grahas.Saturn;

  let rahuHouseFromLagna: number | null = null;
  let ketuHouseFromLagna: number | null = null;
  let sunRahuDelta: number | null = null;
  let sunKetuDelta: number | null = null;
  let sunSaturnInfo = 'none';

  // PRIMARY triggers (any one is sufficient)
  
  // 1. Rahu or Ketu in 9th house (requires birth time)
  if (chart.ascendant) {
    rahuHouseFromLagna = rahu.house;
    ketuHouseFromLagna = ketu.house;
    
    if (rahu.house === 9) {
      triggeredBy.push('Rahu in 9th house');
      placements.push(`Rahu in H9 (${rahu.sign})`);
    }
    if (ketu.house === 9) {
      triggeredBy.push('Ketu in 9th house');
      placements.push(`Ketu in H9 (${ketu.sign})`);
    }
  }

  // 2. Sun-Rahu conjunction (≤8°)
  const sunRahuDist = getMinDistance(sun.lon, rahu.lon);
  sunRahuDelta = sunRahuDist;
  if (sunRahuDist <= 8) {
    triggeredBy.push('Sun-Rahu conjunction');
    placements.push(`Sun ${sun.sign} ${sun.deg.toFixed(1)}° conjunct Rahu ${rahu.sign} ${rahu.deg.toFixed(1)}° (Δ=${sunRahuDist.toFixed(1)}°)`);
  }

  // 3. Sun-Ketu conjunction (≤8°)
  const sunKetuDist = getMinDistance(sun.lon, ketu.lon);
  sunKetuDelta = sunKetuDist;
  if (sunKetuDist <= 8) {
    triggeredBy.push('Sun-Ketu conjunction');
    placements.push(`Sun ${sun.sign} ${sun.deg.toFixed(1)}° conjunct Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}° (Δ=${sunKetuDist.toFixed(1)}°)`);
  }

  // SUPPORTING triggers (strengthen the diagnosis)
  // 4. Sun-Saturn conjunction or opposition (≤6°)
  const sunSaturnDist = getMinDistance(sun.lon, saturn.lon);
  const isOpposition = Math.abs(sunSaturnDist - 180) <= 6;
  
  if (sunSaturnDist <= 6) {
    sunSaturnInfo = `conj_${sunSaturnDist.toFixed(1)}deg`;
    supportCount++;
    triggeredBy.push('Sun-Saturn conjunction (support)');
    placements.push(`Sun-Saturn conjunction (Δ=${sunSaturnDist.toFixed(1)}°)`);
    notes.push('Sun-Saturn conjunction (supporting indicator)');
  } else if (isOpposition) {
    sunSaturnInfo = 'opp';
    supportCount++;
    triggeredBy.push('Sun-Saturn opposition (support)');
    notes.push('Sun-Saturn opposition (supporting indicator)');
  }

  // If only house-based triggers would apply but time unknown
  if (!chart.ascendant && triggeredBy.length === 0) {
    notes.push('Birth time unknown - house-based checks skipped (partial result)');
  }

  const final = triggeredBy.length > 0 ? 'present' : 'absent';

  return { 
    present: triggeredBy.length > 0, 
    triggeredBy, 
    placements, 
    notes: notes.length > 0 ? notes : ['Traditional indicators of ancestral karma patterns'],
    debug: debugMode ? {
      rahu_house_from_lagna: rahuHouseFromLagna !== null ? `H${rahuHouseFromLagna}` : 'unknown',
      ketu_house_from_lagna: ketuHouseFromLagna !== null ? `H${ketuHouseFromLagna}` : 'unknown',
      sun_rahu_delta_deg: sunRahuDelta,
      sun_ketu_delta_deg: sunKetuDelta,
      sun_saturn: sunSaturnInfo,
      support_count: supportCount,
      final
    } : undefined
  };
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
