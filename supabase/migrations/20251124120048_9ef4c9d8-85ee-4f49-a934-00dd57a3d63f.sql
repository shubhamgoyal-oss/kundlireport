-- Drop the existing view
DROP VIEW IF EXISTS daily_data;

-- Create a pivoted table (materialized view) with dates as rows and events as columns
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
    COUNT(DISTINCT ae.visitor_id) as unique_visitors,
    ROUND(
      (COUNT(DISTINCT ae.visitor_id)::numeric / NULLIF(tv.total_visitors, 0)) * 100,
      2
    ) as percentage
  FROM analytics_events ae
  JOIN total_visitors_per_date tv ON ae.date = tv.date
  WHERE ae.date IS NOT NULL
  GROUP BY ae.date, ae.event_name, tv.total_visitors
)
SELECT 
  dr.date,
  COALESCE(MAX(CASE WHEN es.event_name = 'page_view' THEN es.percentage END), 0) as page_view_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculation_started' THEN es.percentage END), 0) as dosha_calculation_started_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculation_completed' THEN es.percentage END), 0) as dosha_calculation_completed_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'book_puja_clicked' THEN es.percentage END), 0) as book_puja_clicked_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'language_changed' THEN es.percentage END), 0) as language_changed_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'puja_card_viewed' THEN es.percentage END), 0) as puja_card_viewed_pct,
  COALESCE(MAX(CASE WHEN es.event_name = 'category_puja_viewed' THEN es.percentage END), 0) as category_puja_viewed_pct,
  tv.total_visitors
FROM date_range dr
LEFT JOIN event_stats es ON dr.date = es.date
LEFT JOIN total_visitors_per_date tv ON dr.date = tv.date
GROUP BY dr.date, tv.total_visitors
ORDER BY dr.date DESC;

-- Create index for better performance
CREATE INDEX idx_daily_data_date ON daily_data (date);

-- Add comment
COMMENT ON MATERIALIZED VIEW daily_data IS 'Pivoted daily analytics with dates as rows and event types as columns showing percentage of unique visitors';

-- To refresh the view, run: REFRESH MATERIALIZED VIEW daily_data;