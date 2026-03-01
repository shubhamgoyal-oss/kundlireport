-- Audit tables for full Kundli traceability:
-- 1) input payloads
-- 2) external/API calls
-- 3) generated report + PDF artifacts

CREATE TABLE IF NOT EXISTS public.kundli_report_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.kundli_report_jobs(id) ON DELETE CASCADE,
  visitor_id TEXT,
  session_id TEXT,
  source TEXT NOT NULL DEFAULT 'web_form',
  input_payload JSONB NOT NULL,
  normalized_input JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kundli_api_calls (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.kundli_report_jobs(id) ON DELETE CASCADE,
  phase TEXT,
  provider TEXT NOT NULL,
  api_name TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kundli_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.kundli_report_jobs(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  generation_mode TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  report_summary JSONB,
  pdf_storage_bucket TEXT,
  pdf_storage_path TEXT,
  pdf_signed_url TEXT,
  pdf_size_bytes BIGINT,
  page_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kundli_report_inputs_job
  ON public.kundli_report_inputs(job_id);

CREATE INDEX IF NOT EXISTS idx_kundli_api_calls_job_created
  ON public.kundli_api_calls(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kundli_api_calls_provider
  ON public.kundli_api_calls(provider, api_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kundli_generated_reports_status
  ON public.kundli_generated_reports(status, created_at DESC);

DROP TRIGGER IF EXISTS update_kundli_generated_reports_updated_at ON public.kundli_generated_reports;
CREATE TRIGGER update_kundli_generated_reports_updated_at
  BEFORE UPDATE ON public.kundli_generated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.kundli_report_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kundli_api_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kundli_generated_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view kundli report inputs by session" ON public.kundli_report_inputs;
CREATE POLICY "Users can view kundli report inputs by session"
  ON public.kundli_report_inputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.kundli_report_jobs j
      WHERE j.id = kundli_report_inputs.job_id
        AND (
          j.session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
          OR j.visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id')
        )
    )
  );

DROP POLICY IF EXISTS "Users can view kundli api calls by session" ON public.kundli_api_calls;
CREATE POLICY "Users can view kundli api calls by session"
  ON public.kundli_api_calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.kundli_report_jobs j
      WHERE j.id = kundli_api_calls.job_id
        AND (
          j.session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
          OR j.visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id')
        )
    )
  );

DROP POLICY IF EXISTS "Users can view kundli generated reports by session" ON public.kundli_generated_reports;
CREATE POLICY "Users can view kundli generated reports by session"
  ON public.kundli_generated_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.kundli_report_jobs j
      WHERE j.id = kundli_generated_reports.job_id
        AND (
          j.session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
          OR j.visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id')
        )
    )
  );
