-- Fix analytics_events public data exposure
-- Drop the permissive SELECT policy that allows public access when user_id IS NULL
DROP POLICY IF EXISTS "Users can view their own events" ON public.analytics_events;

-- Create a restrictive policy: only authenticated users can see their own events
-- Anonymous users cannot read analytics data
CREATE POLICY "Authenticated users view own events only"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Keep the permissive INSERT policy (analytics collection needs this)
-- The existing "Anyone can insert analytics events" policy remains unchanged