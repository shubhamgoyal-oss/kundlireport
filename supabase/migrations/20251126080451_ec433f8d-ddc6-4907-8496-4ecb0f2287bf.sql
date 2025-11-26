-- Allow public read access to analytics events for the dashboard
CREATE POLICY "public_read_analytics_events"
ON public.analytics_events
FOR SELECT
USING (true);