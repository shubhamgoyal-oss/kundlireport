import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geocoding using Nominatim (OpenStreetMap) - no API key needed
async function geocodeLocation(placeName: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    // Add "India" bias for better results
    const query = placeName.toLowerCase().includes('india') ? placeName : `${placeName}, India`;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'DoshaCalculatorAPI/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      return null;
    }
    
    const results = await response.json();
    
    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
        displayName: results[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Get timezone offset for India (IST = +5:30)
function getTimezoneOffset(): number {
  return 5.5; // IST
}

// Puja data source (same sheet used by the website)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1erweJnzoGMXOiA8HfZ7w9ZOA1nv2Mbt3ejiaUthfTNY/export?format=csv&gid=0';

type SriMandirPujaRow = {
  store_id: string;
  pooja_title: string;
  temple_name: string;
  cover_media_url: string;
  puja_link: string;
  individual_pack_price_inr: number | null;
  schedule_date_ist: string;
  temple_location?: string;
  puja_link_hindi?: string;
  pooja_title_english?: string;
  temple_name_english?: string;
  temple_location_english?: string;
  cover_media_url_english?: string;
};

function parseIndianDate(dateStr: string): Date | null {
  const parts = (dateStr || '').split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  return new Date(year, month, day);
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.trim().replace(/^"|"$/g, ''));
}

function getFieldInsensitive(row: Record<string, string>, candidates: string[]): string {
  const normalize = (k: string) => k.trim().toLowerCase().replace(/[_\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) map.set(normalize(k), v);
  for (const c of candidates) {
    const v = map.get(normalize(c));
    if (v !== undefined) return (v || '').trim();
  }
  return '';
}

function parseSriMandirCSV(csvText: string): SriMandirPujaRow[] {
  const text = csvText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const out: SriMandirPujaRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const store_id = (row['store_id'] || '').trim();
    const pooja_title = (row['pooja_title'] || '').trim();
    if (!store_id || !pooja_title) continue;

    const puja_link = getFieldInsensitive(row, ['puja_link', 'pooja_link', 'link']);
    const puja_link_hindi = getFieldInsensitive(row, ['puja_link_hindi', 'puja_link_hi', 'pooja_link_hindi', 'pooja_link_hi', 'puja link hindi']);

    const individual_pack_price_inr_str = getFieldInsensitive(row, ['individual_pack_price_inr', 'price', 'price_inr']);
    const individual_pack_price_inr = individual_pack_price_inr_str ? (parseFloat(individual_pack_price_inr_str) || null) : null;

    out.push({
      store_id,
      pooja_title,
      temple_name: (row['temple_name'] || '').trim(),
      cover_media_url: (row['cover_media_url'] || '').trim(),
      puja_link,
      puja_link_hindi: puja_link_hindi || undefined,
      individual_pack_price_inr,
      schedule_date_ist: (row['schedule_date_ist'] || '').trim(),
      temple_location: (row['temple_location'] || '').trim() || undefined,
      pooja_title_english: getFieldInsensitive(row, ['puja title english', 'pooja title english', 'pooja_title_english', 'puja_title_english']) || undefined,
      temple_name_english: getFieldInsensitive(row, ['temple name english', 'temple_name_english']) || undefined,
      temple_location_english: getFieldInsensitive(row, ['temple location english', 'temple_location_english']) || undefined,
      cover_media_url_english: getFieldInsensitive(row, ['cover image english', 'cover_media_url_english', 'cover media url english']) || undefined,
    });
  }

  return out;
}

let cachedSheetPujas: SriMandirPujaRow[] = [];
let cachedSheetAt = 0;
const SHEET_CACHE_MS = 15 * 60 * 1000;

async function fetchSriMandirPujasFromSheet(): Promise<SriMandirPujaRow[]> {
  const now = Date.now();
  if (cachedSheetPujas.length && now - cachedSheetAt < SHEET_CACHE_MS) return cachedSheetPujas;

  const resp = await fetch(SHEET_CSV_URL);
  if (!resp.ok) {
    console.error('Failed to fetch puja sheet:', resp.status);
    return cachedSheetPujas;
  }

  const csv = await resp.text();
  const parsed = parseSriMandirCSV(csv);
  cachedSheetPujas = parsed;
  cachedSheetAt = now;
  return parsed;
}

