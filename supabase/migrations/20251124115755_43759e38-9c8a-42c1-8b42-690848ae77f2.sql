-- Fix security definer view by recreating without security definer
DROP VIEW IF EXISTS daily_data;
CREATE VIEW daily_data 
WITH (security_invoker=true)
AS
WITH event_totals AS (
  SELECT 
    event_name,
    COUNT(DISTINCT visitor_id) as grand_total
  FROM analytics_events
  GROUP BY event_name
),
daily_stats AS (
  SELECT 
    ae.event_name,
    ae.date,
    COUNT(DISTINCT ae.visitor_id) as unique_visitors,
    ROUND(
      (COUNT(DISTINCT ae.visitor_id)::numeric / 
       NULLIF((SELECT COUNT(DISTINCT visitor_id) FROM analytics_events ae2 WHERE ae2.date = ae.date), 0)) * 100,
      2
    ) as visitor_percentage
  FROM analytics_events ae
  WHERE ae.date IS NOT NULL
  GROUP BY ae.event_name, ae.date
)
SELECT 
  ds.event_name,
  ds.date,
  ds.unique_visitors,
  ds.visitor_percentage,
  et.grand_total
FROM daily_stats ds
JOIN event_totals et ON ds.event_name = et.event_name
ORDER BY et.grand_total DESC, ds.date DESC;

-- Fix function search path for set_date_from_created_at
CREATE OR REPLACE FUNCTION set_date_from_created_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.date := DATE(NEW.created_at);
  RETURN NEW;
END;
$$;