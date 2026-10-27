CREATE OR REPLACE FUNCTION public.create_school_with_credentials(
  school_name text,
  school_logo_url text,
  school_code text,
  school_subscription_status boolean,
  school_subscription_expiry date,
  school_theme_color text,
  school_is_locked boolean,
  school_level text,
  credential_email text,
  credential_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _school_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only super admins can register schools';
  END IF;

  IF school_name IS NULL OR btrim(school_name) = '' THEN
    RAISE EXCEPTION 'School name is required';
  END IF;
  IF school_code IS NULL OR btrim(school_code) = '' THEN
    RAISE EXCEPTION 'School code is required';
  END IF;
  IF school_level IS NULL OR school_level NOT IN ('primary', 'jhs', 'both') THEN
    RAISE EXCEPTION 'School level must be primary, jhs or both';
  END IF;

  INSERT INTO public.schools (name, logo_url, school_code, subscription_status, subscription_expiry, theme_color, is_locked, school_level)
  VALUES (btrim(school_name), school_logo_url, upper(btrim(school_code)), COALESCE(school_subscription_status, false), school_subscription_expiry, school_theme_color, COALESCE(school_is_locked, false), school_level)
  RETURNING id INTO _school_id;

  IF credential_email IS NOT NULL AND btrim(credential_email) <> '' THEN
    INSERT INTO public.school_credentials (school_id, admin_email, admin_password_hash)
    VALUES (_school_id, btrim(credential_email), credential_password_hash);
  END IF;

  RETURN _school_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_school_with_credentials(text, text, text, boolean, date, text, boolean, text, text, text) TO authenticated;