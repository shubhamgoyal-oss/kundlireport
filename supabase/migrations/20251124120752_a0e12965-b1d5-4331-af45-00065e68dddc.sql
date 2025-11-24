-- Update daily_data to include the new dosha_calculate_unsuccessful event
DROP MATERIALIZED VIEW IF EXISTS daily_data CASCADE;

CREATE MATERIALIZED VIEW daily_data AS
WITH dates AS (
  SELECT DISTINCT date
  FROM analytics_events
  WHERE date IS NOT NULL
),
 daily_totals AS (
  SELECT 
    date,
    COUNT(DISTINCT visitor_id) AS total_unique_visitors
  FROM analytics_events
  WHERE date IS NOT NULL
  GROUP BY date
 ),
 event_stats AS (
  SELECT 
    date,
    event_name,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM analytics_events
  WHERE date IS NOT NULL
  GROUP BY date, event_name
 )
SELECT 
  d.date,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'page_view' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS page_view_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'form_field_filled' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS form_field_filled_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'calculate_dosha_clicked' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS calculate_dosha_clicked_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculate' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS dosha_calculate_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'dosha_calculate_unsuccessful' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS dosha_calculate_unsuccessful_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'accordion_expanded' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS accordion_expanded_pct,
  ROUND(
    100 * COALESCE(MAX(CASE WHEN es.event_name = 'unknown_time_toggled' THEN es.unique_visitors::numeric END), 0)
      / NULLIF(dt.total_unique_visitors::numeric, 0),
    2
  ) AS unknown_time_toggled_pct,
  dt.total_unique_visitors
FROM dates d
JOIN daily_totals dt ON dt.date = d.date
LEFT JOIN event_stats es ON es.date = d.date
GROUP BY d.date, dt.total_unique_visitors
ORDER BY d.date DESC;

CREATE INDEX idx_daily_data_date ON daily_data (date);

CREATE OR REPLACE VIEW daily_data_secure 
WITH (security_invoker=true)
AS
SELECT * FROM daily_data;

GRANT SELECT ON daily_data TO authenticated, anon;