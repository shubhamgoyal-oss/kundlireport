-- Drop the conflicting authenticated users insert policy
DROP POLICY IF EXISTS "Authenticated users insert own calculations" ON public.dosha_calculations;

-- Update the "Anyone can insert calculations" policy to be more explicit
DROP POLICY IF EXISTS "Anyone can insert calculations" ON public.dosha_calculations;

CREATE POLICY "Anyone can insert calculations"
ON public.dosha_calculations
FOR INSERT
WITH CHECK (true);

-- Ensure the update policy allows anonymous updates too
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.dosha_calculations;

CREATE POLICY "Users can update their own calculations"
ON public.dosha_calculations
FOR UPDATE
USING (
  (user_id IS NULL) OR 
  (auth.uid() = user_id)
)
WITH CHECK (
  (user_id IS NULL) OR 
  (auth.uid() = user_id)
);