-- Create experiments table to define A/B tests
CREATE TABLE public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  variants JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  traffic_allocation NUMERIC NOT NULL DEFAULT 1.0 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 1),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create variant assignments table to track which users see which variants
CREATE TABLE public.variant_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  UNIQUE(experiment_id, visitor_id)
);

-- Enable RLS
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for experiments (read-only for all)
CREATE POLICY "Anyone can view active experiments"
ON public.experiments
FOR SELECT
USING (is_active = true);

-- Policies for variant assignments
CREATE POLICY "Anyone can insert variant assignments"
ON public.variant_assignments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own assignments"
ON public.variant_assignments
FOR SELECT
USING (
  (session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text)) 
  OR 
  (visitor_id = ((current_setting('request.headers'::text, true))::json ->> 'x-visitor-id'::text))
  OR
  (auth.uid() = user_id)
);

-- Create indexes for performance
CREATE INDEX idx_experiments_active ON public.experiments(is_active, name);
CREATE INDEX idx_variant_assignments_experiment_visitor ON public.variant_assignments(experiment_id, visitor_id);
CREATE INDEX idx_variant_assignments_session ON public.variant_assignments(session_id);

-- Create trigger for updated_at
CREATE TRIGGER update_experiments_updated_at
BEFORE UPDATE ON public.experiments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.experiments IS 'Defines A/B test experiments with multiple variants';
COMMENT ON TABLE public.variant_assignments IS 'Tracks which users are assigned to which experiment variants';
COMMENT ON COLUMN public.experiments.variants IS 'JSON array of variant objects: [{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]';
COMMENT ON COLUMN public.experiments.traffic_allocation IS 'Percentage of traffic to include in experiment (0.0 to 1.0)';