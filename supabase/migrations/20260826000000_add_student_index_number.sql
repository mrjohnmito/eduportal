ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS index_number text;

CREATE INDEX IF NOT EXISTS idx_students_school_index_number
  ON public.students (school_id, index_number);