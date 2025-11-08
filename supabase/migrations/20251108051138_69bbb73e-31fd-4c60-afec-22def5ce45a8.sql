-- Create analytics_events table for tracking user events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  page TEXT,
  step INTEGER,
  puja_id INTEGER,
  puja_name TEXT,
  metadata JSONB,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics events (anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only allow users to view their own events
CREATE POLICY "Users can view their own events"
ON public.analytics_events
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for better query performance
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