const DOSHA_PUJA_PRIORITY_PATTERNS: Record<string, string[][]> = {
  pitra: [['pitru', 'dosh'], ['pitra', 'dosh'], ['पितृ', 'दोष'], ['पितर', 'दोष']],
  mangal: [['mangal', 'dosh'], ['मंगल', 'दोष']],
  'kaal-sarp': [['ka', 'l', 'sarp', 'dosh'], ['काल', 'सर्प', 'दोष']],
  shani: [['shani', 'sa', 'de', 'sa', 'ti'], ['शनि', 'साढ़े', 'साती'], ['साढ़ेसाती']]
};

const DOSHA_PUJA_FALLBACK_KEYWORDS: Record<string, string[]> = {
  pitra: ['pitru', 'pitra', 'पितृ', 'पितर', 'dosh', 'दोष'],
  mangal: ['mangal', 'मंगल', 'manglik', 'मंगलिक'],
  'kaal-sarp': ['kaal sarp', 'काल सर्प', 'sarp', 'सर्प', 'dosh', 'दोष'],
  shani: ['shani', 'शनि', 'sade sati', 'साढ़े', 'साती', 'साढ़ेसाती'],
  navagraha: ['navagraha', 'navagrah', 'नवग्रह']
};

function matchesPriorityPattern(combinedTitle: string, patterns: string[][]): boolean {
  const t = combinedTitle.toLowerCase();
  return patterns.some(terms => terms.every(term => t.includes(term.toLowerCase())));
}

function pickUpcoming(pujas: SriMandirPujaRow[]): SriMandirPujaRow | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scored = pujas
    .map(p => ({ p, d: parseIndianDate(p.schedule_date_ist) }))
    .filter(x => !x.d || x.d.getTime() > today.getTime())
    .sort((a, b) => {
      if (a.d && b.d) return a.d.getTime() - b.d.getTime();
      if (a.d && !b.d) return -1;
      if (!a.d && b.d) return 1;
      return 0;
    });

  return scored[0]?.p || pujas[0] || null;
}

function canonicalDoshaForPuja(doshaKey: string): 'mangal' | 'pitra' | 'kaal-sarp' | 'shani' | 'navagraha' {
  if (doshaKey === 'kaalSarp') return 'kaal-sarp';
  if (doshaKey === 'shaniDosha' || doshaKey === 'sadeSati') return 'shani';
  if (doshaKey === 'pitra') return 'pitra';
  if (doshaKey === 'mangal') return 'mangal';
  return 'navagraha';
}

function getPujaDisplay(puja: SriMandirPujaRow, language: string) {
  const isHindi = language?.toLowerCase().startsWith('hi');
  const title = isHindi ? puja.pooja_title : (puja.pooja_title_english || puja.pooja_title);
  const temple = isHindi ? puja.temple_name : (puja.temple_name_english || puja.temple_name);
  const location = isHindi ? puja.temple_location : (puja.temple_location_english || puja.temple_location);
  const link = isHindi ? (puja.puja_link_hindi || puja.puja_link) : (puja.puja_link || puja.puja_link_hindi || '');
  const cover = isHindi ? (puja.cover_media_url || puja.cover_media_url_english || '') : (puja.cover_media_url_english || puja.cover_media_url || '');

  return { title, temple, location, link, cover };
}

function pickSheetPujaForDosha(allPujas: SriMandirPujaRow[], doshaKey: string): SriMandirPujaRow | null {
  const type = canonicalDoshaForPuja(doshaKey);
  const patterns = DOSHA_PUJA_PRIORITY_PATTERNS[type];
  const fallback = DOSHA_PUJA_FALLBACK_KEYWORDS[type];

  const valid = allPujas.filter(p => {
    const combined = `${p.pooja_title} ${(p.pooja_title_english || '')}`.toLowerCase();
    // Ignore rashi content
    return !(combined.includes('rashi') || combined.includes('राशि'));
  });

  const patternMatches = patterns
    ? valid.filter(p => matchesPriorityPattern(`${p.pooja_title} ${(p.pooja_title_english || '')}`, patterns))
    : [];

  if (patternMatches.length) return pickUpcoming(patternMatches);

  if (fallback?.length) {
    const kwMatches = valid.filter(p => {
      const combined = `${p.pooja_title} ${(p.pooja_title_english || '')}`.toLowerCase();
      return fallback.some(k => combined.includes(k.toLowerCase()));
    });
    if (kwMatches.length) return pickUpcoming(kwMatches);
  }

  // As a last resort, pick upcoming navagraha (umbrella)
  if (type !== 'navagraha') {
    return pickSheetPujaForDosha(allPujas, 'navagraha');
  }

  return pickUpcoming(valid);
}

