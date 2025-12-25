-- Fix remaining policies to explicitly use TO authenticated role

-- Fix admin policies for students
DROP POLICY IF EXISTS "Admins can insert students in their school" ON public.students;
DROP POLICY IF EXISTS "Admins can update students in their school" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students in their school" ON public.students;

CREATE POLICY "Admins can insert students in their school" 
ON public.students FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update students in their school" 
ON public.students FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete students in their school" 
ON public.students FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for teachers
DROP POLICY IF EXISTS "Admins can insert teachers in their school" ON public.teachers;
DROP POLICY IF EXISTS "Admins can update teachers in their school" ON public.teachers;
DROP POLICY IF EXISTS "Admins can delete teachers in their school" ON public.teachers;

CREATE POLICY "Admins can insert teachers in their school" 
ON public.teachers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update teachers in their school" 
ON public.teachers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete teachers in their school" 
ON public.teachers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for classes
DROP POLICY IF EXISTS "Admins can insert classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Admins can update classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Admins can delete classes in their school" ON public.classes;

CREATE POLICY "Admins can insert classes in their school" 
ON public.classes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update classes in their school" 
ON public.classes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete classes in their school" 
ON public.classes FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for scores
DROP POLICY IF EXISTS "Admins can delete scores in their school" ON public.scores;

CREATE POLICY "Admins can delete scores in their school" 
ON public.scores FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for school_settings
DROP POLICY IF EXISTS "Admins can update their school settings" ON public.school_settings;
DROP POLICY IF EXISTS "Admins can insert their school settings" ON public.school_settings;

CREATE POLICY "Admins can update their school settings" 
ON public.school_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can insert their school settings" 
ON public.school_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for class_teacher_reports
DROP POLICY IF EXISTS "Admins can delete reports in their school" ON public.class_teacher_reports;

CREATE POLICY "Admins can delete reports in their school" 
ON public.class_teacher_reports FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix admin policies for teacher_class_assignments
DROP POLICY IF EXISTS "Admins can insert assignments in their school" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Admins can update assignments in their school" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments in their school" ON public.teacher_class_assignments;

CREATE POLICY "Admins can insert assignments in their school" 
ON public.teacher_class_assignments FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update assignments in their school" 
ON public.teacher_class_assignments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete assignments in their school" 
ON public.teacher_class_assignments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

-- Fix super admin policies for schools
DROP POLICY IF EXISTS "Super admins can insert schools" ON public.schools;
DROP POLICY IF EXISTS "Super admins can update schools" ON public.schools;
DROP POLICY IF EXISTS "Super admins can delete schools" ON public.schools;

CREATE POLICY "Super admins can insert schools" 
ON public.schools FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update schools" 
ON public.schools FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete schools" 
ON public.schools FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));