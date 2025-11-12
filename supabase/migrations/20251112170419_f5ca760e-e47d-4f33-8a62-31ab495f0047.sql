-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to track dosha calculations
CREATE TABLE public.dosha_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  calculation_number INTEGER NOT NULL DEFAULT 1,
  
  -- Input data
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  place_of_birth TEXT NOT NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  
  -- Dosha results (0 = not active, 1 = active)
  mangal_dosha BOOLEAN NOT NULL DEFAULT false,
  kaal_sarp_dosha BOOLEAN NOT NULL DEFAULT false,
  pitra_dosha BOOLEAN NOT NULL DEFAULT false,
  sade_sati BOOLEAN NOT NULL DEFAULT false,
  grahan_dosha BOOLEAN NOT NULL DEFAULT false,
  shrapit_dosha BOOLEAN NOT NULL DEFAULT false,
  guru_chandal_dosha BOOLEAN NOT NULL DEFAULT false,
  punarphoo_dosha BOOLEAN NOT NULL DEFAULT false,
  kemadruma_yoga BOOLEAN NOT NULL DEFAULT false,
  gandmool_dosha BOOLEAN NOT NULL DEFAULT false,
  kalathra_dosha BOOLEAN NOT NULL DEFAULT false,
  vish_daridra_yoga BOOLEAN NOT NULL DEFAULT false,
  ketu_naga_dosha BOOLEAN NOT NULL DEFAULT false,
  navagraha_umbrella BOOLEAN NOT NULL DEFAULT false,
  
  -- Full calculation results (JSON)
  calculation_results JSONB NULL,
  
  -- User actions
  book_puja_clicked BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dosha_calculations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert calculations
CREATE POLICY "Anyone can insert dosha calculations" 
ON public.dosha_calculations 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can view their own calculations
CREATE POLICY "Users can view their own calculations" 
ON public.dosha_calculations 
FOR SELECT 
USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Policy: Users can update their own calculations
CREATE POLICY "Users can update their own calculations" 
ON public.dosha_calculations 
FOR UPDATE 
USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Create index for faster queries
CREATE INDEX idx_dosha_calculations_visitor_id ON public.dosha_calculations(visitor_id);
CREATE INDEX idx_dosha_calculations_session_id ON public.dosha_calculations(session_id);
CREATE INDEX idx_dosha_calculations_created_at ON public.dosha_calculations(created_at DESC);

-- Function to update calculation_number based on visitor_id
CREATE OR REPLACE FUNCTION public.set_calculation_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.calculation_number := COALESCE(
    (SELECT MAX(calculation_number) + 1 
     FROM public.dosha_calculations 
     WHERE visitor_id = NEW.visitor_id),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set calculation_number
CREATE TRIGGER set_calculation_number_trigger
BEFORE INSERT ON public.dosha_calculations
FOR EACH ROW
EXECUTE FUNCTION public.set_calculation_number();

-- Trigger for updated_at
CREATE TRIGGER update_dosha_calculations_updated_at
BEFORE UPDATE ON public.dosha_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();