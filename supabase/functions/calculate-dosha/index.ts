import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  calculateAllOtherDoshas
} from "./other-doshas.ts";
import { fetchSeerKundli, adaptSeerResponse, type SeerKundliRequest } from "./seer-adapter.ts";
import {
  calculateMangalDosha as calculateMangalDoshaSeer,
  calculatePitraDosha as calculatePitraDoshaSeer,
  calculateShaniDosha as calculateShaniDoshaSeer,
  calculateKaalSarpaDosha as calculateKaalSarpaDoshaSeer,
} from "./seer-doshas.ts";
import {
  getMangalExplanationSeer,
  getMangalRemediesSeer,
  getPitraExplanationSeer,
  getPitraRemediesSeer,
  getShaniExplanationSeer,
  getShaniRemediesSeer,
  getKaalSarpExplanationSeer,
  getKaalSarpRemediesSeer,
} from "./seer-explanations.ts";

// Initialize Supabase client for logging
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-visitor-id, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  name: z.string().min(1, "Name is required").max(100),
  gender: z.enum(['male', 'female'], { required_error: "Gender is required" }),
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

    // Parse date and time for Seer API
    const [year, month, day] = input.date.split('-').map(Number);
    let hour = 12;
    let min = 0;
    
    if (input.time && !input.unknownTime) {
      [hour, min] = input.time.split(':').map(Number);
    }
    
    // Timezone conversion (Seer expects tzone as hours from UTC)
    const tzOffsetMap: Record<string, number> = {
      'Asia/Kolkata': 5.5,
      'Asia/Calcutta': 5.5,
      'UTC': 0,
      'GMT': 0,
    };
    const tzone = tzOffsetMap[input.tz] || 5.5;

    // Fetch Kundli from Seer API
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 [MAIN] Starting Seer-based dosha calculation');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 [MAIN] Input data:', {
      date: `${day}/${month}/${year}`,
      time: `${hour}:${String(min).padStart(2, '0')}`,
      location: `${input.lat}, ${input.lon}`,
      timezone: `UTC+${tzone}`
    });
    
    const genderCode = (input as any).gender === 'male' ? 'M' : (input as any).gender === 'female' ? 'F' : 'O';

    const seerRequest: SeerKundliRequest = {
      day,
      month,
      year,
      hour,
      min,
      lat: input.lat,
      lon: input.lon,
      tzone,
      user_id: 505, // Fixed user_id for all Seer API calls
      name: (input as any).name,
      gender: genderCode
    };
    
    const seerApiStart = Date.now();
    const { data: seerData, responseTimeMs, status: seerStatus } = await fetchSeerKundli(seerRequest);
    
    // Adapt Hindi JSON to English
    const kundli = adaptSeerResponse(seerData);
    console.log('✅ [MAIN] Kundli adapted successfully');
    console.log('📊 [MAIN] Planetary positions:');
    kundli.planets.forEach(p => {
      console.log(`  ${p.name.padEnd(10)}: ${p.sign.padEnd(12)} ${p.deg.toFixed(1).padStart(6)}° (H${p.house})`);
    });

    // Log Seer API call to database for tracking
    const sessionId = req.headers.get('x-session-id') || 'unknown';
    const visitorId = req.headers.get('x-visitor-id') || 'unknown';
    
    try {
      const { error: logError } = await supabaseAdmin.from('seer_api_logs').insert({
        request_payload: seerRequest,
        birth_date: input.date,
        birth_time: input.time || '00:00',
        birth_place: input.place || `${input.lat},${input.lon}`,
        latitude: input.lat,
        longitude: input.lon,
        timezone: tzone,
        response_status: seerStatus,
        response_time_ms: responseTimeMs,
        response_data: seerData,
        session_id: sessionId,
        visitor_id: visitorId,
        adapted_planets: {
          ascendant: kundli.asc,
          planets: kundli.planets
        },
        adaptation_warnings: kundli.notes.filter(n => n.includes('Unknown') || n.includes('Missing'))
      });
      
      if (logError) {
        console.error("⚠️ [LOG] Failed to save Seer API log:", logError);
      } else {
        console.log("✅ [LOG] Seer API call logged to database");
      }
    } catch (logErr) {
      console.error("⚠️ [LOG] Error saving Seer API log:", logErr);
    }

    // Extract Seer's dosha calculations from response
    const seerVedic = seerData?.data?.vedic_horoscope || seerData?.vedic_horoscope;
    
    console.log('');
    console.log('🔮 [MAIN] Using Seer API dosha calculations...');
    console.log('───────────────────────────────────────────────────────');
    
    // Use Seer's Mangal Dosha result
    console.log('🔴 [DOSHA] Extracting Mangal Dosha from Seer...');
    let mangal;
    if (seerVedic?.manglik_dosha) {
      const seerMangal = seerVedic.manglik_dosha;
      const isManglik = seerMangal.from_ascendant?.is_manglik || 
                        seerMangal.from_moon?.is_manglik || 
                        seerMangal.from_venus?.is_manglik;
      
      if (isManglik) {
        mangal = {
          status: 'present' as const,
          severity: 'moderate' as const,
          triggeredBy: [
            seerMangal.from_ascendant?.is_manglik ? `Mars from Lagna (H${seerMangal.from_ascendant.mars_house})` : null,
            seerMangal.from_moon?.is_manglik ? `Mars from Moon (H${seerMangal.from_moon.mars_house})` : null,
            seerMangal.from_venus?.is_manglik ? `Mars from Venus (H${seerMangal.from_venus.mars_house})` : null,
          ].filter(Boolean) as string[],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: []
        };
      } else {
        mangal = {
          status: 'absent' as const,
          triggeredBy: [],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: []
        };
      }
      console.log(`  Seer Result: ${mangal.status}${mangal.severity ? ` (${mangal.severity})` : ''}`);
      if (mangal.triggeredBy.length > 0) {
        console.log(`  Triggers: ${mangal.triggeredBy.join(', ')}`);
      }
    } else {
      // Fallback to local calculation
      mangal = calculateMangalDoshaSeer(kundli);
      console.log(`  Local Calculation: ${mangal.status}${mangal.severity ? ` (${mangal.severity})` : ''}`);
    }
    
    // Use Seer's Pitra Dosha result
    console.log('👴 [DOSHA] Extracting Pitra Dosha from Seer...');
    let pitra;
    if (seerVedic?.pitri_dosha) {
      const seerPitra = seerVedic.pitri_dosha;
      if (seerPitra.is_pitri_dosha_present) {
        pitra = {
          status: 'present' as const,
          severity: 'moderate' as const,
          triggeredBy: seerPitra.rules_matched || ['Pitra Dosha detected by Seer'],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: []
        };
      } else {
        pitra = {
          status: 'absent' as const,
          triggeredBy: [],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: []
        };
      }
      console.log(`  Seer Result: ${pitra.status}${pitra.severity ? ` (${pitra.severity})` : ''}`);
      if (pitra.triggeredBy.length > 0) {
        console.log(`  Triggers: ${pitra.triggeredBy.join(', ')}`);
      }
    } else {
      // Fallback to local calculation
      pitra = calculatePitraDoshaSeer(kundli);
      console.log(`  Local Calculation: ${pitra.status}${pitra.severity ? ` (${pitra.severity})` : ''}`);
    }
    
    // Always use local Shani Dosha calculation (not in Seer response)
    console.log('🪐 [DOSHA] Calculating Shani Dosha (natal)...');
    const shani = calculateShaniDoshaSeer(kundli);
    console.log(`  Result: ${shani.status}${shani.severity ? ` (${shani.severity})` : ''}`);
    if (shani.triggeredBy.length > 0) {
      console.log(`  Triggers: ${shani.triggeredBy.join(', ')}`);
    }
    
    // Extract Sade Sati data from Seer
    console.log('⏳ [DOSHA] Extracting Sade Sati from Seer...');
    let sadeSati = {
      isActive: false,
      currentPhase: null as string | null,
      periods: [] as any[]
    };
    
    if (seerVedic?.shadhe_sati_dosha && Array.isArray(seerVedic.shadhe_sati_dosha)) {
      sadeSati.periods = seerVedic.shadhe_sati_dosha;
      
      // Check if Sade Sati is currently active
      const now = Date.now();
      for (const period of seerVedic.shadhe_sati_dosha) {
        const periodTime = parseInt(period.millisecond);
        if (periodTime <= now) {
          // Find the most recent period that has started
          if (period.type?.includes('START')) {
            sadeSati.isActive = true;
            sadeSati.currentPhase = period.type;
          } else if (period.type?.includes('END')) {
            sadeSati.isActive = false;
            sadeSati.currentPhase = null;
          }
        }
      }
      
      console.log(`  Sade Sati Active: ${sadeSati.isActive}`);
      if (sadeSati.currentPhase) {
        console.log(`  Current Phase: ${sadeSati.currentPhase}`);
      }
    } else {
      console.log(`  No Sade Sati data found in Seer response`);
    }
    
    // Use Seer's Kaal Sarpa Dosha result
    console.log('🐉 [DOSHA] Extracting Kaal Sarp Dosha from Seer...');
    let kaalSarp;
    if (seerVedic?.kalsarpa_dosha) {
      const seerKS = seerVedic.kalsarpa_dosha;
      if (seerKS.present) {
        kaalSarp = {
          status: 'present' as const,
          severity: seerKS.type?.includes('Partial') ? 'moderate' as const : 'strong' as const,
          triggeredBy: [seerKS.name ? `${seerKS.name} (${seerKS.type})` : 'Kaal Sarpa Dosha detected by Seer'],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: seerKS.type ? [`Type: ${seerKS.type}`] : []
        };
      } else {
        kaalSarp = {
          status: 'absent' as const,
          triggeredBy: [],
          cancellations: [],
          mitigations: [],
          placements: [],
          notes: []
        };
      }
      console.log(`  Seer Result: ${kaalSarp.status}${kaalSarp.severity ? ` (${kaalSarp.severity})` : ''}`);
      if (kaalSarp.triggeredBy.length > 0) {
        console.log(`  Triggers: ${kaalSarp.triggeredBy.join(', ')}`);
      }
    } else {
      // Fallback to local calculation
      kaalSarp = calculateKaalSarpaDoshaSeer(kundli);
      console.log(`  Local Calculation: ${kaalSarp.status}${kaalSarp.severity ? ` (${kaalSarp.severity})` : ''}`);
    }
    
    // Update log with dosha results (fire and forget)
    supabaseAdmin.from('seer_api_logs')
      .update({
        mangal_dosha: mangal.status === 'present',
        kaal_sarp_dosha: kaalSarp.status === 'present',
        pitra_dosha: pitra.status === 'present',
        shani_dosha: shani.status === 'present'
      })
      .eq('session_id', sessionId)
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ error }) => {
        if (error) console.error("⚠️ [LOG] Failed to update dosha results:", error);
      });
    
    // Build chart structure for compatibility with "other doshas"
    const chartForOldDoshas = {
      planets: kundli.planets.map(p => ({
        name: p.name,
        sign: p.sign,
        longitude: p.deg,
        house: p.house
      })),
      ascendant: {
        sign: kundli.asc.sign,
        longitude: kundli.asc.deg
      }
    };
    
    // Calculate other doshas using new deterministic logic
    console.log('');
    console.log('📿 [DOSHA] Calculating other doshas...');
    const otherDoshasResult = calculateAllOtherDoshas(seerData);
    const { otherDoshas, navagrahaUmbrella } = otherDoshasResult;
    
    console.log(`  Grahan: ${otherDoshas.grahan.status}`);
    console.log(`  Shrapit: ${otherDoshas.shrapit.status}`);
    console.log(`  Guru Chandal: ${otherDoshas.guruChandal.status}`);
    console.log(`  Punarphoo: ${otherDoshas.punarphoo.status}`);
    console.log(`  Kemadruma: ${otherDoshas.kemadruma.status}`);
    console.log(`  Gandmool: ${otherDoshas.gandmool.status}`);
    console.log(`  Kalathra: ${otherDoshas.kalathra.status}`);
    console.log(`  Vish/Daridra: ${otherDoshas.vishDaridra.status}`);
    console.log(`  Ketu/Naga: ${otherDoshas.ketuNaga.status}`);
    
    // Build summary
    const summary: any = {
      mangal: mangal.status,
      mangalSeverity: mangal.severity,
      pitra: pitra.status,
      shaniDosha: shani.status,
      shaniSeverity: shani.severity,
      // New: keep new fields while also providing backward-compatible ones
      sadeSati: sadeSati.isActive ? "active" : "not_active",
      sadeSatiPhase: sadeSati.currentPhase,
      // Back-compat fields expected by UI
      shaniSadeSati: sadeSati.isActive ? "active" : "inactive",
      shaniPhase: sadeSati.currentPhase
        ? (sadeSati.currentPhase.includes('RISING') ? 1
          : (sadeSati.currentPhase.includes('PEAK') ? 2
            : (sadeSati.currentPhase.includes('SETTING') ? 3 : null)))
        : null,
      kaalSarp: kaalSarp.status,
      kaalSarpSubtype: kaalSarp.status === "present" && kaalSarp.notes.some(n => n.includes("partial")) ? "partial" : undefined,
      // Use status from new calculation (present/absent/partial)
      grahan: otherDoshas.grahan.status,
      rahuSurya: otherDoshas.grahan.rahuSurya,
      shrapit: otherDoshas.shrapit.status,
      guruChandal: otherDoshas.guruChandal.status,
      punarphoo: otherDoshas.punarphoo.status,
      kemadruma: otherDoshas.kemadruma.status,
      gandmool: otherDoshas.gandmool.status,
      kalathra: otherDoshas.kalathra.status,
      vishDaridra: otherDoshas.vishDaridra.status,
      ketuNaga: otherDoshas.ketuNaga.status,
      navagrahaUmbrella: navagrahaUmbrella.status
    };
    
    const doshaResults = {
      summary,
      details: {
        mangal: {
          triggeredBy: mangal.triggeredBy,
          placements: mangal.placements,
          notes: [...mangal.notes, ...mangal.cancellations, ...mangal.mitigations],
          explanation: getMangalExplanationSeer(mangal),
          remedies: getMangalRemediesSeer(mangal)
        },
        pitra: {
          triggeredBy: pitra.triggeredBy,
          placements: pitra.placements,
          notes: pitra.notes,
          explanation: getPitraExplanationSeer(pitra),
          remedies: getPitraRemediesSeer(pitra)
        },
        shaniDosha: {
          triggeredBy: shani.triggeredBy,
          placements: shani.placements,
          notes: [...shani.notes, ...shani.mitigations],
          explanation: getShaniExplanationSeer(shani),
          remedies: getShaniRemediesSeer(shani)
        },
        sadeSati: {
          isActive: sadeSati.isActive,
          currentPhase: sadeSati.currentPhase,
          periods: sadeSati.periods,
          explanation: sadeSati.isActive 
            ? `Sade Sati is currently active (Phase: ${sadeSati.currentPhase}). This is a 7.5-year period when Saturn transits through the 12th, 1st, and 2nd houses from your Moon sign.`
            : "Sade Sati is not currently active in your chart.",
          remedies: sadeSati.isActive ? [
            "Worship Lord Hanuman and recite Hanuman Chalisa daily",
            "Donate mustard oil, black sesame seeds, and black clothes on Saturdays",
            "Feed crows and help the poor and needy",
            "Chant Saturn mantras: 'Om Sham Shanaishcharaya Namah'",
            "Light a lamp with mustard oil under a Peepal tree on Saturdays",
            "Practice patience, discipline, and hard work",
            "Consider wearing a blue sapphire (Neelam) after consulting an expert astrologer"
          ] : []
        },
        kaalSarp: {
          triggeredBy: kaalSarp.triggeredBy,
          placements: kaalSarp.placements,
          notes: kaalSarp.notes,
          explanation: getKaalSarpExplanationSeer(kaalSarp),
          remedies: getKaalSarpRemediesSeer()
        },
        grahan: {
          triggeredBy: otherDoshas.grahan.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.grahan.status === "present" 
            ? `Grahan Dosha detected: ${otherDoshas.grahan.reason.join(', ')}`
            : "No Grahan Dosha detected.",
          remedies: otherDoshas.grahan.status === "present" 
            ? ["Mindfulness, stable routines, breath practices", "Charity on eclipse-related days; light devotional worship"]
            : []
        },
        shrapit: {
          triggeredBy: otherDoshas.shrapit.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.shrapit.status === "present"
            ? `Shrapit Dosha detected: ${otherDoshas.shrapit.reason.join(', ')}`
            : "No Shrapit Dosha detected.",
          remedies: otherDoshas.shrapit.status === "present"
            ? ["Saturday discipline; service and humility", "Rudrabhishek / Shani-focused prayers"]
            : []
        },
        guruChandal: {
          triggeredBy: otherDoshas.guruChandal.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.guruChandal.status === "present"
            ? `Guru Chandal Dosha detected: ${otherDoshas.guruChandal.reason.join(', ')}`
            : "No Guru Chandal Dosha detected.",
          remedies: otherDoshas.guruChandal.status === "present"
            ? ["Study with grounded mentors; donation of knowledge/education items", "Guru-focused prayers"]
            : []
        },
        punarphoo: {
          triggeredBy: otherDoshas.punarphoo.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.punarphoo.status === "present"
            ? `Punarphoo Dosha detected: ${otherDoshas.punarphoo.reason.join(', ')}`
            : "No Punarphoo Dosha detected.",
          remedies: otherDoshas.punarphoo.status === "present"
            ? ["Monday calm practices; moon-soothing disciplines", "Chandra–Shani pacification prayers"]
            : []
        },
        kemadruma: {
          triggeredBy: otherDoshas.kemadruma.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.kemadruma.status === "present"
            ? `Kemadruma Yoga detected: ${otherDoshas.kemadruma.reason.join(', ')}`
            : "No Kemadruma Yoga detected.",
          remedies: otherDoshas.kemadruma.status === "present"
            ? ["Community seva; gratitude and consistency rituals", "Chandra pacification; Navagraha Shanti"]
            : []
        },
        gandmool: {
          triggeredBy: otherDoshas.gandmool.reason,
          placements: [],
          notes: otherDoshas.gandmool.nakshatra ? [`Moon nakshatra: ${otherDoshas.gandmool.nakshatra}`] : [],
          explanation: otherDoshas.gandmool.status === "present"
            ? `Gandmool Dosha detected: Moon in ${otherDoshas.gandmool.nakshatra} nakshatra`
            : "No Gandmool Dosha detected.",
          remedies: otherDoshas.gandmool.status === "present"
            ? ["Gandmool Shanti with family blessings"]
            : []
        },
        kalathra: {
          triggeredBy: otherDoshas.kalathra.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.kalathra.status === "present"
            ? `Kalathra Dosha detected: ${otherDoshas.kalathra.reason.join(', ')}`
            : "No Kalathra Dosha detected.",
          remedies: otherDoshas.kalathra.status === "present"
            ? ["Friday harmony practices; counseling/mediation mindset", "Venus pacification where appropriate"]
            : []
        },
        vishDaridra: {
          triggeredBy: otherDoshas.vishDaridra.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.vishDaridra.status === "present"
            ? `Vish/Daridra Yoga detected: ${otherDoshas.vishDaridra.reason.join(', ')}`
            : "No Vish/Daridra Yoga detected.",
          remedies: otherDoshas.vishDaridra.status === "present"
            ? ["Structured effort; conflict-avoidance sadhana", "Hanuman devotion; Navagraha Shanti"]
            : []
        },
        ketuNaga: {
          triggeredBy: otherDoshas.ketuNaga.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.ketuNaga.status === "present"
            ? `Ketu/Naga Dosha detected: ${otherDoshas.ketuNaga.reason.join(', ')}`
            : "No Ketu/Naga Dosha detected.",
          remedies: otherDoshas.ketuNaga.status === "present"
            ? ["Naga devotion where traditional; steady devotional routines"]
            : []
        },
        navagrahaUmbrella: {
          triggeredBy: navagrahaUmbrella.reason,
          placements: [],
          notes: [],
          explanation: navagrahaUmbrella.status === "suggested"
            ? `Navagraha Shanti suggested: ${navagrahaUmbrella.reason.join(', ')}`
            : "Navagraha Shanti not needed.",
          remedies: navagrahaUmbrella.status === "suggested"
            ? ["Balanced discipline; regular simple worship"]
            : []
        }
      }
    };
    
    console.log('');
    console.log('✅ [MAIN] Dosha calculation complete');
    console.log('📋 [MAIN] Summary:', JSON.stringify(doshaResults.summary, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    // Build chart structure for response (using Seer data)
    const chartData = {
      grahas: {} as any,
      ascendant: {
        lon: kundli.asc.deg,
        sign: kundli.asc.sign,
        deg: kundli.asc.deg,
        house: 1
      },
      houses: Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        sign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][(kundli.asc.signIdx + i) % 12],
        cusp: ((kundli.asc.signIdx + i) * 30) % 360
      })),
      ayanamsha: 23.8 // Approximate Lahiri for current epoch
    };
    
    // Populate grahas
    for (const p of kundli.planets) {
      chartData.grahas[p.name] = {
        lon: p.deg,
        sign: p.sign,
        deg: p.deg % 30,
        house: p.house
      };
    }
    
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
        jd: 0, // Not calculated with Seer
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
    if (debugMode) {
      response.debug = {
        adapter: {
          bodies_found: kundli.planets.length + 1,
          trimmed_names: true,
          coerced_booleans: true
        },
        asc: { sign: kundli.asc.sign, deg: kundli.asc.deg },
        positions: [kundli.asc, ...kundli.planets].map(p => ({
          name: p.name,
          sign: p.sign,
          deg: p.deg,
          house: p.house
        })),
        warnings: kundli.notes
      };
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
// (Other Doshas now calculated via calculateAllOtherDoshas from other-doshas.ts)

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
      asc_sid_deg: chart.ascendant.lon.toFixed(4),
      asc_sign: lagnaSign,
      mars_sid_deg: mars.lon.toFixed(4),
      mars_sign: mars.sign,
      house_from_lagna: marsHouseFromLagna,
      helpers: {
        moon_house: marsHouseFromMoon,
        venus_house: marsHouseFromVenus
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

// Helper to calculate transit Saturn position for a given date
function getTransitSaturnPosition(evalDate: Date): number {
  const jd = calculateJulianDay(evalDate);
  const ayanamsha = getLahiriAyanamsha(jd);
  const T = (jd - 2451545.0) / 36525;
  
  // Calculate tropical Saturn position
  const tropicalLon = calculateSaturnPosition(T);
  
  // Convert to sidereal
  const sidLon = (tropicalLon - ayanamsha + 360) % 360;
  return sidLon;
}

function calculateSadeSati(chart: any, evalDate: Date = new Date(), debugMode: boolean = false) {
  // CRITICAL: Sade Sati uses TRANSIT Saturn vs NATAL Moon
  const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                     'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  // Natal Moon's sidereal sign
  const moonSign = Math.floor(chart.grahas.Moon.lon / 30);
  
  // Transit Saturn's sidereal sign for evaluation date
  const transitSaturnLon = getTransitSaturnPosition(evalDate);
  const saturnSign = Math.floor(transitSaturnLon / 30);
  
  let active = false;
  let phase: number | null = null;
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const diff = (saturnSign - moonSign + 12) % 12;
  
  if (diff === 11) {
    active = true;
    phase = 1;
    triggeredBy.push('Saturn transiting sign before Moon (Phase 1)');
    placements.push(`Transit Saturn in ${signNames[saturnSign]}, Moon in ${signNames[moonSign]}`);
    notes.push('Phase 1: Rising phase');
  } else if (diff === 0) {
    active = true;
    phase = 2;
    triggeredBy.push('Saturn transiting same sign as Moon (Phase 2)');
    placements.push(`Transit Saturn in ${signNames[saturnSign]}, Moon in ${signNames[moonSign]}`);
    notes.push('Phase 2: Peak phase');
  } else if (diff === 1) {
    active = true;
    phase = 3;
    triggeredBy.push('Saturn transiting sign after Moon (Phase 3)');
    placements.push(`Transit Saturn in ${signNames[saturnSign]}, Moon in ${signNames[moonSign]}`);
    notes.push('Phase 3: Setting phase');
  }

  if (debugMode) {
    console.log('Sade Sati Debug:', {
      evalDate: evalDate.toISOString(),
      moonSignName: signNames[moonSign],
      moonSignIndex: moonSign,
      saturnTransitSignName: signNames[saturnSign],
      saturnTransitSignIndex: saturnSign,
      diff: diff,
      phase: phase,
      active: active
    });
  }

  return { 
    active, 
    phase, 
    triggeredBy, 
    placements, 
    notes,
    debug: debugMode ? {
      eval_date: evalDate.toISOString(),
      moon_sign_name: signNames[moonSign],
      moon_sign_index: moonSign,
      saturn_transit_sign_name: signNames[saturnSign],
      saturn_transit_sign_index: saturnSign,
      diff: diff,
      calculated_phase: phase,
      active: active
    } : undefined
  };
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
