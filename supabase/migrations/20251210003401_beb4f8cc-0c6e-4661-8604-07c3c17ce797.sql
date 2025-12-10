-- Add total school days to school_settings
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS total_school_days integer DEFAULT 64;

-- Add attendance_days to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS attendance_days integer DEFAULT 0;