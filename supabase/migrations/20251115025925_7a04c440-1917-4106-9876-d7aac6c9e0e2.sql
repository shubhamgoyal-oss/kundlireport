-- Create table for Seer API call logs
CREATE TABLE public.seer_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Request details
  request_payload JSONB NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  birth_place TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timezone NUMERIC NOT NULL,
  
  -- Response details
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  response_data JSONB,
  error_message TEXT,
  
  -- Calculation details
  calculation_id UUID REFERENCES public.dosha_calculations(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  
  -- Dosha results (from calculation)
  mangal_dosha BOOLEAN,
  kaal_sarp_dosha BOOLEAN,
  pitra_dosha BOOLEAN,
  shani_dosha BOOLEAN,
  
  -- Planetary positions adapted from Seer
  adapted_planets JSONB,
  adaptation_warnings JSONB
);

-- Enable Row Level Security
ALTER TABLE public.seer_api_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert logs (for edge function)
CREATE POLICY "Anyone can insert Seer API logs"
ON public.seer_api_logs
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view logs (for debugging purposes)
CREATE POLICY "Anyone can view Seer API logs"
ON public.seer_api_logs
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_seer_logs_created_at ON public.seer_api_logs(created_at DESC);
CREATE INDEX idx_seer_logs_session ON public.seer_api_logs(session_id);
CREATE INDEX idx_seer_logs_calculation ON public.seer_api_logs(calculation_id);
CREATE INDEX idx_seer_logs_status ON public.seer_api_logs(response_status);