import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  fetchSeerKundli,
  adaptSeerResponse,
  type SeerKundliRequest,
} from "./seer-adapter.ts";
import {
  calculateMangalDosha as calculateMangalDoshaSeer,
  calculatePitraDosha as calculatePitraDoshaSeer,
  calculateShaniDosha as calculateShaniDoshaSeer,
  calculateKaalSarpaDosha as calculateKaalSarpaDoshaSeer,
} from "./seer-doshas.ts";

// Simple Supabase admin client for DB logging (service role)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-visitor-id, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Minimal input validation (keeps same API contract as existing function)
const birthInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  gender: z.enum(["male", "female"]).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format")
    .or(z.literal(""))
    .optional(),
  tz: z.string().min(1).max(50, "Timezone string too long"),
  lat: z
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  lon: z
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
  unknownTime: z.boolean().optional(),
  place: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("➡️ [V2] calculate-dosha-lite request received", {
      method: req.method,
      url: req.url,
    });

    const rawInput = await req.json();
    console.log("[V2] Raw input:", rawInput);

    // Treat null gender as missing so schema doesn't fail
    if (rawInput && rawInput.gender == null) {
      delete rawInput.gender;
    }

    const validation = birthInputSchema.safeParse(rawInput);
    if (!validation.success) {
      console.error("[V2] Validation failed:", validation.error.issues);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input",
          details: validation.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const input = validation.data;

    // Parse date/time
    const [year, month, day] = input.date.split("-").map(Number);
    let hour = 12;
    let min = 0;

    if (input.time && !input.unknownTime) {
      [hour, min] = input.time.split(":").map(Number);
    }

    // Timezone to numeric offset (keep same behaviour as main function)
    const tzOffsetMap: Record<string, number> = {
      "Asia/Kolkata": 5.5,
      "Asia/Calcutta": 5.5,
      UTC: 0,
      GMT: 0,
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

    console.log("[V2] Seer request:", seerRequest);

    const seerStart = Date.now();
    const { data: seerData, responseTimeMs, status: seerStatus } =
      await fetchSeerKundli(seerRequest);
    console.log("[V2] Seer status/time:", seerStatus, responseTimeMs);

    const kundli = adaptSeerResponse(seerData);
    console.log("[V2] Kundli adapted with", kundli.planets.length, "planets");

    // Major doshas from Seer / local helpers (same logic as original, simplified)
    const mangal = calculateMangalDoshaSeer(kundli);
    const pitra = calculatePitraDoshaSeer(kundli);
    const shani = calculateShaniDoshaSeer(kundli);
    const kaalSarp = calculateKaalSarpaDoshaSeer(kundli);

    // Sade Sati basic extraction from Seer (fallback: inactive)
    const seerVedic = seerData?.data?.vedic_horoscope || seerData?.vedic_horoscope;
    let sadeSatiActive = false;
    let sadeSatiPhase: string | null = null;

    if (seerVedic?.shadhe_sati_dosha &&
      Array.isArray(seerVedic.shadhe_sati_dosha)) {
      const now = Date.now();
      for (const period of seerVedic.shadhe_sati_dosha) {
        const periodTime = parseInt(period.millisecond);
        if (periodTime <= now) {
          if (period.type?.includes("START")) {
            sadeSatiActive = true;
            sadeSatiPhase = period.type;
          } else if (period.type?.includes("END")) {
            sadeSatiActive = false;
            sadeSatiPhase = null;
          }
        }
      }
    }

    // Build summary with all fields UI expects
    const summary: any = {
      mangal: mangal.status,
      mangalSeverity: mangal.severity,
      pitra: pitra.status,
      shaniDosha: shani.status,
      shaniSeverity: shani.severity,
      sadeSati: sadeSatiActive ? "active" : "not_active",
      sadeSatiPhase,
      shaniSadeSati: sadeSatiActive ? "active" : "inactive",
      shaniPhase: sadeSatiPhase
        ? (sadeSatiPhase.includes("RISING")
          ? 1
          : sadeSatiPhase.includes("PEAK")
          ? 2
          : sadeSatiPhase.includes("SETTING")
          ? 3
          : null)
        : null,
      kaalSarp: kaalSarp.status,
      // Other doshas: mark as safely absent so UI works without full logic
      grahan: "absent",
      grahanSeverity: undefined,
      grahanSubtype: undefined,
      rahuSurya: "absent",
      shrapit: "absent",
      guruChandal: "absent",
      punarphoo: "absent",
      kemadruma: "absent",
      gandmool: "absent",
      kalathra: "absent",
      vishDaridra: "absent",
      ketuNaga: "absent",
      navagrahaUmbrella: "not_suggested",
    };

    const doshaResults = {
      summary,
      details: {
        mangal: {
          triggeredBy: mangal.triggeredBy,
          placements: mangal.placements,
          notes: [...mangal.notes, ...mangal.cancellations, ...mangal.mitigations],
          explanation: "", // Original long explanations are omitted in lite version
          remedies: [],
        },
        pitra: {
          triggeredBy: pitra.triggeredBy,
          placements: pitra.placements,
          notes: pitra.notes,
          explanation: "",
          remedies: [],
        },
        shaniDosha: {
          triggeredBy: shani.triggeredBy,
          placements: shani.placements,
          notes: [...shani.notes, ...shani.mitigations],
          explanation: "",
          remedies: [],
        },
        sadeSati: {
          isActive: sadeSatiActive,
          currentPhase: sadeSatiPhase,
          periods: seerVedic?.shadhe_sati_dosha ?? [],
          explanation: "",
          remedies: [],
        },
        kaalSarp: {
          triggeredBy: kaalSarp.triggeredBy,
          placements: kaalSarp.placements,
          notes: kaalSarp.notes,
          explanation: "",
          remedies: [],
        },
      },
    };

    console.log("[V2] Summary:", JSON.stringify(doshaResults.summary));

    // Simple chart structure for UI compatibility (based on Seer kundli)
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
        sign: [
          "Aries",
          "Taurus",
          "Gemini",
          "Cancer",
          "Leo",
          "Virgo",
          "Libra",
          "Scorpio",
          "Sagittarius",
          "Capricorn",
          "Aquarius",
          "Pisces",
        ][(kundli.asc.signIdx + i) % 12],
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

    // Persist minimal calculation to DB (same table, but fewer fields)
    const sessionId = req.headers.get("x-session-id") || "unknown";
    const visitorId = req.headers.get("x-visitor-id") || "unknown";

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
          name: rawInput.name ?? "",
          date_of_birth: input.date,
          time_of_birth: input.time || "00:00",
          place_of_birth: input.place || `${input.lat},${input.lon}`,
          latitude: input.lat,
          longitude: input.lon,
          user_country: null,
          user_city: null,
          user_latitude: null,
          user_longitude: null,
          mangal_dosha: isActive(summary.mangal),
          kaal_sarp_dosha: isActive(summary.kaalSarp),
          pitra_dosha: isActive(summary.pitra),
          sade_sati: isActive(summary.shaniSadeSati),
          grahan_dosha: false,
          shrapit_dosha: false,
          guru_chandal_dosha: false,
          punarphoo_dosha: false,
          kemadruma_yoga: false,
          gandmool_dosha: false,
          kalathra_dosha: false,
          vish_daridra_yoga: false,
          ketu_naga_dosha: false,
          navagraha_umbrella: false,
          calculation_results: doshaResults,
          book_puja_clicked: false,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("[V2] Failed to save dosha calculation:", insertError);
      } else if (inserted && (inserted as any).id) {
        calculationId = (inserted as any).id as string;
        console.log("[V2] Saved dosha calculation with id", calculationId);
      }
    } catch (dbErr) {
      console.error("[V2] Error inserting dosha calculation:", dbErr);
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
        rules_version: "india-popular-v2-lite",
      },
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[V2] Fatal error in calculate-dosha-lite:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to calculate dosha. Please verify your birth details and try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
