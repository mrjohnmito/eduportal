-- Add school_id to user_roles to associate users with schools
ALTER TABLE public.user_roles 
ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_user_roles_school_id ON public.user_roles(school_id);

-- Create function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop existing RLS policies and recreate with school filtering

-- STUDENTS: Only allow access to students in user's school
DROP POLICY IF EXISTS "Anyone can view students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

CREATE POLICY "Users can view students in their school" 
ON public.students FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Admins can insert students in their school" 
ON public.students FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update students in their school" 
ON public.students FOR UPDATE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete students in their school" 
ON public.students FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- TEACHERS: Only allow access to teachers in user's school
DROP POLICY IF EXISTS "Anyone can view teachers for login" ON public.teachers;
DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON public.teachers;

CREATE POLICY "Users can view teachers in their school" 
ON public.teachers FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Admins can insert teachers in their school" 
ON public.teachers FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update teachers in their school" 
ON public.teachers FOR UPDATE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete teachers in their school" 
ON public.teachers FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- CLASSES: Only allow access to classes in user's school
DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can insert classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can update classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can delete classes" ON public.classes;

CREATE POLICY "Users can view classes in their school" 
ON public.classes FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Admins can insert classes in their school" 
ON public.classes FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update classes in their school" 
ON public.classes FOR UPDATE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete classes in their school" 
ON public.classes FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- SCORES: Only allow access to scores in user's school
DROP POLICY IF EXISTS "Anyone can view scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone can update scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone can delete scores" ON public.scores;

CREATE POLICY "Users can view scores in their school" 
ON public.scores FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Users can insert scores in their school" 
ON public.scores FOR INSERT 
WITH CHECK (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can update scores in their school" 
ON public.scores FOR UPDATE 
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete scores in their school" 
ON public.scores FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- SCHOOL_SETTINGS: Only allow access to settings for user's school
DROP POLICY IF EXISTS "Anyone can view settings" ON public.school_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.school_settings;

CREATE POLICY "Users can view their school settings" 
ON public.school_settings FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Admins can update their school settings" 
ON public.school_settings FOR UPDATE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can insert their school settings" 
ON public.school_settings FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- CLASS_TEACHER_REPORTS: Only allow access to reports in user's school
DROP POLICY IF EXISTS "Anyone can view reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Anyone can update reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.class_teacher_reports;

CREATE POLICY "Users can view reports in their school" 
ON public.class_teacher_reports FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Users can insert reports in their school" 
ON public.class_teacher_reports FOR INSERT 
WITH CHECK (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can update reports in their school" 
ON public.class_teacher_reports FOR UPDATE 
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete reports in their school" 
ON public.class_teacher_reports FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- TEACHER_CLASS_ASSIGNMENTS: Only allow access to assignments in user's school
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Teachers can view their assignments" ON public.teacher_class_assignments;

CREATE POLICY "Users can view assignments in their school" 
ON public.teacher_class_assignments FOR SELECT 
USING (school_id = get_user_school_id(auth.uid()) OR school_id IS NULL);

CREATE POLICY "Admins can insert assignments in their school" 
ON public.teacher_class_assignments FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update assignments in their school" 
ON public.teacher_class_assignments FOR UPDATE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete assignments in their school" 
ON public.teacher_class_assignments FOR DELETE 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Update user_roles RLS policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles in their school" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));