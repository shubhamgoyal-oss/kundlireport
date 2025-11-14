import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

// Seer API Integration
interface SeerPlanetPosition {
  name: string;
  full_degree: number;
  sign: string;
  house_id: number;
}

interface SeerKundliResponse {
  data: {
    vedic_horoscope: {
      planets_position: SeerPlanetPosition[];
    };
  };
}

interface NormalizedPlanet {
  name: string;
  deg: number;
  sign: string;
  house: number;
}

const SIGN_MAP: Record<string, string> = {
  'मेष': 'Aries', 'वृष': 'Taurus', 'मिथुन': 'Gemini', 'कर्क': 'Cancer',
  'सिंह': 'Leo', 'कन्या': 'Virgo', 'तुला': 'Libra', 'वृश्चिक': 'Scorpio',
  'धनु': 'Sagittarius', 'मकर': 'Capricorn', 'कुम्भ': 'Aquarius', 'मीन': 'Pisces'
};

const PLANET_MAP: Record<string, string> = {
  'सूर्य': 'Sun', 'चन्द्र': 'Moon', 'मंगल': 'Mars', 'बुध': 'Mercury',
  'गुरु': 'Jupiter', 'शुक्र': 'Venus', 'शनि': 'Saturn',
  'राहु': 'Rahu', 'केतु': 'Ketu', 'लग्न': 'Ascendant'
};

