-- Fix RLS policies to require authentication for viewing sensitive data

-- Drop the insecure public SELECT policy on dosha_calculations
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.dosha_calculations;

-- Create secure policy that only allows authenticated users to view their own data
CREATE POLICY "Authenticated users view own calculations"
ON public.dosha_calculations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update INSERT policy to require authentication and set user_id
DROP POLICY IF EXISTS "Anyone can insert calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Anyone can insert dosha calculations" ON public.dosha_calculations;

CREATE POLICY "Authenticated users insert own calculations"
ON public.dosha_calculations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop the completely public SELECT policy on seer_api_logs (CRITICAL)
DROP POLICY IF EXISTS "Anyone can view Seer API logs" ON public.seer_api_logs;

-- Logs should only be accessible via server-side operations, no SELECT policy needed
-- If admin access is needed later, implement role-based access with user_roles table

-- Update analytics_events to ensure proper authentication
-- Current policy is already secure, but let's make it explicit
DROP POLICY IF EXISTS "Authenticated users view own events only" ON public.analytics_events;

CREATE POLICY "Authenticated users view own events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Make user_id NOT NULL on dosha_calculations (require authentication)
-- First, we need to handle existing NULL values
-- For now, just add a comment that this should be done after migration
COMMENT ON COLUMN public.dosha_calculations.user_id IS 'Should be NOT NULL after all users migrate to authenticated system';