// Dosha name mappings
const doshaNameMap: Record<string, { en: string; hi: string }> = {
  mangal: { en: 'Mangal Dosha', hi: 'मंगल दोष' },
  pitra: { en: 'Pitra Dosha', hi: 'पितृ दोष' },
  kaalSarp: { en: 'Kaal Sarp Dosha', hi: 'काल सर्प दोष' },
  shani: { en: 'Shani Dosha', hi: 'शनि दोष' },
  shaniDosha: { en: 'Shani Dosha', hi: 'शनि दोष' },
  sadeSati: { en: 'Sade Sati', hi: 'साढ़े साती' },
  grahan: { en: 'Grahan Dosha', hi: 'ग्रहण दोष' },
  shrapit: { en: 'Shrapit Dosha', hi: 'श्रापित दोष' },
  guruChandal: { en: 'Guru Chandal Dosha', hi: 'गुरु चांडाल दोष' },
  punarphoo: { en: 'Punarphoo Dosha', hi: 'पुनर्फू दोष' },
  kemadruma: { en: 'Kemadruma Yoga', hi: 'केमद्रुम योग' },
  gandmool: { en: 'Gandmool Dosha', hi: 'गंडमूल दोष' },
  kalathra: { en: 'Kalathra Dosha', hi: 'कलत्र दोष' },
  vishDaridra: { en: 'Vish/Daridra Yoga', hi: 'विष/दरिद्र योग' },
  ketuNaga: { en: 'Ketu/Naga Dosha', hi: 'केतु/नाग दोष' },
  navagraha: { en: 'Navagraha Umbrella', hi: 'नवग्रह छत्र' },
  navagrahaUmbrella: { en: 'Navagraha Umbrella', hi: 'नवग्रह छत्र' }
};

// Generate AI impact for a dosha
async function generateImpact(
  doshaType: string, 
  problemArea: string, 
  language: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ impactTitle: string; impactText: string } | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-impact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ doshaType, problemArea, language })
    });

    if (!response.ok) {
      console.error('Generate impact error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Generate impact failed:', error);
    return null;
  }
}

