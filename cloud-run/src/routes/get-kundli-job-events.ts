import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const jobId = (req.query.jobId as string) || "";
    const afterSeqValue = Number(req.query.afterSeq || "0");
    const limitValue = Number(req.query.limit || "100");
    const afterSeq = Number.isFinite(afterSeqValue) ? afterSeqValue : 0;
    const limit = Math.min(500, Math.max(1, Number.isFinite(limitValue) ? limitValue : 100));

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { data: job, error: jobError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("id, session_id, visitor_id, status, current_phase, progress_percent")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const reqSessionId = req.headers["x-session-id"] as string || "";
    const reqVisitorId = req.headers["x-visitor-id"] as string || "";
    const authorized = (reqSessionId && reqSessionId === job.session_id)
      || (reqVisitorId && reqVisitorId === job.visitor_id);

    if (!authorized) {
      return res.status(403).json({ error: "Forbidden" });
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

    res.json({
      jobId,
      status: job.status,
      currentPhase: job.current_phase,
      progressPercent: job.progress_percent,
      afterSeq,
      lastSeq,
      events: events || [],
    });
  } catch (error) {
    console.error("❌ [GET-JOB-EVENTS] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
