-- Create session-level problem statements table
CREATE TABLE public.session_problem_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  problem_statements TEXT[] NOT NULL,
  language TEXT DEFAULT 'en',
  user_country TEXT,
  user_city TEXT,
  user_latitude NUMERIC,
  user_longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_problem_statements ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Anyone can insert session problem statements"
ON public.session_problem_statements
FOR INSERT
WITH CHECK (true);

-- Admin can view all
CREATE POLICY "Admins can view session problem statements"
ON public.session_problem_statements
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for efficient queries
CREATE INDEX idx_session_problem_statements_session ON public.session_problem_statements(session_id);
CREATE INDEX idx_session_problem_statements_visitor ON public.session_problem_statements(visitor_id);
CREATE INDEX idx_session_problem_statements_created ON public.session_problem_statements(created_at DESC);