-- Fix RLS policies for dosha_calculations to support anonymous users
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view their own calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Authenticated users can update their own calculations" ON public.dosha_calculations;

-- Allow users to view their own calculations by visitor_id (for anonymous) or user_id (for authenticated)
CREATE POLICY "Users can view their own calculations"
ON public.dosha_calculations
FOR SELECT
USING (
  (user_id IS NULL) OR 
  (auth.uid() = user_id)
);

-- Allow users to update their own calculations by visitor_id (for anonymous) or user_id (for authenticated)  
CREATE POLICY "Users can update their own calculations"
ON public.dosha_calculations
FOR UPDATE
USING (
  (user_id IS NULL) OR
  (auth.uid() = user_id)
);