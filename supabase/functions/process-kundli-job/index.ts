import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    console.log("🔄 [PROCESS-JOB] Starting job:", jobId);

    // Fetch job details
    const { data: job, error: fetchError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      console.error("❌ [PROCESS-JOB] Job not found:", jobId);
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    // Update status to processing
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Initializing", 5);

    const { name, date_of_birth, time_of_birth, place_of_birth, latitude, longitude, timezone, language, gender } = job;

    // Call the existing generate-kundli-report function
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Generating comprehensive report", 10);
    
    const reportUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-kundli-report`;
    console.log("🌐 [PROCESS-JOB] Calling generate-kundli-report...");
    
    const reportResponse = await fetch(reportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        name,
        dateOfBirth: date_of_birth,
        timeOfBirth: time_of_birth,
        placeOfBirth: place_of_birth,
        latitude,
        longitude,
        timezone,
        language,
        gender,
      }),
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error("❌ [PROCESS-JOB] Report generation failed:", errorText);
      throw new Error(`Report generation failed: ${reportResponse.status}`);
    }

    const report = await reportResponse.json();
    console.log("✅ [PROCESS-JOB] Report generated successfully");

    // Mark job as completed
    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "completed",
        current_phase: "Complete",
        progress_percent: 100,
        report_data: report,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`✅ [PROCESS-JOB] Job ${jobId} completed`);

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [PROCESS-JOB] Error:", error);
    
    // Mark job as failed
    if (jobId) {
      await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: string,
  phase: string,
  progress: number
) {
  await supabase
    .from("kundli_report_jobs")
    .update({
      status,
      current_phase: phase,
      progress_percent: progress,
    })
    .eq("id", jobId);
}
