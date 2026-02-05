-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for student-photos bucket
-- Anyone can view student photos (for reports)
CREATE POLICY "Public can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Admins can upload student photos
CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update student photos
CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete student photos
CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);