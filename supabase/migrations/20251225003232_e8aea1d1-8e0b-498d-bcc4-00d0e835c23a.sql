-- Fix policies to properly handle unauthenticated access for school selection flow
-- Schools table should be publicly readable for school selection
-- Teachers table needs public read access for login verification (but only specific fields are exposed in code)

-- Schools: Keep public read access for school selection
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
CREATE POLICY "Anyone can view schools" 
ON public.schools FOR SELECT TO public
USING (true);

-- Teachers: Allow public to check access codes (needed for teacher login)
DROP POLICY IF EXISTS "Users can view teachers in their school" ON public.teachers;
CREATE POLICY "Anyone can view teachers for login" 
ON public.teachers FOR SELECT TO public
USING (true);

-- For authenticated users, add school-specific policies for modification
CREATE POLICY "Authenticated users can view teachers in their school" 
ON public.teachers FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

-- All other tables: Require authentication
-- Update SELECT policies to be authenticated only

DROP POLICY IF EXISTS "Users can view students in their school" ON public.students;
CREATE POLICY "Authenticated users can view students in their school" 
ON public.students FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view classes in their school" ON public.classes;
CREATE POLICY "Authenticated users can view classes in their school" 
ON public.classes FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view scores in their school" ON public.scores;
CREATE POLICY "Authenticated users can view scores in their school" 
ON public.scores FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view their school settings" ON public.school_settings;
CREATE POLICY "Authenticated users can view their school settings" 
ON public.school_settings FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view reports in their school" ON public.class_teacher_reports;
CREATE POLICY "Authenticated users can view reports in their school" 
ON public.class_teacher_reports FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view assignments in their school" ON public.teacher_class_assignments;
CREATE POLICY "Authenticated users can view assignments in their school" 
ON public.teacher_class_assignments FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

-- Update INSERT policies to use TO authenticated
DROP POLICY IF EXISTS "Users can insert scores in their school" ON public.scores;
CREATE POLICY "Authenticated users can insert scores in their school" 
ON public.scores FOR INSERT TO authenticated
WITH CHECK (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert reports in their school" ON public.class_teacher_reports;
CREATE POLICY "Authenticated users can insert reports in their school" 
ON public.class_teacher_reports FOR INSERT TO authenticated
WITH CHECK (school_id = get_user_school_id(auth.uid()));

-- Update UPDATE policies to use TO authenticated
DROP POLICY IF EXISTS "Users can update scores in their school" ON public.scores;
CREATE POLICY "Authenticated users can update scores in their school" 
ON public.scores FOR UPDATE TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update reports in their school" ON public.class_teacher_reports;
CREATE POLICY "Authenticated users can update reports in their school" 
ON public.class_teacher_reports FOR UPDATE TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

-- Update user_roles policies  
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view their own roles" 
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles in their school" ON public.user_roles;
CREATE POLICY "Admins can manage roles in their school" 
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') AND school_id = get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'));