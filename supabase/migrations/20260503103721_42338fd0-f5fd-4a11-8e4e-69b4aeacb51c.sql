-- Replace authenticated-only policy with public update (school admins are anon-role)
DROP POLICY IF EXISTS "School admins can update their school messages" ON public.admin_messages;

CREATE POLICY "Anyone can mark messages read"
  ON public.admin_messages FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Trigger to block tampering with content fields
CREATE OR REPLACE FUNCTION public.protect_admin_message_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.school_id IS DISTINCT FROM OLD.school_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    -- Only allow content edits for super admins
    IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only super admins can modify message content';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_message_fields_trg ON public.admin_messages;
CREATE TRIGGER protect_admin_message_fields_trg
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_message_fields();