// Upload file to Supabase Storage and return public URL
async function uploadKundaliFile(
  data: Uint8Array,
  calculationId: string,
  extension: string,
  contentType: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string | null> {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const fileName = `${calculationId}.${extension}`;
    
    const { data: uploadData, error } = await supabase.storage
      .from('kundali-charts')
      .upload(fileName, data, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('kundali-charts')
      .getPublicUrl(fileName);
    
    return urlData?.publicUrl || null;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}

// Get kundali chart SVG and upload to storage
async function getKundaliChart(
  day: number,
  month: number,
  year: number,
  hour: number,
  minute: number,
  lat: number,
  lon: number,
  language: string,
  supabaseUrl: string,
  supabaseKey: string,
  calculationId: string
): Promise<{ svg: string | null; imageUrl: string | null; format: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-kundali-chart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        day,
        month,
        year,
        hour,
        minute,
        lat,
        lon,
        tzone: getTimezoneOffset(),
        chartType: 'North',
        language: language === 'hi' ? 'hi' : 'en'
      })
    });

    if (!response.ok) {
      console.error('Get kundali chart error:', response.status);
      return { svg: null, imageUrl: null, format: 'none' };
    }

    const data = await response.json();
    const svg = data?.data?.svg || null;
    
    if (!svg) {
      return { svg: null, imageUrl: null, format: 'none' };
    }
    
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('No service role key for storage upload');
      return { svg, imageUrl: null, format: 'svg' };
    }
    
    // Upload SVG to storage
    const encoder = new TextEncoder();
    const svgData = encoder.encode(svg);
    const imageUrl = await uploadKundaliFile(svgData, calculationId, 'svg', 'image/svg+xml', supabaseUrl, serviceRoleKey);
    
    return { svg, imageUrl, format: 'svg' };
  } catch (error) {
    console.error('Get kundali chart failed:', error);
    return { svg: null, imageUrl: null, format: 'none' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const {
      name,
      date_of_birth,      // Format: YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
      time_of_birth,      // Format: HH:MM (24hr) or HH:MM AM/PM
      place_of_birth,     // Text location - will be geocoded
      gender = 'male',
      language = 'en',    // 'en' or 'hi'
      problem_area,       // Optional: for AI-generated impact
      include_chart = true, // Whether to include kundali SVG
      include_impacts = true, // Whether to generate AI impacts
      visitor_id = 'whatsapp-api',
      session_id = 'whatsapp-session'
    } = body;

    // Validate required fields
    if (!name || !date_of_birth || !time_of_birth || !place_of_birth) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          required: ['name', 'date_of_birth', 'time_of_birth', 'place_of_birth'],
          optional: ['gender', 'language', 'problem_area', 'include_chart', 'include_impacts'],
          example: {
            name: 'Rahul Sharma',
            date_of_birth: '1990-05-15',
            time_of_birth: '10:30',
            place_of_birth: 'Mumbai',
            gender: 'male',
            language: 'en',
            problem_area: 'career and financial stability'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing dosha calculation for:', { name, date_of_birth, time_of_birth, place_of_birth, problem_area });

    // Step 1: Geocode the location
    const geoResult = await geocodeLocation(place_of_birth);
    
    if (!geoResult) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not find location',
          message: `Unable to geocode "${place_of_birth}". Please provide a valid city/town name in India.`,
          suggestions: [
            'Try using just the city name (e.g., "Mumbai" instead of "Mumbai, Maharashtra")',
            'Check spelling of the location',
            'Try a nearby major city'
          ]
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Geocoded location:', geoResult);

    // Step 2: Parse and normalize date
    let normalizedDate = date_of_birth;
    // Handle DD-MM-YYYY or DD/MM/YYYY formats
    if (date_of_birth.includes('/') || (date_of_birth.includes('-') && date_of_birth.split('-')[0].length <= 2)) {
      const parts = date_of_birth.split(/[-\/]/);
      if (parts.length === 3) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Parse date components
    const [yearStr, monthStr, dayStr] = normalizedDate.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);

    // Step 3: Normalize time to 24hr format
    let normalizedTime = time_of_birth;
    let hour = 0;
    let minute = 0;
    const timeMatch = time_of_birth.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
      const period = timeMatch[3];
      
      if (period) {
        if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
      normalizedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // Step 4: Call the existing calculate-dosha function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Normalize gender to M/F format
    const normalizedGender = gender?.toLowerCase().startsWith('f') ? 'F' : 'M';
    
    const doshaPayload = {
      name,
      date: normalizedDate,
      time: normalizedTime,
      tz: 'Asia/Kolkata',
      lat: geoResult.lat,
      lon: geoResult.lon,
      place: geoResult.displayName,
      gender: normalizedGender,
      unknownTime: false
    };

    console.log('Calling calculate-dosha with:', doshaPayload);

    const doshaResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-dosha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(doshaPayload)
    });

    if (!doshaResponse.ok) {
      const errorText = await doshaResponse.text();
      console.error('Calculate-dosha error:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Calculation failed',
          message: 'Unable to calculate doshas. Please try again.',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doshaResult = await doshaResponse.json();
    console.log('Dosha calculation result received, summary:', JSON.stringify(doshaResult.summary));
    
    const calculationId = doshaResult.calculationId || `temp-${Date.now()}`;

    // Step 5: Get Kundali chart (parallel with puja fetch)
    const chartPromise = include_chart 
      ? getKundaliChart(day, month, year, hour, minute, geoResult.lat, geoResult.lon, language, supabaseUrl, supabaseKey, calculationId)
      : Promise.resolve({ svg: null, imageUrl: null });

    // Fetch puja sheet in parallel too (used for WhatsApp/API puja recommendations)
    const sheetPujasPromise = fetchSriMandirPujasFromSheet().catch((e) => {
      console.error('Puja sheet fetch failed:', e);
      return [] as SriMandirPujaRow[];
    });
    const presentDoshas: string[] = [];
    const doshaDetails: any[] = [];
    const pujaRecommendations: any[] = [];

    const summary = doshaResult.summary || {};
    const detailsData = doshaResult.details || {}; // Fixed: use 'details' not 'doshaResults'

    // Helper to check if dosha is active
    const isActive = (status: string | undefined): boolean => {
      if (!status) return false;
      const s = status.toLowerCase().trim();
      return s === 'present' || s === 'active' || s === 'partial' || s.includes('present');
    };
    const getSeverity = (key: string): string | null => {
      const sevKey = `${key}Severity`;
      const v = (summary as any)?.[sevKey];
      return typeof v === 'string' ? v : null;
    };

    // Determine doshas from a stable allowlist (avoid relying on Object.entries ordering/shape)
    const candidateKeys = Array.from(new Set([
      ...Object.keys(doshaNameMap),
      // extra keys produced by calculate-dosha
      'sadeSati',
      'shaniDosha',
      'navagrahaUmbrella',
      'kalathra',
      'vishDaridra',
      // other keys sometimes used across flows
      'kaalSarp',
      'guruChandal',
      'shrapit',
      'punarphoo',
      'kemadruma',
      'gandmool',
      'ketuNaga'
    ]));

    const sheetPujas = await sheetPujasPromise;
    for (const doshaKey of candidateKeys) {
      if (doshaKey === 'navagraha') continue; // not a dosha status in calculate-dosha
      const rawStatus = (summary as any)?.[doshaKey];
      if (typeof rawStatus !== 'string') continue;

      const status = rawStatus;
      if (!isActive(status)) continue;
      if (status.toLowerCase() === 'suggested') continue; // don't count umbrellas as "dosha found"

      const severity = getSeverity(doshaKey);
      presentDoshas.push(doshaKey);

      const doshaName = doshaNameMap[doshaKey] || { en: doshaKey, hi: doshaKey };

      // Get explanation from details
      const doshaData = (detailsData as any)?.[doshaKey] || {};
      const explanation = doshaData.explanation || '';
      const remedies = doshaData.remedies || [];

      doshaDetails.push({
        key: doshaKey,
        name: language === 'hi' ? doshaName.hi : doshaName.en,
        severity: severity || undefined,
        status,
        explanation,
        remedies
      });

      // Get puja recommendation from the same sheet the website uses
      const selectedPuja = sheetPujas.length ? pickSheetPujaForDosha(sheetPujas, doshaKey) : null;
      if (selectedPuja) {
        const display = getPujaDisplay(selectedPuja, language);
        const price = selectedPuja.individual_pack_price_inr != null
          ? `₹${new Intl.NumberFormat('en-IN').format(Math.round(selectedPuja.individual_pack_price_inr))}`
          : null;

        pujaRecommendations.push({
          dosha: language === 'hi' ? doshaName.hi : doshaName.en,
          puja: {
            store_id: selectedPuja.store_id,
            title: display.title,
            temple_name: display.temple || null,
            temple_location: display.location || null,
            schedule_date_ist: selectedPuja.schedule_date_ist || null,
            price,
            link: display.link || null,
            cover_image: display.cover || null,
          }
        });
      }
    }

    // Deduplicate in case a key appears twice
    const seen = new Set<string>();
    const dedupedDetails: any[] = [];
    for (const d of doshaDetails) {
      if (seen.has(d.key)) continue;
      seen.add(d.key);
      dedupedDetails.push(d);
    }
    doshaDetails.length = 0;
    doshaDetails.push(...dedupedDetails);
    presentDoshas.length = 0;
    presentDoshas.push(...Array.from(seen));

    // If multiple doshas, also recommend an umbrella Navagraha puja
    if (presentDoshas.length >= 3 && !presentDoshas.includes('navagraha')) {
      const navagrahaPuja = sheetPujas.length ? pickSheetPujaForDosha(sheetPujas, 'navagraha') : null;
      if (navagrahaPuja) {
        const display = getPujaDisplay(navagrahaPuja, language);
        const price = navagrahaPuja.individual_pack_price_inr != null
          ? `₹${new Intl.NumberFormat('en-IN').format(Math.round(navagrahaPuja.individual_pack_price_inr))}`
          : null;

        pujaRecommendations.push({
          dosha: language === 'hi' ? 'नवग्रह शांति (एकाधिक दोषों के लिए)' : 'Navagraha Shanti (for multiple doshas)',
          puja: {
            store_id: navagrahaPuja.store_id,
            title: display.title,
            temple_name: display.temple || null,
            temple_location: display.location || null,
            schedule_date_ist: navagrahaPuja.schedule_date_ist || null,
            price,
            link: display.link || null,
            cover_image: display.cover || null,
          }
        });
      }
    }

    // Step 7: Generate AI impacts for present doshas (if problem_area provided)
    const impacts: Record<string, any> = {};
    if (include_impacts && problem_area && presentDoshas.length > 0) {
      console.log('Generating AI impacts for doshas:', presentDoshas);
      
      // Generate impacts in parallel for top 3 doshas
      const topDoshas = presentDoshas.slice(0, 3);
      const impactPromises = topDoshas.map((doshaKey) => {
        // Map keys to what generate-impact expects
        const impactType = doshaKey === 'kaalSarp' ? 'kaal-sarp'
          : doshaKey === 'shaniDosha' || doshaKey === 'sadeSati' ? 'shani'
          : doshaKey;

        // Only generate for supported types
        const supported = ['mangal', 'pitra', 'kaal-sarp', 'shani'];
        if (!supported.includes(impactType)) {
          return Promise.resolve({ doshaKey, result: null as any });
        }

        return generateImpact(impactType, problem_area, language, supabaseUrl, supabaseKey)
          .then(result => ({ doshaKey, result }));
      });
      
      const impactResults = await Promise.all(impactPromises);
      
      for (const { doshaKey, result } of impactResults) {
        if (result) {
          impacts[doshaKey] = {
            title: result.impactTitle,
            text: result.impactText
          };
          
          // Add impact to dosha details
          const doshaDetail = doshaDetails.find(d => d.key === doshaKey);
          if (doshaDetail) {
            doshaDetail.ai_impact = result;
          }
        }
      }
    }

    // Wait for chart
    const chartResult = await chartPromise;

    // Step 8: Build response
    const response: any = {
      success: true,
      input: {
        name,
        date_of_birth: normalizedDate,
        time_of_birth: normalizedTime,
        place_of_birth: geoResult.displayName,
        coordinates: {
          latitude: geoResult.lat,
          longitude: geoResult.lon
        },
        problem_area: problem_area || null
      },
      doshas: {
        count: presentDoshas.length,
        present: doshaDetails,
        summary: presentDoshas.length === 0 
          ? (language === 'hi' ? 'आपकी कुंडली में कोई प्रमुख दोष नहीं पाया गया।' : 'No major doshas found in your kundali.')
          : (language === 'hi' 
              ? `आपकी कुंडली में ${presentDoshas.length} दोष पाए गए हैं।` 
              : `${presentDoshas.length} dosha(s) found in your kundali.`)
      },
      pujas: pujaRecommendations,
      calculation_id: calculationId
    };

    // Add kundali chart if available
    if (chartResult?.imageUrl) {
      response.kundali_chart = {
        format: chartResult.format,
        image_url: chartResult.imageUrl
      };
    } else if (chartResult?.svg) {
      // Fallback to raw SVG data if upload failed
      response.kundali_chart = {
        format: 'svg',
        data: chartResult.svg
      };
    }

    // Add AI impacts if generated
    if (Object.keys(impacts).length > 0) {
      response.ai_impacts = impacts;
    }

    console.log('API response prepared, doshas:', presentDoshas.length, 'chart:', !!chartResult?.imageUrl || !!chartResult?.svg, 'impacts:', Object.keys(impacts).length);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in dosha-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
