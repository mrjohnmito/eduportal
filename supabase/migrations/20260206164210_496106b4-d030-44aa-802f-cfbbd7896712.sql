-- Add next_term_begins column to school_settings table
ALTER TABLE public.school_settings 
ADD COLUMN next_term_begins text DEFAULT NULL;