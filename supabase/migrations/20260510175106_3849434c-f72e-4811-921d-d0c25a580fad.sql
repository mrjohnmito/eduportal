CREATE TABLE public.super_admin_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  whatsapp text,
  email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admin_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read super admin contact"
  ON public.super_admin_contact FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert contact"
  ON public.super_admin_contact FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins can update contact"
  ON public.super_admin_contact FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER update_super_admin_contact_updated_at
  BEFORE UPDATE ON public.super_admin_contact
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.super_admin_contact (name, whatsapp, email) VALUES (NULL, NULL, NULL);