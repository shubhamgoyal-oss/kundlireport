-- Drop existing policies that expose data
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.dosha_calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.dosha_calculations;

-- Create secure policies that check visitor_id for anonymous users
CREATE POLICY "Users can view their own calculations"
ON public.dosha_calculations
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND visitor_id = current_setting('request.headers')::json->>'x-visitor-id')
);

CREATE POLICY "Users can update their own calculations"
ON public.dosha_calculations
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (auth.uid() IS NULL AND visitor_id = current_setting('request.headers')::json->>'x-visitor-id')
);