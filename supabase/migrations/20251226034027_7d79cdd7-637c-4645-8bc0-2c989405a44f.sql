-- Add new fields to schools table for admin credentials and locking
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS admin_email text,
ADD COLUMN IF NOT EXISTS admin_password_hash text,
ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to school logos
CREATE POLICY "Public can view school logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'school-logos');

-- Allow super admins to upload/update school logos
CREATE POLICY "Super admins can upload school logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update school logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete school logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'super_admin'));