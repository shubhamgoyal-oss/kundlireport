-- Create callback_requests table to store callback data
CREATE TABLE public.callback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  calculation_id UUID REFERENCES public.dosha_calculator2(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'failed', 'cancelled')),
  notes TEXT,
  called_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  user_country TEXT,
  user_city TEXT,
  user_latitude NUMERIC,
  user_longitude NUMERIC
);

-- Enable RLS
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

-- Policies for callback_requests
CREATE POLICY "Anyone can insert callback requests"
ON public.callback_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own callback requests"
ON public.callback_requests
FOR SELECT
USING (
  (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)) 
  OR 
  (visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id'::text))
  OR
  (auth.uid() = user_id)
);

-- Create indexes for performance
CREATE INDEX idx_callback_requests_visitor ON public.callback_requests(visitor_id);
CREATE INDEX idx_callback_requests_session ON public.callback_requests(session_id);
CREATE INDEX idx_callback_requests_status ON public.callback_requests(status);
CREATE INDEX idx_callback_requests_calculation ON public.callback_requests(calculation_id);
CREATE INDEX idx_callback_requests_created_at ON public.callback_requests(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_callback_requests_updated_at
BEFORE UPDATE ON public.callback_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.callback_requests IS 'Stores callback requests from users who want to speak with an expert';
COMMENT ON COLUMN public.callback_requests.status IS 'Status of the callback: pending, called, failed, cancelled';
COMMENT ON COLUMN public.callback_requests.phone_number IS 'User phone number for callback (PII - sensitive data)';