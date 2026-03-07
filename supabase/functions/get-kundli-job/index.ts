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
      .select("id, status, current_phase, progress_percent, report_data, error_message, created_at, completed_at, name, heartbeat_at")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedStatus = String(job.status || '').trim().toLowerCase();
    const reportData = job.report_data ?? null;
    const reportFinalityState =
      reportData && typeof reportData === "object"
        ? (
            reportData.isFinal === true ||
            reportData.is_final === true ||
            reportData?.finalization?.isFinal === true ||
            reportData?.finalization?.is_final === true
          )
        : false;
    const hasExplicitFinalityField =
      Boolean(
        reportData &&
        typeof reportData === "object" &&
        (
          typeof reportData.isFinal === "boolean" ||
          typeof reportData.is_final === "boolean" ||
          (reportData.finalization && typeof reportData.finalization === "object" && (
            typeof reportData.finalization.isFinal === "boolean" ||
            typeof reportData.finalization.is_final === "boolean"
          ))
        )
      );
    const reportIsFinal = hasExplicitFinalityField
      ? reportFinalityState
      : Boolean((normalizedStatus === "completed" || Boolean(job.completed_at)) && reportData);
    const reportRevisionRaw = Number(
      reportData?.revision ??
      reportData?.finalization?.revision ??
      reportData?.reportRevision ??
      0
    );
    const reportRevision = Number.isFinite(reportRevisionRaw) ? Math.max(0, Math.floor(reportRevisionRaw)) : 0;

    const completedWithoutReport = (normalizedStatus === 'completed' || Boolean(job.completed_at)) && !reportData;
    const completedWithoutFinal = (normalizedStatus === "completed" || Boolean(job.completed_at)) && Boolean(reportData) && !reportIsFinal;

    let responseStatus = normalizedStatus || job.status;
    let responsePhase = job.current_phase;
    let responseProgress = job.progress_percent;
    let responseCompletedAt = job.completed_at;
    let responseError = job.error_message;

    if (completedWithoutReport || completedWithoutFinal) {
      const waitingPhase = completedWithoutReport
        ? "Report data missing — requeueing finalize"
        : "Report finalization pending — requeueing finalize";
      const nextProgress = Math.max(Number(job.progress_percent || 0), 90);
      const nowIso = new Date().toISOString();

      const { error: healError } = await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "processing",
          current_phase: waitingPhase,
          progress_percent: nextProgress,
          heartbeat_at: nowIso,
          error_message: null,
          completed_at: null,
        })
        .eq("id", jobId);

      if (healError) {
        console.warn("⚠️ [GET-JOB] Failed to requeue finalize for missing report_data:", healError.message);
      } else {
        const stage3Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-kundli-report`;
        const stage3Promise = fetch(stage3Url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ jobId }),
        }).catch((err) => {
          console.error("⚠️ [GET-JOB] Failed to trigger finalize requeue:", err);
        });

        // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(stage3Promise);
        }
      }

      responseStatus = "processing";
      responsePhase = waitingPhase;
      responseProgress = nextProgress;
      responseCompletedAt = null;
      responseError = null;
    }

    const reportReady = responseStatus === 'completed' && Boolean(reportData) && reportIsFinal;

    // Return job status and data
    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: responseStatus,
        currentPhase: responsePhase,
        progressPercent: responseProgress,
        report: reportReady ? reportData : null,
        isFinal: reportReady,
        reportRevision,
        error: responseError,
        createdAt: job.created_at,
        completedAt: responseCompletedAt,
        heartbeatAt: job.heartbeat_at,
        name: job.name,
        waitingForReportData: completedWithoutReport,
        waitingForFinalization: completedWithoutFinal,
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
