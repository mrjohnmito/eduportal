-- Restore public read so school admins (non-Supabase auth) can see their inbox
DROP POLICY IF EXISTS "Auth users can view their school messages" ON public.admin_messages;

CREATE POLICY "Anyone can view admin messages"
  ON public.admin_messages FOR SELECT
  TO public
  USING (true);