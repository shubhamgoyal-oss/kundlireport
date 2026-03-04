import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id, x-visitor-id",
};

interface JobRequest {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  language?: "en" | "hi" | "te" | "kn" | "mr" | "ta";
  gender?: "M" | "F" | "O";
  hasTime?: boolean; // false when birth time is unknown (default: true)
  visitorId: string;
  sessionId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JobRequest = await req.json();
    console.log("📝 [START-JOB] Creating Kundli report job for:", body.name, "| GENDER received from frontend:", JSON.stringify(body.gender), "| raw body keys:", Object.keys(body).join(","));

    const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, timezone, language = "en", gender = "M", hasTime = true, visitorId, sessionId } = body;
    console.log(`📝 [START-JOB] GENDER after destructure: "${gender}" (body.gender was: "${body.gender}") hasTime=${hasTime}`);


    // Validate required fields
    if (!name || !dateOfBirth || !timeOfBirth || latitude === undefined || longitude === undefined || !visitorId || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insert job record
    const { data: job, error: insertError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .insert({
        visitor_id: visitorId,
        session_id: sessionId,
        name,
        date_of_birth: dateOfBirth,
        time_of_birth: timeOfBirth,
        place_of_birth: placeOfBirth,
        latitude,
        longitude,
        timezone,
        language,
        gender,
        has_time: hasTime !== false, // Default true; false when time is unknown
        status: "pending",
        progress_percent: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("❌ [START-JOB] Failed to create job:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [START-JOB] Job created:", job.id);

    // Trigger the worker function asynchronously using EdgeRuntime.waitUntil
    const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-kundli-job`;
    
    // Use waitUntil to keep the worker running after response is sent
    const workerPromise = fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => {
      console.error("⚠️ [START-JOB] Failed to trigger worker:", err);
    });
    
    // EdgeRuntime.waitUntil keeps the function alive for the background task
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(workerPromise);
    }

    return new Response(
      JSON.stringify({ jobId: job.id, status: "pending" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [START-JOB] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
