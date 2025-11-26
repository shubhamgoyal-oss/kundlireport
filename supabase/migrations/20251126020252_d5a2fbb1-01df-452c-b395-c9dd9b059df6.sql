-- Create traffic sources table to track marketing attribution
CREATE TABLE public.traffic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_term TEXT,
  utm_content TEXT,
  country_code TEXT,
  landing_page TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_sources ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert traffic source data
CREATE POLICY "Anyone can insert traffic sources"
ON public.traffic_sources
FOR INSERT
WITH CHECK (true);

-- Allow viewing all traffic sources for admin/analytics purposes
CREATE POLICY "Allow viewing all traffic sources for admin"
ON public.traffic_sources
FOR SELECT
USING (true);

-- Create index for efficient querying by visitor_id
CREATE INDEX idx_traffic_sources_visitor_id ON public.traffic_sources(visitor_id);
CREATE INDEX idx_traffic_sources_created_at ON public.traffic_sources(created_at DESC);