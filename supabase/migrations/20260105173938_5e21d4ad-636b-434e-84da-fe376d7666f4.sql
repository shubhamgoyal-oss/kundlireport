-- Create storage bucket for kundali chart images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kundali-charts', 'kundali-charts', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to kundali charts
CREATE POLICY "Public read access for kundali charts"
ON storage.objects FOR SELECT
USING (bucket_id = 'kundali-charts');

-- Allow service role to insert kundali charts
CREATE POLICY "Service role can upload kundali charts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kundali-charts');