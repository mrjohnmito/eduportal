-- Restore Data API grants on scores so writes (mark saving) work again.
-- School admins/teachers operate via the anon role (custom sessionStorage auth),
-- and the public RLS policies already scope access; grants were missing.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;