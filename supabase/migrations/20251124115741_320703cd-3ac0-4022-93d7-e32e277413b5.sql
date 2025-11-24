-- Add date column to dosha_calculator2
ALTER TABLE dosha_calculator2 ADD COLUMN date DATE;

-- Add date column to analytics_events
ALTER TABLE analytics_events ADD COLUMN date DATE;

-- Create function to extract date from created_at
CREATE OR REPLACE FUNCTION set_date_from_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date := DATE(NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dosha_calculator2
CREATE TRIGGER set_date_dosha_calculator2
  BEFORE INSERT OR UPDATE OF created_at ON dosha_calculator2
  FOR EACH ROW
  EXECUTE FUNCTION set_date_from_created_at();

-- Create trigger for analytics_events
CREATE TRIGGER set_date_analytics_events
  BEFORE INSERT OR UPDATE OF created_at ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION set_date_from_created_at();

-- Populate existing rows with date values
UPDATE dosha_calculator2 SET date = DATE(created_at) WHERE date IS NULL;
UPDATE analytics_events SET date = DATE(created_at) WHERE date IS NULL;

-- Create daily_data view with pivoted analytics
CREATE OR REPLACE VIEW daily_data AS
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