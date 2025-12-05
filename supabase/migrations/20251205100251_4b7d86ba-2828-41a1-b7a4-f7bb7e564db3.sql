-- Create table for storing expert chat conversations
CREATE TABLE public.expert_chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  device_id TEXT,
  user_message TEXT NOT NULL,
  assistant_message TEXT,
  dosha_context JSONB,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expert_chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert chat logs
CREATE POLICY "Anyone can insert chat logs"
ON public.expert_chat_logs
FOR INSERT
WITH CHECK (true);

-- Allow public read for export/admin access
CREATE POLICY "Allow public read for chat logs"
ON public.expert_chat_logs
FOR SELECT
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_expert_chat_logs_created_at ON public.expert_chat_logs(created_at DESC);
CREATE INDEX idx_expert_chat_logs_visitor_id ON public.expert_chat_logs(visitor_id);