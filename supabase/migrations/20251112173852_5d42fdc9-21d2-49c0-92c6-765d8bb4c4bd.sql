-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.dosha_calculations;

-- For anonymous users, they simply won't be able to read data via RLS
-- The application will fetch data server-side or through edge functions
-- that can filter by visitor_id properly

-- Authenticated users can see only their own data
CREATE POLICY "Authenticated users can view their own calculations"
ON public.dosha_calculations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own calculations"
ON public.dosha_calculations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Anonymous users cannot read through RLS (must use edge functions with visitor_id filtering)
-- But they can still insert
CREATE POLICY "Anyone can insert calculations"
ON public.dosha_calculations
FOR INSERT
WITH CHECK (true);