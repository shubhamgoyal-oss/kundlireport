-- Add operational metadata columns for deterministic pipeline debugging
ALTER TABLE public.kundli_report_jobs
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_language_mode TEXT,
  ADD COLUMN IF NOT EXISTS language_qc JSONB,
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS debug_summary JSONB,
  ADD COLUMN IF NOT EXISTS failure_code TEXT;

-- Event timeline table for technical console polling
CREATE TABLE IF NOT EXISTS public.kundli_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.kundli_report_jobs(id) ON DELETE CASCADE,
  seq BIGSERIAL NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  phase TEXT NOT NULL,
  agent TEXT,
  event_type TEXT NOT NULL,
  message TEXT,
  metrics JSONB,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_kundli_job_events_job_seq
  ON public.kundli_job_events(job_id, seq);

CREATE INDEX IF NOT EXISTS idx_kundli_job_events_job_ts_desc
  ON public.kundli_job_events(job_id, ts DESC);

ALTER TABLE public.kundli_job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view kundli job events by session" ON public.kundli_job_events;
CREATE POLICY "Users can view kundli job events by session"
  ON public.kundli_job_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.kundli_report_jobs j
      WHERE j.id = kundli_job_events.job_id
        AND (
          j.session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
          OR j.visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id')
        )
    )
  );

CREATE OR REPLACE FUNCTION public.cleanup_kundli_job_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.kundli_job_events
  WHERE ts < now() - interval '24 hours';
END;
$$;

-- Schedule hourly cleanup if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('kundli_job_events_24h_cleanup');
    EXCEPTION WHEN OTHERS THEN
      -- no-op if not already scheduled
      NULL;
    END;

    PERFORM cron.schedule(
      'kundli_job_events_24h_cleanup',
      '5 * * * *',
      'SELECT public.cleanup_kundli_job_events();'
    );
  END IF;
END;
$$;
