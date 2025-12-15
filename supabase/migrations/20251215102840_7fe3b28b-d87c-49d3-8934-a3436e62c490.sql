-- Allow dynamically-created classes by removing fixed class_level constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_level_check;