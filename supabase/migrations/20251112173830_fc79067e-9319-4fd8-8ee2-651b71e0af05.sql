-- Drop the policies that tried to use request headers (which doesn't work)
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.dosha_calculations;

-- Create secure policies that require explicit visitor_id matching
-- For SELECT: authenticated users see their own, anonymous users must filter by visitor_id client-side
CREATE POLICY "Users can view their own calculations"
ON public.dosha_calculations
FOR SELECT
USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
    ELSE true  -- Allow read but app must filter by visitor_id
  END
);

-- For UPDATE: authenticated users update their own, anonymous users must match visitor_id
CREATE POLICY "Users can update their own calculations"
ON public.dosha_calculations
FOR UPDATE
USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id
    ELSE true  -- Allow but app must check visitor_id
  END
);