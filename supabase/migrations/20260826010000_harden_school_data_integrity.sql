ALTER TABLE public.scores
  DROP CONSTRAINT IF EXISTS scores_student_id_class_level_subject_key;

CREATE UNIQUE INDEX IF NOT EXISTS scores_school_student_class_subject_key
  ON public.scores (school_id, student_id, class_level, subject)
  WHERE school_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_settings_school_id_key
  ON public.school_settings (school_id)
  WHERE school_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_enrollments_school_id_fkey'
  ) THEN
    ALTER TABLE public.student_enrollments
      ADD CONSTRAINT student_enrollments_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_promotions_school_id_fkey'
  ) THEN
    ALTER TABLE public.student_promotions
      ADD CONSTRAINT student_promotions_school_id_fkey
      FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_assignment_school()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.teachers
    WHERE id = NEW.teacher_id AND school_id = NEW.school_id
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.classes
    WHERE id = NEW.class_id AND school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'Teacher and class must belong to the assignment school';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assignment_school_trigger
  ON public.teacher_class_assignments;

CREATE TRIGGER validate_assignment_school_trigger
  BEFORE INSERT OR UPDATE ON public.teacher_class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_assignment_school();