CREATE OR REPLACE FUNCTION public.can_access_student_class(_school_id uuid, _class_level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.has_role(auth.uid(), 'super_admin') OR EXISTS (
 SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.school_id = _school_id
 AND (r.role IN ('admin','accountant') OR (r.role = 'teacher' AND EXISTS (
 SELECT 1 FROM public.teachers t JOIN public.teacher_class_assignments a ON a.teacher_id = t.id AND a.school_id = t.school_id
 JOIN public.classes c ON c.id = a.class_id AND c.school_id = t.school_id
 WHERE t.school_id = _school_id AND ('teacher-' || t.id::text || '@eduportal.invalid') = (auth.jwt()->>'email')
 AND regexp_replace(lower(c.name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(_class_level), '[^a-z0-9]', '', 'g')))));
$$;
REVOKE ALL ON FUNCTION public.can_access_student_class(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_student_class(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_manage_student_class(_school_id uuid, _class_level text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.can_access_student_class(_school_id,_class_level)
 AND (public.has_role(auth.uid(),'super_admin') OR EXISTS (SELECT 1 FROM public.user_roles r
 WHERE r.user_id = auth.uid() AND r.school_id = _school_id AND r.role IN ('admin','teacher')));
$$;
REVOKE ALL ON FUNCTION public.can_manage_student_class(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_student_class(uuid,text) TO authenticated;
DROP POLICY IF EXISTS "Admins can delete students in their school" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students in their school" ON public.students;
DROP POLICY IF EXISTS "Admins can update students in their school" ON public.students;
DROP POLICY IF EXISTS "Anyone can view students by school" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students in their school" ON public.students;
DROP POLICY IF EXISTS "Public can insert students" ON public.students;
DROP POLICY IF EXISTS "Public can update students" ON public.students;
DROP POLICY IF EXISTS "Public can delete students" ON public.students;
CREATE POLICY "Scoped student read" ON public.students FOR SELECT TO authenticated USING (public.can_access_student_class(school_id,class_level));
CREATE POLICY "Scoped student insert" ON public.students FOR INSERT TO authenticated WITH CHECK (public.can_manage_student_class(school_id,class_level));
CREATE POLICY "Scoped student update" ON public.students FOR UPDATE TO authenticated USING (public.can_manage_student_class(school_id,class_level)) WITH CHECK (public.can_manage_student_class(school_id,class_level));
CREATE POLICY "Scoped student delete" ON public.students FOR DELETE TO authenticated USING (public.can_manage_student_class(school_id,class_level));
REVOKE ALL ON public.students FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.students TO authenticated;
DROP POLICY IF EXISTS "Admins can delete scores in their school" ON public.scores;
DROP POLICY IF EXISTS "Authenticated users can insert scores in their school" ON public.scores;
DROP POLICY IF EXISTS "Authenticated users can update scores in their school" ON public.scores;
DROP POLICY IF EXISTS "Authenticated users can view scores in their school" ON public.scores;
DROP POLICY IF EXISTS "Public can delete scores" ON public.scores;
DROP POLICY IF EXISTS "Public can insert scores" ON public.scores;
DROP POLICY IF EXISTS "Public can update scores" ON public.scores;
DROP POLICY IF EXISTS "Public can view scores" ON public.scores;
CREATE POLICY "Scoped student read" ON public.scores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND (s.school_id = scores.school_id OR scores.school_id IS NULL) AND public.can_access_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student insert" ON public.scores FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND s.school_id = scores.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student update" ON public.scores FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND (s.school_id = scores.school_id OR scores.school_id IS NULL) AND public.can_manage_student_class(s.school_id,s.class_level))) WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND s.school_id = scores.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student delete" ON public.scores FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = scores.student_id AND s.school_id = scores.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
REVOKE ALL ON public.scores FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.scores TO authenticated;
DROP POLICY IF EXISTS "Admins can delete reports in their school" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Authenticated users can insert reports in their school" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Authenticated users can update reports in their school" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Authenticated users can view reports in their school" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Public can delete reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Public can insert reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Public can update reports" ON public.class_teacher_reports;
DROP POLICY IF EXISTS "Public can view reports" ON public.class_teacher_reports;
CREATE POLICY "Scoped student read" ON public.class_teacher_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_teacher_reports.student_id AND (s.school_id = class_teacher_reports.school_id OR class_teacher_reports.school_id IS NULL) AND public.can_access_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student insert" ON public.class_teacher_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_teacher_reports.student_id AND s.school_id = class_teacher_reports.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student update" ON public.class_teacher_reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_teacher_reports.student_id AND (s.school_id = class_teacher_reports.school_id OR class_teacher_reports.school_id IS NULL) AND public.can_manage_student_class(s.school_id,s.class_level))) WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_teacher_reports.student_id AND s.school_id = class_teacher_reports.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
CREATE POLICY "Scoped student delete" ON public.class_teacher_reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = class_teacher_reports.student_id AND s.school_id = class_teacher_reports.school_id AND public.can_manage_student_class(s.school_id,s.class_level)));
REVOKE ALL ON public.class_teacher_reports FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.class_teacher_reports TO authenticated;
DROP POLICY IF EXISTS "Public can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public can delete teachers" ON public.teachers;
REVOKE INSERT,UPDATE,DELETE ON public.teachers FROM anon;
DROP POLICY IF EXISTS "Public can insert assignments" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Public can update assignments" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Public can delete assignments" ON public.teacher_class_assignments;
REVOKE INSERT,UPDATE,DELETE ON public.teacher_class_assignments FROM anon;
DROP POLICY IF EXISTS "Admins can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update student photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete student photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;
CREATE POLICY "Private student photo read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-photos' AND EXISTS (SELECT 1 FROM public.students s WHERE s.school_id::text = split_part(name,'/',1) AND s.id::text = split_part(name,'/',2) AND public.can_access_student_class(s.school_id,s.class_level)));
CREATE POLICY "Private student photo upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos' AND EXISTS (SELECT 1 FROM public.students s WHERE s.school_id::text = split_part(name,'/',1) AND s.id::text = split_part(name,'/',2) AND public.can_manage_student_class(s.school_id,s.class_level)) AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY "Private student photo delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-photos' AND EXISTS (SELECT 1 FROM public.students s WHERE s.school_id::text = split_part(name,'/',1) AND s.id::text = split_part(name,'/',2) AND public.can_manage_student_class(s.school_id,s.class_level)));