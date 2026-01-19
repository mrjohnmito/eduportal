-- Add policy to allow anyone to view classes (for teachers who use access code auth)
CREATE POLICY "Anyone can view classes by school"
  ON public.classes FOR SELECT
  USING (true);

-- Add policy to allow anyone to view students (for teachers who use access code auth)
CREATE POLICY "Anyone can view students by school"
  ON public.students FOR SELECT
  USING (true);