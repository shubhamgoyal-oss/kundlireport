export interface JobEventInput {
  jobId: string;
  phase: string;
  eventType: "start" | "progress" | "retry" | "success" | "fail" | "info";
  agent?: string | null;
  message?: string | null;
  metrics?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}

export async function createJobEvent(
  supabase: any,
  input: JobEventInput,
): Promise<void> {
  try {
    await supabase
      .from("kundli_job_events")
      .insert({
        job_id: input.jobId,
        phase: input.phase,
        event_type: input.eventType,
        agent: input.agent || null,
        message: input.message || null,
        metrics: input.metrics || null,
        payload: input.payload || null,
      });
  } catch (error) {
    // Event logging must never break report generation.
    console.warn("[JOB-EVENT] Failed to write event:", error);
  }
}

export async function touchJobHeartbeat(
  supabase: any,
  jobId: string,
): Promise<void> {
  try {
    await supabase
      .from("kundli_report_jobs")
      .update({ heartbeat_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (error) {
    console.warn("[JOB-EVENT] Failed to update heartbeat:", error);
  }
}
