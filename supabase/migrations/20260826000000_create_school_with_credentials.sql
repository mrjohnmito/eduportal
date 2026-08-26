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
SET search_path = public
AS $$
DECLARE
	new_school_id uuid;
BEGIN
	IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
		RAISE EXCEPTION 'Only super admins can create schools';
	END IF;

	INSERT INTO public.schools (
		name, logo_url, school_code, subscription_status,
		subscription_expiry, theme_color, is_locked, school_level
	)
	VALUES (
		school_name, school_logo_url, school_code, school_subscription_status,
		school_subscription_expiry, school_theme_color, school_is_locked, school_level
	)
	RETURNING id INTO new_school_id;

	INSERT INTO public.school_credentials (school_id, admin_email, admin_password_hash)
	VALUES (new_school_id, credential_email, credential_password_hash);

	RETURN new_school_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_school_with_credentials(
	text, text, text, boolean, date, text, boolean, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_school_with_credentials(
	text, text, text, boolean, date, text, boolean, text, text, text
) TO authenticated;