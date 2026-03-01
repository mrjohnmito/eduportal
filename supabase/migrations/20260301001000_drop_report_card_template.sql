-- Remove report_card_template column from school_settings (no longer needed)
ALTER TABLE public.school_settings
DROP COLUMN IF EXISTS report_card_template;
