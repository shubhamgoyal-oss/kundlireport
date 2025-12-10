-- Create dedicated table for problem area selections
CREATE TABLE public.problem_area_selections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    calculation_id UUID,
    problem_area TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    user_country TEXT,
    user_city TEXT,
    user_latitude NUMERIC,
    user_longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.problem_area_selections ENABLE ROW LEVEL SECURITY;

-- Anyone can insert
CREATE POLICY "Anyone can insert problem area selections"
ON public.problem_area_selections
FOR INSERT
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view problem area selections"
ON public.problem_area_selections
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_problem_area_selections_created_at ON public.problem_area_selections(created_at DESC);
CREATE INDEX idx_problem_area_selections_visitor ON public.problem_area_selections(visitor_id);

-- Populate with historical data from dosha_results_viewed events
INSERT INTO public.problem_area_selections (visitor_id, session_id, problem_area, user_country, user_city, user_latitude, user_longitude, created_at)
SELECT 
    visitor_id,
    session_id,
    metadata->>'problem_area' as problem_area,
    user_country,
    user_city,
    user_latitude,
    user_longitude,
    created_at
FROM public.analytics_events
WHERE event_name = 'dosha_results_viewed'
AND metadata->>'problem_area' IS NOT NULL
AND metadata->>'problem_area' != '';