-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Authenticated users can view own calculations" ON public.dosha_calculations;

-- Allow anonymous users to insert calculations
CREATE POLICY "Anyone can insert calculations"
ON public.dosha_calculations
FOR INSERT
WITH CHECK (true);

-- Allow users to view calculations by session_id (not exposing all data)
CREATE POLICY "Users can view own session calculations"
ON public.dosha_calculations
FOR SELECT
USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id');

-- Keep seer_api_logs restricted (no public access)
-- The existing policies are fine - no SELECT policy means no public access