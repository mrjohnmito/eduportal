CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage messages" ON public.admin_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone can view messages by school" ON public.admin_messages
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can update messages" ON public.admin_messages
  FOR UPDATE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;