-- Fix overly permissive RLS policy on callback_requests
-- This policy was allowing anyone to read all records including phone numbers and personal data

DROP POLICY IF EXISTS "Allow viewing all callback requests for admin" ON public.callback_requests;

-- Create proper admin-only SELECT policy using the existing is_admin() function
CREATE POLICY "Admins can view all callback requests"
  ON public.callback_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));