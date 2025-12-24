CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'teacher'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: class_teacher_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_teacher_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    term text NOT NULL,
    academic_year text NOT NULL,
    attendance integer DEFAULT 0,
    interest text,
    conduct text,
    class_teacher_remark text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_name text DEFAULT 'Ibrahim Memorial School Complex'::text NOT NULL,
    logo_url text,
    academic_year text DEFAULT '2024-2025'::text,
    term text DEFAULT '1st Term'::text,
    email text DEFAULT 'ibrahimmemorialfoundationschool@gmail.com'::text,
    phone1 text DEFAULT '0557387992'::text,
    phone2 text DEFAULT '0545231646'::text,
    motto text DEFAULT 'Humble Beginners'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_school_days integer DEFAULT 64,
    interest_options text[] DEFAULT ARRAY['Excellent'::text, 'Very Good'::text, 'Good'::text, 'Satisfactory'::text, 'Fair'::text],
    conduct_options text[] DEFAULT ARRAY['Excellent'::text, 'Very Good'::text, 'Good'::text, 'Satisfactory'::text, 'Fair'::text]
);


--
-- Name: scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    class_level text NOT NULL,
    subject text NOT NULL,
    test1 numeric DEFAULT 0,
    group_work numeric DEFAULT 0,
    test2 numeric DEFAULT 0,
    project numeric DEFAULT 0,
    exam numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    class_level text NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attendance_days integer DEFAULT 0
);


--
-- Name: teacher_class_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_class_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    class_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    access_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: class_teacher_reports class_teacher_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_reports
    ADD CONSTRAINT class_teacher_reports_pkey PRIMARY KEY (id);


--
-- Name: class_teacher_reports class_teacher_reports_student_id_term_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_reports
    ADD CONSTRAINT class_teacher_reports_student_id_term_academic_year_key UNIQUE (student_id, term, academic_year);


--
-- Name: classes classes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_name_key UNIQUE (name);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: school_settings school_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: scores scores_student_id_class_level_subject_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_student_id_class_level_subject_key UNIQUE (student_id, class_level, subject);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: teacher_class_assignments teacher_class_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_assignments
    ADD CONSTRAINT teacher_class_assignments_pkey PRIMARY KEY (id);


--
-- Name: teacher_class_assignments teacher_class_assignments_teacher_id_class_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_assignments
    ADD CONSTRAINT teacher_class_assignments_teacher_id_class_id_key UNIQUE (teacher_id, class_id);


--
-- Name: teachers teachers_access_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_access_code_key UNIQUE (access_code);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: class_teacher_reports update_class_teacher_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_class_teacher_reports_updated_at BEFORE UPDATE ON public.class_teacher_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: school_settings update_school_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scores update_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teachers update_teachers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: class_teacher_reports class_teacher_reports_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_reports
    ADD CONSTRAINT class_teacher_reports_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: class_teacher_reports class_teacher_reports_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teacher_reports
    ADD CONSTRAINT class_teacher_reports_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: scores scores_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: teacher_class_assignments teacher_class_assignments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_assignments
    ADD CONSTRAINT teacher_class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: teacher_class_assignments teacher_class_assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_class_assignments
    ADD CONSTRAINT teacher_class_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classes Admins can delete classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete classes" ON public.classes FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: class_teacher_reports Admins can delete reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete reports" ON public.class_teacher_reports FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: students Admins can delete students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete students" ON public.students FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teachers Admins can delete teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete teachers" ON public.teachers FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: classes Admins can insert classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert classes" ON public.classes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: students Admins can insert students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert students" ON public.students FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teachers Admins can insert teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert teachers" ON public.teachers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teacher_class_assignments Admins can manage teacher assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_class_assignments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: classes Admins can update classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update classes" ON public.classes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: school_settings Admins can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update settings" ON public.school_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: students Admins can update students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update students" ON public.students FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teachers Admins can update teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update teachers" ON public.teachers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scores Anyone can delete scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete scores" ON public.scores FOR DELETE USING (true);


--
-- Name: class_teacher_reports Anyone can insert reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert reports" ON public.class_teacher_reports FOR INSERT WITH CHECK (true);


--
-- Name: scores Anyone can insert scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert scores" ON public.scores FOR INSERT WITH CHECK (true);


--
-- Name: class_teacher_reports Anyone can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update reports" ON public.class_teacher_reports FOR UPDATE USING (true);


--
-- Name: scores Anyone can update scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update scores" ON public.scores FOR UPDATE USING (true);


--
-- Name: classes Anyone can view classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);


--
-- Name: class_teacher_reports Anyone can view reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reports" ON public.class_teacher_reports FOR SELECT USING (true);


--
-- Name: scores Anyone can view scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view scores" ON public.scores FOR SELECT USING (true);


--
-- Name: school_settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.school_settings FOR SELECT USING (true);


--
-- Name: students Anyone can view students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);


--
-- Name: teachers Anyone can view teachers for login; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view teachers for login" ON public.teachers FOR SELECT USING (true);


--
-- Name: teacher_class_assignments Teachers can view their assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their assignments" ON public.teacher_class_assignments FOR SELECT USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: class_teacher_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_teacher_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: school_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_class_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;