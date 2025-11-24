-- Fix search path for set_calculation_number function
CREATE OR REPLACE FUNCTION public.set_calculation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.calculation_number := COALESCE(
    (SELECT MAX(calculation_number) + 1 
     FROM public.dosha_calculations 
     WHERE visitor_id = NEW.visitor_id),
    1
  );
  RETURN NEW;
END;
$$;