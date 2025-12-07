-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_level TEXT NOT NULL CHECK (class_level IN ('basic7', 'basic8', 'basic9')),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scores table
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  test1 NUMERIC DEFAULT 0,
  group_work NUMERIC DEFAULT 0,
  test2 NUMERIC DEFAULT 0,
  project NUMERIC DEFAULT 0,
  exam NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_level, subject)
);

-- Create school_settings table
CREATE TABLE public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL DEFAULT 'Ibrahim Memorial School Complex',
  logo_url TEXT,
  academic_year TEXT DEFAULT '2024-2025',
  term TEXT DEFAULT '1st Term',
  email TEXT DEFAULT 'ibrahimmemorialfoundationschool@gmail.com',
  phone1 TEXT DEFAULT '0557387992',
  phone2 TEXT DEFAULT '0545231646',
  motto TEXT DEFAULT 'Humble Beginners',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Students policies: Anyone can view, only admins can modify
CREATE POLICY "Anyone can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins can insert students" ON public.students FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete students" ON public.students FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Scores policies: Anyone can view and modify (teachers don't need login)
CREATE POLICY "Anyone can view scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON public.scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scores" ON public.scores FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete scores" ON public.scores FOR DELETE USING (true);

-- School settings policies: Anyone can view, only admins can modify
CREATE POLICY "Anyone can view settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.school_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies: Only admins can manage roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default school settings
INSERT INTO public.school_settings (school_name, email, phone1, phone2, motto) 
VALUES ('Ibrahim Memorial School Complex', 'ibrahimmemorialfoundationschool@gmail.com', '0557387992', '0545231646', 'Humble Beginners');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();