import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-visitor-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId") || "";
    const afterSeqValue = Number(url.searchParams.get("afterSeq") || "0");
    const limitValue = Number(url.searchParams.get("limit") || "100");
    const afterSeq = Number.isFinite(afterSeqValue) ? afterSeqValue : 0;
    const limit = Math.min(500, Math.max(1, Number.isFinite(limitValue) ? limitValue : 100));

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: job, error: jobError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("id, session_id, visitor_id, status, current_phase, progress_percent")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reqSessionId = req.headers.get("x-session-id") || "";
    const reqVisitorId = req.headers.get("x-visitor-id") || "";
    const authorized = (reqSessionId && reqSessionId === job.session_id)
      || (reqVisitorId && reqVisitorId === job.visitor_id);

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("kundli_job_events")
      .select("id, seq, ts, phase, agent, event_type, message, metrics, payload")
      .eq("job_id", jobId)
      .gt("seq", afterSeq)
      .order("seq", { ascending: true })
      .limit(limit);

    if (eventsError) {
      throw eventsError;
    }

    const lastSeq = (events && events.length > 0)
      ? Number(events[events.length - 1].seq)
      : afterSeq;

    return new Response(
      JSON.stringify({
        jobId,
        status: job.status,
        currentPhase: job.current_phase,
        progressPercent: job.progress_percent,
        afterSeq,
        lastSeq,
        events: events || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ [GET-JOB-EVENTS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
