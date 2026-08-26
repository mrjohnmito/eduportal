ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_auth_user_id_key
  ON public.teachers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;