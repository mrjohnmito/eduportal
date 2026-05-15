
-- Teachers
CREATE POLICY "Public can insert teachers" ON public.teachers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update teachers" ON public.teachers FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete teachers" ON public.teachers FOR DELETE TO public USING (true);

-- Teacher class assignments
CREATE POLICY "Public can view assignments" ON public.teacher_class_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert assignments" ON public.teacher_class_assignments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update assignments" ON public.teacher_class_assignments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete assignments" ON public.teacher_class_assignments FOR DELETE TO public USING (true);

-- Students
CREATE POLICY "Public can insert students" ON public.students FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update students" ON public.students FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete students" ON public.students FOR DELETE TO public USING (true);

-- Scores
CREATE POLICY "Public can view scores" ON public.scores FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert scores" ON public.scores FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update scores" ON public.scores FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete scores" ON public.scores FOR DELETE TO public USING (true);

-- Class teacher reports
CREATE POLICY "Public can view reports" ON public.class_teacher_reports FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert reports" ON public.class_teacher_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update reports" ON public.class_teacher_reports FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete reports" ON public.class_teacher_reports FOR DELETE TO public USING (true);

-- School settings (school admin needs to update)
CREATE POLICY "Public can insert school settings" ON public.school_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update school settings" ON public.school_settings FOR UPDATE TO public USING (true) WITH CHECK (true);
