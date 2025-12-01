import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { fetchSeerKundli, adaptSeerResponse, type SeerKundliRequest } from "./seer-adapter.ts";
import {
  calculatePitraDosha as calculatePitraDoshaSeer,
  calculateShaniDosha as calculateShaniDoshaSeer,
} from "./seer-doshas.ts";
import {
  calculateKaalSarpaDoshaAlgorithmic,
  calculateMangalDoshaAlgorithmic,
  calculateSadeSatiAlgorithmic,
} from "./algorithmic-doshas.ts";
import {
  calculateAllOtherDoshas
} from "./other-doshas.ts";
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

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-visitor-id, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const birthInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  gender: z.enum(["male", "female"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format").or(z.literal("")).optional(),
  tz: z.string().min(1).max(50, "Timezone string too long"),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  unknownTime: z.boolean().optional(),
  place: z.string().optional(),
});

serve(async (req) => {
  console.log("[CALC] Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json();
    console.log("[CALC] Body parsed");

    // Normalize null gender
    if (raw && raw.gender == null) {
      raw.gender = "male";
    }
    if (!raw || !raw.name) {
      raw.name = "Default User";
    }

    const parsed = birthInputSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[CALC] Validation failed:", parsed.error.issues);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input",
          details: parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const input = parsed.data;

    // Parse date/time for Seer API
    const [year, month, day] = input.date.split("-").map(Number);
    let hour = 12;
    let min = 0;

    if (input.time && !input.unknownTime) {
      [hour, min] = input.time.split(":").map(Number);
    }

    const tzOffsetMap: Record<string, number> = {
      "Asia/Kolkata": 5.5,
      "Asia/Calcutta": 5.5,
      "UTC": 0,
      "GMT": 0,
    };
    const tzone = tzOffsetMap[input.tz] || 5.5;

    const genderCode = input.gender === "female" ? "F" : "M";

    const seerRequest: SeerKundliRequest = {
      day,
      month,
      year,
      hour,
      min,
      lat: input.lat,
      lon: input.lon,
      tzone,
      user_id: 505,
      name: input.name,
      gender: genderCode,
    };

    console.log("[CALC] Calling Seer API...");
    const { data: seerData, responseTimeMs, status: seerStatus } = await fetchSeerKundli(seerRequest);
    console.log("[CALC] Seer responded:", seerStatus, "in", responseTimeMs, "ms");

    console.log("[CALC] Adapting Seer response...");
    const kundli = adaptSeerResponse(seerData);
    console.log("[CALC] Kundli adapted:", kundli.planets.length, "planets");

    // Calculate doshas ALGORITHMICALLY from planetary positions
    // DO NOT trust Seer dosha flags!
    console.log("[CALC] Calculating doshas algorithmically from planet positions...");
    
    // Extract vedic horoscope for reference
    const seerVedic = seerData?.data?.vedic_horoscope || seerData?.vedic_horoscope;

    // Mangal Dosha (Algorithmic)
    const mangalAlgo = calculateMangalDoshaAlgorithmic(kundli);
    console.log("[CALC] Mangal (Algorithmic):", mangalAlgo.status, mangalAlgo.reasons);
    
    const mangal = {
      status: mangalAlgo.status as any,
      severity: mangalAlgo.status === "absent" ? undefined : 
                (mangalAlgo.nullified ? 'mild' as const : 'moderate' as const),
      triggeredBy: mangalAlgo.reasons,
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: [],
      sources: mangalAlgo.sources,
      nullified: mangalAlgo.nullified
    };
    console.log("[CALC] Mangal:", mangal.status);

    // Pitra Dosha
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
    } else {
      pitra = calculatePitraDoshaSeer(kundli);
    }
    console.log("[CALC] Pitra:", pitra.status);

    // Shani Dosha
    const shani = calculateShaniDoshaSeer(kundli);
    console.log("[CALC] Shani:", shani.status);

    // Sade Sati (Algorithmic)
    const sadeSatiAlgo = calculateSadeSatiAlgorithmic(kundli, seerData);
    console.log("[CALC] Sade Sati (Algorithmic):", sadeSatiAlgo.active ? "active" : "inactive", 
                sadeSatiAlgo.phase || "no phase", sadeSatiAlgo.reasons);
    
    const sadeSatiActive = sadeSatiAlgo.active;
    const sadeSatiPhase = sadeSatiAlgo.phase 
      ? (sadeSatiAlgo.phase === "rising" ? "RISING_START" :
         sadeSatiAlgo.phase === "peak" ? "PEAK_START" : "SETTING_START")
      : null;
    console.log("[CALC] Sade Sati:", sadeSatiActive ? "active" : "inactive");

    // Kaal Sarp Dosha (Algorithmic)
    const kaalSarpAlgo = calculateKaalSarpaDoshaAlgorithmic(kundli);
    console.log("[CALC] Kaal Sarp (Algorithmic):", kaalSarpAlgo.status, kaalSarpAlgo.type, kaalSarpAlgo.reasons);
    
    const kaalSarp = {
      status: (kaalSarpAlgo.status === "present_full" || kaalSarpAlgo.status === "present_partial") 
        ? 'present' as const 
        : 'absent' as const,
      severity: kaalSarpAlgo.status === "present_full" 
        ? 'strong' as const 
        : (kaalSarpAlgo.status === "present_partial" ? 'moderate' as const : undefined),
      triggeredBy: kaalSarpAlgo.reasons,
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: kaalSarpAlgo.type 
        ? [`Type: ${kaalSarpAlgo.type}`, `Orientation: ${kaalSarpAlgo.orientation}`]
        : [],
      algorithmicStatus: kaalSarpAlgo.status,
      variant: kaalSarpAlgo.type
    };
    console.log("[CALC] Kaal Sarp:", kaalSarp.status);

    // Other doshas
    console.log("[CALC] Calculating other doshas...");
    const otherDoshasResult = calculateAllOtherDoshas(seerData);
    const { otherDoshas, navagrahaUmbrella } = otherDoshasResult;
    console.log("[CALC] Other doshas calculated");

    // Build summary
    const summary: any = {
      mangal: mangal.status,
      mangalSeverity: mangal.severity,
      pitra: pitra.status,
      shaniDosha: shani.status,
      sadeSati: sadeSatiActive ? "active" : "not_active",
      sadeSatiPhase,
      shaniSadeSati: sadeSatiActive ? "active" : "inactive",
      shaniPhase: sadeSatiPhase
        ? (sadeSatiPhase.includes('RISING') ? 1
          : (sadeSatiPhase.includes('PEAK') ? 2
            : (sadeSatiPhase.includes('SETTING') ? 3 : null)))
        : null,
      kaalSarp: kaalSarp.status,
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
          isActive: sadeSatiActive,
          currentPhase: sadeSatiPhase,
          algorithmicPhase: sadeSatiAlgo.phase,
          source: sadeSatiAlgo.source,
          window: sadeSatiAlgo.window,
          periods: (seerData?.vedic_horoscope || seerData?.data?.vedic_horoscope)?.shadhe_sati_dosha ?? [],
          explanation: sadeSatiActive 
            ? `Sade Sati is currently active in ${sadeSatiAlgo.phase || "unknown"} phase. ${sadeSatiAlgo.reasons.join('. ')}`
            : "Sade Sati is not currently active in your chart.",
          remedies: sadeSatiActive ? [
            "Worship Lord Hanuman and recite Hanuman Chalisa daily"
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
            ? ["Mindfulness, stable routines, breath practices"]
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
            ? ["Saturday discipline; service and humility"]
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
            ? ["Study with grounded mentors; donation of knowledge/education items"]
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
            ? ["Monday calm practices; moon-soothing disciplines"]
            : []
        },
        kemadruma: {
          triggeredBy: otherDoshas.kemadruma.reason,
          placements: [],
          notes: [],
          explanation: otherDoshas.kemadruma.status === "present"
            ? `Kemadruma Yoga detected: ${otherDoshas.kemadruma.reason.join(', ')}`
            : otherDoshas.kemadruma.status === "partial"
            ? `Kemadruma Yoga partially indicated: ${otherDoshas.kemadruma.reason.join(', ')}`
            : "No Kemadruma Yoga detected.",
          remedies: otherDoshas.kemadruma.status === "present" || otherDoshas.kemadruma.status === "partial"
            ? ["Community seva; gratitude and consistency rituals"]
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
            ? ["Friday harmony practices; counseling/mediation mindset"]
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
            ? ["Structured effort; conflict-avoidance sadhana"]
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

    console.log("[CALC] Building chart data...");
    const chartData = {
      grahas: {} as any,
      ascendant: {
        lon: kundli.asc.deg,
        sign: kundli.asc.sign,
        deg: kundli.asc.deg,
        house: 1,
      },
      houses: Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        sign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][(kundli.asc.signIdx + i) % 12],
        cusp: ((kundli.asc.signIdx + i) * 30) % 360,
      })),
      ayanamsha: 23.8,
    };

    for (const p of kundli.planets) {
      chartData.grahas[p.name] = {
        lon: p.deg,
        sign: p.sign,
        deg: p.deg % 30,
        house: p.house,
      };
    }

    // Persist to database
    console.log("[CALC] Saving to database...");
    const sessionId = req.headers.get("x-session-id") || "unknown";
    const visitorId = req.headers.get("x-visitor-id") || "unknown";
    
    // Extract country from request headers (Cloudflare provides this)
    const userCountry = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
    console.log("[CALC] User country from headers:", userCountry);

    const isActive = (status: unknown): boolean => {
      if (typeof status === "boolean") return status;
      const s = String(status ?? "").toLowerCase();
      return s === "present" || s === "active" || s === "suggested" || s === "partial";
    };

    let calculationId: string | null = null;

    try {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("dosha_calculator2")
        .insert({
          visitor_id: visitorId,
          session_id: sessionId,
          user_id: null,
          name: raw.name ?? '',
          date_of_birth: input.date,
          time_of_birth: input.time || "00:00",
          place_of_birth: input.place || `${input.lat},${input.lon}`,
          latitude: input.lat,
          longitude: input.lon,
          user_country: userCountry,
          user_city: null,
          user_latitude: null,
          user_longitude: null,
          mangal_dosha: isActive(summary.mangal),
          kaal_sarp_dosha: isActive(summary.kaalSarp),
          pitra_dosha: isActive(summary.pitra),
          sade_sati: isActive(summary.shaniSadeSati),
          grahan_dosha: isActive(summary.grahan),
          shrapit_dosha: isActive(summary.shrapit),
          guru_chandal_dosha: isActive(summary.guruChandal),
          punarphoo_dosha: isActive(summary.punarphoo),
          kemadruma_yoga: isActive(summary.kemadruma),
          gandmool_dosha: isActive(summary.gandmool),
          kalathra_dosha: isActive(summary.kalathra),
          vish_daridra_yoga: isActive(summary.vishDaridra),
          ketu_naga_dosha: isActive(summary.ketuNaga),
          navagraha_umbrella: isActive(summary.navagrahaUmbrella),
          calculation_results: doshaResults,
          book_puja_clicked: false,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("[CALC] Failed to save:", insertError);
      } else if (inserted && (inserted as any).id) {
        calculationId = (inserted as any).id as string;
        console.log("[CALC] Saved with id:", calculationId);
      }
    } catch (dbErr) {
      console.error("[CALC] DB error:", dbErr);
    }

    const responseBody = {
      success: true,
      summary: doshaResults.summary,
      details: doshaResults.details,
      chart: chartData,
      calculationId,
      metadata: {
        ayanamsha: "Lahiri",
        system: "Sidereal",
        calculationUTC: new Date().toISOString(),
        rules_version: "india-popular-v1",
      },
    };

    console.log("[CALC] Returning response");

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CALC] Fatal error:", error);
    console.error("[CALC] Stack:", (error as any)?.stack);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to calculate dosha. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
