-- 1. Add school_level to schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_level text NOT NULL DEFAULT 'jhs';

-- Allow only known values
DO $$ BEGIN
  ALTER TABLE public.schools
    ADD CONSTRAINT schools_level_check CHECK (school_level IN ('primary','jhs','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. level_subjects table
CREATE TABLE IF NOT EXISTS public.level_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('primary','jhs')),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level, name)
);

ALTER TABLE public.level_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view level subjects"
  ON public.level_subjects FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert level subjects"
  ON public.level_subjects FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update level subjects"
  ON public.level_subjects FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete level subjects"
  ON public.level_subjects FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Seed JHS defaults (idempotent)
INSERT INTO public.level_subjects (level, name) VALUES
  ('jhs','Mathematics'),
  ('jhs','English Language'),
  ('jhs','Science'),
  ('jhs','Social Studies'),
  ('jhs','RME'),
  ('jhs','Career Technology'),
  ('jhs','French'),
  ('jhs','Dangme'),
  ('jhs','ICT'),
  ('jhs','Creative Art')
ON CONFLICT (level, name) DO NOTHING;

-- 4. Seed Primary defaults
INSERT INTO public.level_subjects (level, name) VALUES
  ('primary','Mathematics'),
  ('primary','English Language'),
  ('primary','Science'),
  ('primary','Our World Our People'),
  ('primary','RME'),
  ('primary','Ghanaian Language'),
  ('primary','Creative Arts'),
  ('primary','History'),
  ('primary','Computing'),
  ('primary','Physical Education')
ON CONFLICT (level, name) DO NOTHING;