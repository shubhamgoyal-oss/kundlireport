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

    // Return chart data (dosha calculation will be added in Phase 3)
    return new Response(
      JSON.stringify({
        success: true,
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
