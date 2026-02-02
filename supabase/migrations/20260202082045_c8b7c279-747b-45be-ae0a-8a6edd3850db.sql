-- Drop the old global uniqueness constraint on class name
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_name_key;

-- Add new composite unique constraint for per-school uniqueness
ALTER TABLE public.classes ADD CONSTRAINT classes_name_school_unique UNIQUE (name, school_id);