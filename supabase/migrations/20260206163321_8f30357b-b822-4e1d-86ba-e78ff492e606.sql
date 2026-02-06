-- Create table to store Kundli report jobs
CREATE TABLE public.kundli_report_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  
  -- Request parameters
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  place_of_birth TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timezone NUMERIC NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  gender TEXT NOT NULL DEFAULT 'M',
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  current_phase TEXT, -- Phase 1, Phase 2, etc.
  progress_percent INTEGER DEFAULT 0,
  
  -- Result storage (JSON, not file blob)
  report_data JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.kundli_report_jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can create a job
CREATE POLICY "Anyone can insert kundli jobs"
  ON public.kundli_report_jobs FOR INSERT
  WITH CHECK (true);

-- Users can view their own jobs by session/visitor
CREATE POLICY "Users can view their own kundli jobs"
  ON public.kundli_report_jobs FOR SELECT
  USING (
    session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
    OR visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id')
  );

-- Backend can update jobs (service role bypasses RLS)
-- No explicit UPDATE policy needed since service role has full access

-- Add index for job lookup
CREATE INDEX idx_kundli_jobs_session ON public.kundli_report_jobs(session_id, status);
CREATE INDEX idx_kundli_jobs_expires ON public.kundli_report_jobs(expires_at) WHERE status = 'completed';

-- Add trigger for updated_at
CREATE TRIGGER update_kundli_jobs_updated_at
  BEFORE UPDATE ON public.kundli_report_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();