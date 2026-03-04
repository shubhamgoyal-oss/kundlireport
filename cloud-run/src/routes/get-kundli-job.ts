import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const jobId = req.query.jobId as string;

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { data: job, error } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("id, status, current_phase, progress_percent, report_data, error_message, created_at, completed_at, name, heartbeat_at")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      currentPhase: job.current_phase,
      progressPercent: job.progress_percent,
      report: job.status === "completed" ? job.report_data : null,
      error: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      heartbeatAt: job.heartbeat_at,
      name: job.name,
    });
  } catch (error) {
    console.error("❌ [GET-JOB] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
