-- Drop overly permissive policies on admin_messages
DROP POLICY IF EXISTS "Anyone can update messages" ON public.admin_messages;
DROP POLICY IF EXISTS "Anyone can view messages by school" ON public.admin_messages;

-- Authenticated users can view messages for their school
CREATE POLICY "Auth users can view their school messages"
  ON public.admin_messages FOR SELECT
  TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Authenticated school admins can mark messages as read (only is_read meaningfully changes; school_id constraint enforced)
CREATE POLICY "School admins can update their school messages"
  ON public.admin_messages FOR UPDATE
  TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()));