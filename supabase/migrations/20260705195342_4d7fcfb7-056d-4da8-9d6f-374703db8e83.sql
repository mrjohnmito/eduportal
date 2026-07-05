
-- Final year class setting
ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS final_class text;

-- 1) Enrollment history
CREATE TABLE public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  class_level text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_enrollments_unique_year UNIQUE (school_id, student_id, academic_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO anon, authenticated;
GRANT ALL ON public.student_enrollments TO service_role;

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enrollments" ON public.student_enrollments FOR SELECT USING (true);
CREATE POLICY "Public can insert enrollments" ON public.student_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update enrollments" ON public.student_enrollments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete enrollments" ON public.student_enrollments FOR DELETE USING (true);

CREATE TRIGGER update_student_enrollments_updated_at
  BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_student_enrollments_school ON public.student_enrollments (school_id);
CREATE INDEX idx_student_enrollments_student ON public.student_enrollments (student_id);

-- 2) Promotion audit trail
CREATE TABLE public.student_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  action text NOT NULL,
  from_academic_year text NOT NULL,
  from_class text NOT NULL,
  to_academic_year text,
  to_class text,
  performed_by text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_promotions TO anon, authenticated;
GRANT ALL ON public.student_promotions TO service_role;

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view promotions" ON public.student_promotions FOR SELECT USING (true);
CREATE POLICY "Public can insert promotions" ON public.student_promotions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete promotions" ON public.student_promotions FOR DELETE USING (true);

CREATE INDEX idx_student_promotions_school ON public.student_promotions (school_id);

-- Prevent duplicate promote/repeat of the same student into the same destination year
CREATE UNIQUE INDEX idx_student_promotions_no_dup
  ON public.student_promotions (school_id, student_id, to_academic_year)
  WHERE action IN ('promote', 'repeat');
