import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id, x-visitor-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: job, error } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("id, status, current_phase, progress_percent, report_data, error_message, created_at, completed_at, name")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return job status and data
    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: job.status,
        currentPhase: job.current_phase,
        progressPercent: job.progress_percent,
        report: job.status === "completed" ? job.report_data : null,
        error: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        name: job.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [GET-JOB] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
