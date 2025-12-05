-- Remove public read access policy from analytics_events to prevent data leakage
-- Export functionality via export-analytics edge function will continue to work (uses service role)
DROP POLICY IF EXISTS "public_read_analytics_events" ON public.analytics_events;