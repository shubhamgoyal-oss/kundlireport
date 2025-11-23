-- Add geographical location columns to analytics_events
ALTER TABLE public.analytics_events
ADD COLUMN IF NOT EXISTS user_country text,
ADD COLUMN IF NOT EXISTS user_city text,
ADD COLUMN IF NOT EXISTS user_latitude numeric,
ADD COLUMN IF NOT EXISTS user_longitude numeric;

-- Add geographical location columns to dosha_calculations
ALTER TABLE public.dosha_calculations
ADD COLUMN IF NOT EXISTS user_country text,
ADD COLUMN IF NOT EXISTS user_city text,
ADD COLUMN IF NOT EXISTS user_latitude numeric,
ADD COLUMN IF NOT EXISTS user_longitude numeric;

-- Add geographical location columns to dosha_calculator2
ALTER TABLE public.dosha_calculator2
ADD COLUMN IF NOT EXISTS user_country text,
ADD COLUMN IF NOT EXISTS user_city text,
ADD COLUMN IF NOT EXISTS user_latitude numeric,
ADD COLUMN IF NOT EXISTS user_longitude numeric;

-- Add geographical location columns to seer_api_logs
ALTER TABLE public.seer_api_logs
ADD COLUMN IF NOT EXISTS user_country text,
ADD COLUMN IF NOT EXISTS user_city text,
ADD COLUMN IF NOT EXISTS user_latitude numeric,
ADD COLUMN IF NOT EXISTS user_longitude numeric;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_country ON public.analytics_events(user_country);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_city ON public.analytics_events(user_city);
CREATE INDEX IF NOT EXISTS idx_dosha_calculations_user_country ON public.dosha_calculations(user_country);
CREATE INDEX IF NOT EXISTS idx_dosha_calculator2_user_country ON public.dosha_calculator2(user_country);