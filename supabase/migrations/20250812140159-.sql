-- Add visitor_id to analytics events for stable cross-session tracking
-- Nullable to support existing rows
ALTER TABLE public.analytics_events
ADD COLUMN IF NOT EXISTS visitor_id uuid;

-- Index for analytics queries by visitor
CREATE INDEX IF NOT EXISTS analytics_events_visitor_id_idx
ON public.analytics_events(visitor_id);