
-- 1) Private credentials table (no anon access)
CREATE TABLE public.school_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  admin_email text,
  admin_password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_credentials TO authenticated;
GRANT ALL ON public.school_credentials TO service_role;
-- intentionally NO grant to anon

ALTER TABLE public.school_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage school credentials"
  ON public.school_credentials
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_school_credentials_updated_at
  BEFORE UPDATE ON public.school_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Migrate existing credentials
INSERT INTO public.school_credentials (school_id, admin_email, admin_password_hash)
SELECT id, admin_email, admin_password_hash
FROM public.schools
ON CONFLICT (school_id) DO NOTHING;

-- 3) Recreate activation-protection trigger fn without the now-removed columns
CREATE OR REPLACE FUNCTION public.protect_school_activation_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.activated_at IS NOT NULL THEN
    RAISE EXCEPTION 'School is already activated';
  END IF;
  IF NEW.activated_at IS NULL THEN
    RAISE EXCEPTION 'activated_at must be set';
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.logo_url IS DISTINCT FROM OLD.logo_url
     OR NEW.school_code IS DISTINCT FROM OLD.school_code
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expiry IS DISTINCT FROM OLD.subscription_expiry
     OR NEW.theme_color IS DISTINCT FROM OLD.theme_color
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.is_locked IS DISTINCT FROM OLD.is_locked THEN
    RAISE EXCEPTION 'Only activated_at may be changed by non-super-admins';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Drop credential columns from the publicly readable schools table
ALTER TABLE public.schools DROP COLUMN IF EXISTS admin_email;
ALTER TABLE public.schools DROP COLUMN IF EXISTS admin_password_hash;

-- 5) Remove the anon "activate a school" policy (activation now via secure edge function)
DROP POLICY IF EXISTS "Anyone can activate a school once" ON public.schools;

-- 6) Block anonymous listing of public storage buckets (public image links still work)
DROP POLICY IF EXISTS "Public can view school logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view student photos" ON storage.objects;