async function fetchSeerKundli(
  name: string,
  gender: string,
  userId: number,
  day: number, month: number, year: number, hour: number, min: number,
  lat: number, lon: number, tzone: number = 5.5
): Promise<SeerKundliResponse> {
  const requestBody = {
    name,
    gender,
    day,
    month,
    year,
    hour,
    min,
    lat,
    lon,
    tzone,
    user_id: userId
  };

  console.log('Seer API Request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api-sbox.a4b.io/gw2/seer/internal/v1/user/kundli-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-fe-server': 'true' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Seer API Error Response:', errorText);
    throw new Error(`Seer API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function normalizeSeerData(seerResponse: SeerKundliResponse): {
  planets: NormalizedPlanet[];
  ascendant: NormalizedPlanet;
} {
  const positions = seerResponse.data.vedic_horoscope.planets_position;
  const planets: NormalizedPlanet[] = [];
  let ascendant: NormalizedPlanet | null = null;

  for (const pos of positions) {
    const englishName = PLANET_MAP[pos.name];
    const englishSign = SIGN_MAP[pos.sign];
    if (!englishName || !englishSign) continue;

    const normalized = { name: englishName, deg: pos.full_degree, sign: englishSign, house: pos.house_id };
    if (englishName === 'Ascendant') ascendant = normalized;
    else planets.push(normalized);
  }

  if (!ascendant) throw new Error('Ascendant not found');
  return { planets, ascendant };
}

// Dosha calculation helpers
const getPlanet = (planets: NormalizedPlanet[], name: string) => planets.find(p => p.name === name);
const getHouseFrom = (h: number, from: number) => ((h - from + 12) % 12) || 12;
const angDist = (d1: number, d2: number) => Math.min(Math.abs(d1 - d2), 360 - Math.abs(d1 - d2));
const isConj = (d1: number, d2: number, orb = 8) => angDist(d1, d2) <= orb;
const isOpp = (d1: number, d2: number, orb = 8) => Math.abs(Math.abs(d1 - d2) - 180) <= orb;

function recomputeMangalDosha(planets: NormalizedPlanet[], asc: NormalizedPlanet) {
  const mars = getPlanet(planets, 'Mars');
  if (!mars) return { present: false, severity: undefined, triggeredBy: [], cancellations: [], mitigations: [], placements: ['Mars not found'], notes: [] };

  const triggeredBy: string[] = [], cancellations: string[] = [], mitigations: string[] = [];
  const placements = [`Asc ${asc.sign}`, `Mars ${mars.sign} ${mars.deg.toFixed(2)}° (H${mars.house})`];
  
  const hFromLagna = getHouseFrom(mars.house, asc.house);
  let primaryTriggered = [1,2,4,7,8,12].includes(hFromLagna);
  if (primaryTriggered) triggeredBy.push(`Mars H${hFromLagna} from Lagna`);

  const moon = getPlanet(planets, 'Moon');
  if (moon && [1,2,4,7,8,12].includes(getHouseFrom(mars.house, moon.house))) 
    triggeredBy.push(`Mars from Moon (supporting)`);
  
  const venus = getPlanet(planets, 'Venus');
  if (venus && [1,2,4,7,8,12].includes(getHouseFrom(mars.house, venus.house)))
    triggeredBy.push(`Mars from Venus (supporting)`);

  if (['Aries', 'Scorpio'].includes(mars.sign)) { cancellations.push(`Own sign (${mars.sign})`); primaryTriggered = false; }
  if (mars.sign === 'Capricorn') { cancellations.push('Exalted'); primaryTriggered = false; }
  if (hFromLagna === 2 && ['Gemini','Virgo'].includes(mars.sign)) { cancellations.push('H2 Gemini/Virgo'); primaryTriggered = false; }
  if (hFromLagna === 12 && ['Taurus','Libra'].includes(mars.sign)) { cancellations.push('H12 Taurus/Libra'); primaryTriggered = false; }
  if (hFromLagna === 7 && ['Cancer','Capricorn'].includes(mars.sign)) { cancellations.push('H7 Cancer/Capricorn'); primaryTriggered = false; }
  if (hFromLagna === 8 && ['Sagittarius','Pisces'].includes(mars.sign)) { cancellations.push('H8 Sagittarius/Pisces'); primaryTriggered = false; }

  const jupiter = getPlanet(planets, 'Jupiter');
  if (jupiter && isConj(mars.deg, jupiter.deg)) mitigations.push('Jupiter conj');
  if (venus && isConj(mars.deg, venus.deg)) mitigations.push('Venus conj');

  let severity: any = undefined;
  if (primaryTriggered) {
    severity = 'strong';
    if (mitigations.length === 1) severity = 'moderate';
    if (mitigations.length > 1) severity = 'mild';
  }

  return { present: primaryTriggered, severity, triggeredBy, cancellations, mitigations, placements, notes: ['Whole-sign; Lahiri; mean nodes'] };
}

function recomputePitraDosha(planets: NormalizedPlanet[], asc: NormalizedPlanet) {
  const rahu = getPlanet(planets, 'Rahu'), ketu = getPlanet(planets, 'Ketu'), sun = getPlanet(planets, 'Sun'), saturn = getPlanet(planets, 'Saturn');
  const triggeredBy: string[] = [], placements = [`Asc ${asc.sign}`];
  
  if (sun) placements.push(`Sun ${sun.deg.toFixed(2)}°`);
  if (rahu) placements.push(`Rahu ${rahu.deg.toFixed(2)}°`);

  let primary = 0, supporting = 0;
  if (rahu && getHouseFrom(rahu.house, asc.house) === 9) { triggeredBy.push('Rahu H9'); primary++; }
  if (ketu && getHouseFrom(ketu.house, asc.house) === 9) { triggeredBy.push('Ketu H9'); primary++; }
  if (sun && rahu && isConj(sun.deg, rahu.deg)) { triggeredBy.push('Sun-Rahu conj'); primary++; }
  if (sun && ketu && isConj(sun.deg, ketu.deg)) { triggeredBy.push('Sun-Ketu conj'); primary++; }
  if (sun && saturn && isConj(sun.deg, saturn.deg, 6)) { triggeredBy.push('Sun-Saturn (supp)'); supporting++; }
  if (sun && saturn && isOpp(sun.deg, saturn.deg, 6)) { triggeredBy.push('Sun-Saturn opp (supp)'); supporting++; }
  if (sun && getHouseFrom(sun.house, asc.house) === 9) { triggeredBy.push('Sun H9 (supp)'); supporting++; }

  return { present: primary > 0 || supporting >= 2, triggeredBy, placements, notes: ['Lahiri; mean nodes'] };
}

function recomputeShaniDosha(planets: NormalizedPlanet[], asc: NormalizedPlanet) {
  const saturn = getPlanet(planets, 'Saturn');
  if (!saturn) return { present: false, severity: undefined, triggeredBy: [], mitigations: [], placements: ['Saturn not found'], notes: [] };

  const triggeredBy: string[] = [], mitigations: string[] = [];
  const placements = [`Asc ${asc.sign}`, `Saturn ${saturn.sign} ${saturn.deg.toFixed(2)}°`];
  const hFromLagna = getHouseFrom(saturn.house, asc.house);
  let present = [1,4,7,8,12].includes(hFromLagna);
  if (present) triggeredBy.push(`Saturn H${hFromLagna}`);

  const moon = getPlanet(planets, 'Moon');
  if (moon && isConj(saturn.deg, moon.deg)) { triggeredBy.push('Saturn-Moon conj'); present = true; }
  if (moon && isOpp(saturn.deg, moon.deg)) { triggeredBy.push('Saturn-Moon opp'); present = true; }

  if (['Capricorn','Aquarius'].includes(saturn.sign)) mitigations.push(`Own (${saturn.sign})`);
  if (saturn.sign === 'Libra') mitigations.push('Exalted');
  const jupiter = getPlanet(planets, 'Jupiter');
  if (jupiter && isConj(saturn.deg, jupiter.deg)) mitigations.push('Jupiter aspect');

  let severity: any = undefined;
  if (present) {
    severity = 'strong';
    if (mitigations.length === 1) severity = 'moderate';
    if (mitigations.length > 1) severity = 'mild';
  }

  return { present, severity, triggeredBy, mitigations, placements, notes: ['Natal Shani; not Sade Sati'] };
}

function recomputeKaalSarpDosha(planets: NormalizedPlanet[]) {
  const rahu = getPlanet(planets, 'Rahu'), ketu = getPlanet(planets, 'Ketu');
  if (!rahu || !ketu) return { present: false, subtype: undefined, type: undefined, triggeredBy: [], placements: ['Rahu/Ketu not found'], notes: [] };

  const sevenPlanets = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  const placements = [`Rahu ${rahu.deg.toFixed(2)}°`, `Ketu ${ketu.deg.toFixed(2)}°`];
  const arcLength = (ketu.deg - rahu.deg + 360) % 360;
  
  let inside = 0, outsideByMargin = 0;
  for (const name of sevenPlanets) {
    const p = getPlanet(planets, name);
    if (!p) continue;
    const dist = (p.deg - rahu.deg + 360) % 360;
    if (dist <= arcLength) inside++;
    else if (Math.min(dist - arcLength, 360 - dist + arcLength) <= 2) outsideByMargin++;
    placements.push(`${name} ${p.deg.toFixed(2)}° (${dist <= arcLength ? 'in' : 'out'})`);
  }

  const triggeredBy: string[] = [];
  let present = false, subtype: any = undefined;
  if (inside === 7) { triggeredBy.push('All 7 inside'); present = true; }
  else if (inside === 6 && outsideByMargin === 1) { triggeredBy.push('6 inside, 1 margin'); present = true; subtype = 'partial'; }

  const types: Record<number, string> = { 1:'Anant', 2:'Kulik', 3:'Vasuki', 4:'Shankhpal', 5:'Padma', 6:'Mahapadma', 7:'Takshak', 8:'Karkotak', 9:'Shankhnaad', 10:'Ghatak', 11:'Vishdhar', 12:'Sheshnag' };
  return { present, subtype, type: types[rahu.house], triggeredBy, placements, notes: ['Mean nodes; Lahiri; whole-sign'] };
}

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5, RATE_WINDOW = 60000;

function checkRateLimit(id: string) {
  const now = Date.now(), rec = rateLimitMap.get(id);
  if (!rec || now > rec.resetTime) {
    rateLimitMap.set(id, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetTime: now + RATE_WINDOW };
  }
  if (rec.count >= RATE_LIMIT) return { allowed: false, remaining: 0, resetTime: rec.resetTime };
  rec.count++;
  return { allowed: true, remaining: RATE_LIMIT - rec.count, resetTime: rec.resetTime };
}

setInterval(() => { const now = Date.now(); for (const [k, v] of rateLimitMap.entries()) if (now > v.resetTime) rateLimitMap.delete(k); }, 300000);

const birthInputSchema = z.object({
  name: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")).optional(),
  tz: z.string().min(1).max(50),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  unknownTime: z.boolean().optional(),
  place: z.string().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const id = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'anon';
  const rateCheck = checkRateLimit(id);
  if (!rateCheck.allowed) return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const input = birthInputSchema.parse(body);
    const [y, m, d] = input.date.split('-').map(Number);
    const [h, min] = (input.time || '12:00').split(':').map(Number);

    console.log('🔮 Calling Seer API...');
    const nameForSeer = (input.name || 'User').toString().trim() || 'User';
    // Default gender to 'male' if not provided (API requires non-empty)
    const genderForSeer = 'male';
    const userIdForSeer = 1; // non-zero positive
    const seerResponse = await fetchSeerKundli(
      nameForSeer,
      genderForSeer,
      userIdForSeer,
      d, m, y, h, min, input.lat, input.lon, 5.5
    );
    const { planets, ascendant } = normalizeSeerData(seerResponse);

    const mangal = recomputeMangalDosha(planets, ascendant);
    const pitra = recomputePitraDosha(planets, ascendant);
    const shaniDosha = recomputeShaniDosha(planets, ascendant);
    const kaalSarp = recomputeKaalSarpDosha(planets);

    const chart: any = { planets: planets.map(p => ({ name: p.name, longitude: p.deg, sign: p.sign, house: p.house })), ascendant: { longitude: ascendant.deg, sign: ascendant.sign } };
    const grahan = calculateGrahanDosha(chart);
    const shrapit = calculateShrapitDosha(chart);
    const guruChandal = calculateGuruChandalDosha(chart);
    const punarphoo = calculatePunarphooDosha(chart);
    const kemadruma = calculateKemadrumaYoga(chart);
    const gandmool = calculateGandmoolDosha(chart);
    const kalathra = calculateKalathraDosh(chart);
    const vishDaridra = calculateVishDaridraYoga(chart);
    const ketuNaga = calculateKetuNagaDosha(chart);
    const navagrahaUmbrella = calculateNavagrahaUmbrella({ grahan, shrapit, guruChandal, punarphoo, kemadruma, gandmool, kalathra, vishDaridra, ketuNaga });

    return new Response(JSON.stringify({
      success: true,
      summary: {
        mangal: mangal.present ? 'present' : 'absent',
        mangalSeverity: mangal.severity,
        kaalSarp: kaalSarp.present ? 'present' : 'absent',
        kaalSarpType: kaalSarp.type,
        kaalSarpSubtype: kaalSarp.subtype,
        pitra: pitra.present ? 'present' : 'absent',
        shaniDosha: shaniDosha.present ? 'present' : 'absent',
        shaniDoshaSeverity: shaniDosha.severity,
        grahan: grahan.present, shrapit: shrapit.present, guruChandal: guruChandal.present,
        punarphoo: punarphoo.present, kemadruma: kemadruma.present, gandmool: gandmool.present,
        kalathra: kalathra.present, vishDaridra: vishDaridra.present, ketuNaga: ketuNaga.present,
        navagrahaUmbrella: navagrahaUmbrella.present,
      },
      details: {
        mangal: { ...mangal, explanation: mangal.present ? `Mangal Dosha (${mangal.severity}) present` : 'No Mangal Dosha', remedies: mangal.present ? ['Hanuman Chalisa', 'Fast Tuesdays'] : [] },
        pitra: { ...pitra, explanation: pitra.present ? 'Pitra Dosha present' : 'No Pitra Dosha', remedies: pitra.present ? ['Pitra Tarpan', 'Feed Brahmins'] : [] },
        shaniDosha: { ...shaniDosha, explanation: shaniDosha.present ? `Shani Dosha (${shaniDosha.severity}) present` : 'No Shani Dosha', remedies: shaniDosha.present ? ['Shani Mantra', 'Donate Saturdays'] : [] },
        kaalSarp: { ...kaalSarp, explanation: kaalSarp.present ? `Kaal Sarp (${kaalSarp.type}) present` : 'No Kaal Sarp', remedies: kaalSarp.present ? ['Kaal Sarp Puja', 'Mrityunjaya Mantra'] : [] },
        grahan, shrapit, guruChandal, punarphoo, kemadruma, gandmool, kalathra, vishDaridra, ketuNaga, navagrahaUmbrella,
      },
      metadata: { calculatedAt: new Date().toISOString(), source: 'seer', method: 'recomputed (mean nodes, whole-sign, Lahiri)' },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Unable to calculate dosha. Please verify your birth details.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
