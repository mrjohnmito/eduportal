-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  school_code TEXT NOT NULL UNIQUE,
  subscription_status BOOLEAN NOT NULL DEFAULT true,
  subscription_expiry DATE,
  theme_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- RLS policies for schools table
CREATE POLICY "Anyone can view schools" ON public.schools
FOR SELECT USING (true);

CREATE POLICY "Super admins can insert schools" ON public.schools
FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update schools" ON public.schools
FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete schools" ON public.schools
FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- Add school_id to students table
ALTER TABLE public.students ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to teachers table
ALTER TABLE public.teachers ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to classes table
ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to scores table
ALTER TABLE public.scores ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to school_settings table
ALTER TABLE public.school_settings ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to class_teacher_reports table
ALTER TABLE public.class_teacher_reports ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to teacher_class_assignments table
ALTER TABLE public.teacher_class_assignments ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_scores_school_id ON public.scores(school_id);
CREATE INDEX idx_school_settings_school_id ON public.school_settings(school_id);
CREATE INDEX idx_class_teacher_reports_school_id ON public.class_teacher_reports(school_id);
CREATE INDEX idx_teacher_class_assignments_school_id ON public.teacher_class_assignments(school_id);