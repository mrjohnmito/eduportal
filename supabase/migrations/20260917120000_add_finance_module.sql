BEGIN;

CREATE OR REPLACE FUNCTION public.user_school_finance_access(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _school_id = public.get_user_school_id(_user_id)
    AND (
      public.has_role(_user_id, 'admin'::public.app_role)
    )
  ) OR public.has_role(_user_id, 'super_admin'::public.app_role);
$$;

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  title text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year, term, class_level)
);

CREATE TABLE IF NOT EXISTS public.fee_structure_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_structure_id uuid NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fee_structure_id, fee_type)
);

CREATE TABLE IF NOT EXISTS public.student_fee_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  fee_structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  total_charged numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  total_due numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIALLY PAID','PAID','OVERPAID')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id, academic_year, term)
);

CREATE TABLE IF NOT EXISTS public.student_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_account_id uuid NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  fee_type text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'structure',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_account_id uuid REFERENCES public.student_fee_accounts(id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  term text NOT NULL,
  fee_type text NOT NULL DEFAULT 'Tuition',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('Cash','Mobile Money','Bank','Other')),
  reference_number text,
  received_by text,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_account_id uuid REFERENCES public.student_fee_accounts(id) ON DELETE SET NULL,
  fee_type text NOT NULL,
  original_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  authorized_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  receipt_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feeding_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  feeding_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year, term, class_level)
);

CREATE TABLE IF NOT EXISTS public.student_feeding_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  feeding_days integer NOT NULL DEFAULT 0,
  total_charged numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  excluded boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIALLY PAID','PAID','OVERPAID')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id, academic_year, term)
);

CREATE TABLE IF NOT EXISTS public.feeding_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_account_id uuid NOT NULL REFERENCES public.student_feeding_accounts(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  feeding_days integer NOT NULL DEFAULT 0,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feeding_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_account_id uuid REFERENCES public.student_feeding_accounts(id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  term text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('Cash','Mobile Money','Bank','Other')),
  reference_number text,
  received_by text,
  remarks text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing installations may already have one of these tables from an earlier
-- attempt without the school scope column. Keep the tables and data, but make
-- the shared school-scoped policies valid before they are created.
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_structure_items
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_fee_accounts
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_fee_charges
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_discounts
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_receipts
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_audit_logs
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.feeding_fee_settings
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.student_feeding_accounts
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.feeding_fee_charges
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.feeding_fee_payments
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures (school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_items_structure ON public.fee_structure_items (fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_student ON public.student_fee_accounts (student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_payments_student ON public.fee_payments (student_id);
CREATE INDEX IF NOT EXISTS idx_feeding_fee_settings_school ON public.feeding_fee_settings (school_id);
CREATE INDEX IF NOT EXISTS idx_student_feeding_accounts_student ON public.student_feeding_accounts (student_id);
CREATE INDEX IF NOT EXISTS idx_feeding_fee_payments_student ON public.feeding_fee_payments (student_id);

CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fee_accounts_updated_at
  BEFORE UPDATE ON public.student_fee_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feeding_fee_settings_updated_at
  BEFORE UPDATE ON public.feeding_fee_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_feeding_accounts_updated_at
  BEFORE UPDATE ON public.student_feeding_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feeding_fee_payments_updated_at
  BEFORE UPDATE ON public.feeding_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_feeding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_fee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School finance admins and accountants can manage fee structures"
ON public.fee_structures FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage fee structure items"
ON public.fee_structure_items FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage student fee accounts"
ON public.student_fee_accounts FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage student fee charges"
ON public.student_fee_charges FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage fee payments"
ON public.fee_payments FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage fee discounts"
ON public.fee_discounts FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage fee receipts"
ON public.fee_receipts FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage fee audit logs"
ON public.fee_audit_logs FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage feeding settings"
ON public.feeding_fee_settings FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage feeding accounts"
ON public.student_feeding_accounts FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage feeding charges"
ON public.feeding_fee_charges FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

CREATE POLICY "School finance admins and accountants can manage feeding payments"
ON public.feeding_fee_payments FOR ALL
USING (public.user_school_finance_access(auth.uid(), school_id))
WITH CHECK (public.user_school_finance_access(auth.uid(), school_id));

COMMIT;
