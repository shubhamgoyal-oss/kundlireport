import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-visitor-id, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Minimal schema to keep API the same
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
  console.log("[MINIMAL] calculate-dosha handler entered", { method: req.method, url: req.url });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    console.log("[MINIMAL] Raw body:", raw);

    // Allow null gender and fill defaults here
    if (raw && raw.gender == null) {
      raw.gender = "male";
    }
    if (!raw || !raw.name) {
      raw.name = "Default User";
    }

    const parsed = birthInputSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[MINIMAL] Validation failed:", parsed.error.issues);
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
    console.log("[MINIMAL] Parsed input:", input);

    // For now, return a deterministic "no major doshas" response so frontend can work
    const summary = {
      mangal: "absent",
      mangalSeverity: null,
      kaalSarp: "absent",
      kaalSarpType: null,
      pitra: "absent",
      shaniSadeSati: "inactive",
      shaniPhase: null,
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
    } as const;

    const responseBody = {
      success: true,
      summary,
      details: {},
      chart: null,
      calculationId: null,
      metadata: {
        mode: "minimal-debug",
        note: "This is a temporary minimal implementation used for debugging.",
      },
    };

    console.log("[MINIMAL] Returning success response");

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[MINIMAL] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error in calculate-dosha" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
