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
        const stage3Url = `http://localhost:${process.env.PORT || 8080}/finalize-kundli-report`;
        fetch(stage3Url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        }).catch((err) => {
          console.error("⚠️ [GET-JOB] Failed to trigger finalize requeue:", err);
        });
      }

      responseStatus = "processing";
      responsePhase = waitingPhase;
      responseProgress = nextProgress;
      responseCompletedAt = null;
      responseError = null;
    }

    const reportReady = responseStatus === 'completed' && Boolean(reportData) && reportIsFinal;

    res.json({
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
    });
  } catch (error) {
    console.error("❌ [GET-JOB] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
