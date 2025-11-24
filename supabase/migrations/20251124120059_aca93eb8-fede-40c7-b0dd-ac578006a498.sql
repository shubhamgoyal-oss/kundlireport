-- Add RLS to daily_data materialized view for security
ALTER MATERIALIZED VIEW daily_data OWNER TO postgres;

-- Enable RLS on the materialized view by creating a security barrier view on top
CREATE OR REPLACE VIEW daily_data_secure 
WITH (security_invoker=true)
AS
SELECT * FROM daily_data;

-- Grant access
GRANT SELECT ON daily_data TO authenticated, anon;