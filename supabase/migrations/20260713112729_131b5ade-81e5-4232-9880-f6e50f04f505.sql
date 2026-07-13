GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;