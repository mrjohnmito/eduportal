-- Add policy to allow anyone to view school settings (for teachers who use access code auth)
CREATE POLICY "Anyone can view school settings by school"
  ON public.school_settings FOR SELECT
  USING (true);