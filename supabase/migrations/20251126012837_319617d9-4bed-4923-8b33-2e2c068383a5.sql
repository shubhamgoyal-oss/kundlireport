-- Add name column to callback_requests table
ALTER TABLE public.callback_requests
ADD COLUMN name TEXT;

COMMENT ON COLUMN public.callback_requests.name IS 'User name for callback request';