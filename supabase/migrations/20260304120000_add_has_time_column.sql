-- Add has_time column to track whether birth time was known or unknown
-- When false, PDF should display "Time not available" instead of the default noon time
ALTER TABLE public.kundli_report_jobs
  ADD COLUMN IF NOT EXISTS has_time BOOLEAN NOT NULL DEFAULT true;
