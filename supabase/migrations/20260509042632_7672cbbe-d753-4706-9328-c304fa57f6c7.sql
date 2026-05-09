
-- Trigger: only allow public updates that set activated_at from NULL to a value, nothing else
CREATE OR REPLACE FUNCTION public.protect_school_activation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins can do anything
  IF public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-super-admin path: only allow activating an unactivated school
  IF OLD.activated_at IS NOT NULL THEN
    RAISE EXCEPTION 'School is already activated';
  END IF;
  IF NEW.activated_at IS NULL THEN
    RAISE EXCEPTION 'activated_at must be set';
  END IF;

  -- Block changes to any other column
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.logo_url IS DISTINCT FROM OLD.logo_url
     OR NEW.school_code IS DISTINCT FROM OLD.school_code
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expiry IS DISTINCT FROM OLD.subscription_expiry
     OR NEW.theme_color IS DISTINCT FROM OLD.theme_color
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.admin_email IS DISTINCT FROM OLD.admin_email
     OR NEW.admin_password_hash IS DISTINCT FROM OLD.admin_password_hash
     OR NEW.is_locked IS DISTINCT FROM OLD.is_locked THEN
    RAISE EXCEPTION 'Only activated_at may be changed by non-super-admins';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_school_activation_fields_trg ON public.schools;
CREATE TRIGGER protect_school_activation_fields_trg
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_school_activation_fields();

-- Public UPDATE policy (the trigger enforces field/value restrictions)
CREATE POLICY "Anyone can activate a school once"
  ON public.schools
  FOR UPDATE
  TO public
  USING (activated_at IS NULL)
  WITH CHECK (activated_at IS NOT NULL);
