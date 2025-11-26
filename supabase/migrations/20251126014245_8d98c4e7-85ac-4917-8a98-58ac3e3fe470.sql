-- Allow viewing all callback requests for admin/business purposes
-- Note: Consider adding authentication-based restrictions in production
CREATE POLICY "Allow viewing all callback requests for admin"
ON public.callback_requests
FOR SELECT
USING (true);