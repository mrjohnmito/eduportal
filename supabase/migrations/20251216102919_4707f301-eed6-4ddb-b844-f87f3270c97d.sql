-- Add interest and conduct options to school_settings
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS interest_options text[] DEFAULT ARRAY['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair'],
ADD COLUMN IF NOT EXISTS conduct_options text[] DEFAULT ARRAY['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair'];

-- Create teacher_class_assignments table
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teacher assignments"
ON public.teacher_class_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their assignments"
ON public.teacher_class_assignments
FOR SELECT
USING (true);

-- Create class_teacher_reports table for storing attendance, interest, conduct per student
CREATE TABLE IF NOT EXISTS public.class_teacher_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  term text NOT NULL,
  academic_year text NOT NULL,
  attendance integer DEFAULT 0,
  interest text,
  conduct text,
  class_teacher_remark text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, term, academic_year)
);

ALTER TABLE public.class_teacher_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reports"
ON public.class_teacher_reports
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert reports"
ON public.class_teacher_reports
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update reports"
ON public.class_teacher_reports
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete reports"
ON public.class_teacher_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_class_teacher_reports_updated_at
BEFORE UPDATE ON public.class_teacher_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();