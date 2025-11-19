-- Create dosha_calculator2 table to record all calculation inputs and results
CREATE TABLE public.dosha_calculator2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  calculation_number integer NOT NULL DEFAULT 1,
  
  -- Input fields
  name text NOT NULL,
  date_of_birth date NOT NULL,
  time_of_birth time without time zone NOT NULL,
  place_of_birth text NOT NULL,
  latitude numeric,
  longitude numeric,
  
  -- Dosha results (true/false)
  mangal_dosha boolean NOT NULL DEFAULT false,
  kaal_sarp_dosha boolean NOT NULL DEFAULT false,
  pitra_dosha boolean NOT NULL DEFAULT false,
  sade_sati boolean NOT NULL DEFAULT false,
  grahan_dosha boolean NOT NULL DEFAULT false,
  shrapit_dosha boolean NOT NULL DEFAULT false,
  guru_chandal_dosha boolean NOT NULL DEFAULT false,
  punarphoo_dosha boolean NOT NULL DEFAULT false,
  kemadruma_yoga boolean NOT NULL DEFAULT false,
  gandmool_dosha boolean NOT NULL DEFAULT false,
  kalathra_dosha boolean NOT NULL DEFAULT false,
  vish_daridra_yoga boolean NOT NULL DEFAULT false,
  ketu_naga_dosha boolean NOT NULL DEFAULT false,
  navagraha_umbrella boolean NOT NULL DEFAULT false,
  
  -- Additional data
  calculation_results jsonb,
  book_puja_clicked boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dosha_calculator2 ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert calculations
CREATE POLICY "Anyone can insert calculations"
ON public.dosha_calculator2
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own session calculations
CREATE POLICY "Users can view own session calculations"
ON public.dosha_calculator2
FOR SELECT
USING (
  session_id = (current_setting('request.headers', true)::json->>'x-session-id')
  OR visitor_id = (current_setting('request.headers', true)::json->>'x-visitor-id')
);

-- Policy: Users can update their own calculations
CREATE POLICY "Users can update their own calculations"
ON public.dosha_calculator2
FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id)
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Policy: Authenticated users view own calculations
CREATE POLICY "Authenticated users view own calculations"
ON public.dosha_calculator2
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger to auto-increment calculation_number per visitor
CREATE TRIGGER set_calculation_number_dosha_calculator2
  BEFORE INSERT ON public.dosha_calculator2
  FOR EACH ROW
  EXECUTE FUNCTION public.set_calculation_number();

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_dosha_calculator2_updated_at
  BEFORE UPDATE ON public.dosha_calculator2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();