-- Recreate daily_data with actual counts instead of percentages
DROP MATERIALIZED VIEW IF EXISTS daily_data CASCADE;

CREATE MATERIALIZED VIEW daily_data AS
WITH date_range AS (
  SELECT DISTINCT date 
  FROM analytics_events 
  WHERE date IS NOT NULL
  ORDER BY date DESC
),
total_visitors_per_date AS (
  SELECT 
    date,
    COUNT(DISTINCT visitor_id) as total_visitors
  FROM analytics_events
  WHERE date IS NOT NULL
  GROUP BY date
),
event_stats AS (
  SELECT 
    ae.date,
    ae.event_name,
    COUNT(DISTINCT ae.visitor_id) as unique_visitors
  FROM analytics_events ae
  WHERE ae.date IS NOT NULL
  GROUP BY ae.date, ae.event_name
)
SELECT 
  dr.date,
  COALESCE(MAX(CASE WHEN es.event_name = 'page_view' THEN es.unique_visitors END), 0) as page_view,
  COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculation_started' THEN es.unique_visitors END), 0) as dosha_calculation_started,
  COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculation_completed' THEN es.unique_visitors END), 0) as dosha_calculation_completed,
  COALESCE(MAX(CASE WHEN es.event_name = 'book_puja_clicked' THEN es.unique_visitors END), 0) as book_puja_clicked,
  COALESCE(MAX(CASE WHEN es.event_name = 'language_changed' THEN es.unique_visitors END), 0) as language_changed,
  COALESCE(MAX(CASE WHEN es.event_name = 'puja_card_viewed' THEN es.unique_visitors END), 0) as puja_card_viewed,
  COALESCE(MAX(CASE WHEN es.event_name = 'category_puja_viewed' THEN es.unique_visitors END), 0) as category_puja_viewed,
  COALESCE(tv.total_visitors, 0) as total_unique_visitors
FROM date_range dr
LEFT JOIN event_stats es ON dr.date = es.date
LEFT JOIN total_visitors_per_date tv ON dr.date = tv.date
GROUP BY dr.date, tv.total_visitors
ORDER BY dr.date DESC;

-- Create index for better performance
CREATE INDEX idx_daily_data_date ON daily_data (date);

-- Add comment
COMMENT ON MATERIALIZED VIEW daily_data IS 'Pivoted daily analytics with dates as rows and event types as columns showing unique visitor counts';

-- Recreate the secure view
CREATE OR REPLACE VIEW daily_data_secure 
WITH (security_invoker=true)
AS
SELECT * FROM daily_data;

-- Grant access
GRANT SELECT ON daily_data TO authenticated, anon;