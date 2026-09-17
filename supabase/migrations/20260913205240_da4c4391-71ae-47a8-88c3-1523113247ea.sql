
-- ===== Helper security functions =====
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin'::public.app_role)
     OR ((public.has_role(_user_id, 'admin'::public.app_role)
          OR public.has_role(_user_id, 'accountant'::public.app_role))
         AND _school_id IS NOT NULL
         AND _school_id = public.get_user_school_id(_user_id));
$$;

CREATE OR REPLACE FUNCTION public.can_configure_finance(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin'::public.app_role)
     OR (public.has_role(_user_id, 'admin'::public.app_role)
         AND _school_id IS NOT NULL
         AND _school_id = public.get_user_school_id(_user_id));
$$;

REVOKE EXECUTE ON FUNCTION public.has_finance_access(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_configure_finance(uuid, uuid) FROM anon;

-- ===== Fee types =====
CREATE TABLE public.fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_types TO authenticated;
GRANT ALL ON public.fee_types TO service_role;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_types_select" ON public.fee_types FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_types_insert" ON public.fee_types FOR INSERT TO authenticated WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_types_update" ON public.fee_types FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_types_delete" ON public.fee_types FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

-- ===== Fee structures =====
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year, term, class_level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structures_select" ON public.fee_structures FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_structures_insert" ON public.fee_structures FOR INSERT TO authenticated WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_structures_update" ON public.fee_structures FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_structures_delete" ON public.fee_structures FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

CREATE TABLE public.fee_structure_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  structure_id uuid NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  fee_type_id uuid REFERENCES public.fee_types(id) ON DELETE SET NULL,
  fee_type_name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (structure_id, fee_type_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structure_items TO authenticated;
GRANT ALL ON public.fee_structure_items TO service_role;
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structure_items_select" ON public.fee_structure_items FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_structure_items_insert" ON public.fee_structure_items FOR INSERT TO authenticated WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_structure_items_update" ON public.fee_structure_items FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_structure_items_delete" ON public.fee_structure_items FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

-- ===== Student fee accounts =====
CREATE TABLE public.student_fee_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  total_charged numeric(12,2) NOT NULL DEFAULT 0,
  total_discount numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  amount_due numeric(12,2) GENERATED ALWAYS AS (total_charged - total_discount) STORED,
  balance numeric(12,2) GENERATED ALWAYS AS (total_charged - total_discount - total_paid) STORED,
  status text GENERATED ALWAYS AS (
    CASE
      WHEN (total_charged - total_discount - total_paid) < 0 THEN 'OVERPAID'
      WHEN total_paid = 0 THEN 'UNPAID'
      WHEN (total_charged - total_discount - total_paid) = 0 THEN 'PAID'
      ELSE 'PARTIALLY PAID'
    END) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_fee_accounts TO authenticated;
GRANT ALL ON public.student_fee_accounts TO service_role;
ALTER TABLE public.student_fee_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_fee_accounts_select" ON public.student_fee_accounts FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_fee_accounts_insert" ON public.student_fee_accounts FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_fee_accounts_update" ON public.student_fee_accounts FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid(), school_id)) WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_fee_accounts_delete" ON public.student_fee_accounts FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

CREATE TABLE public.student_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  fee_type_name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, fee_type_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_fee_charges TO authenticated;
GRANT ALL ON public.student_fee_charges TO service_role;
ALTER TABLE public.student_fee_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_fee_charges_select" ON public.student_fee_charges FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_fee_charges_insert" ON public.student_fee_charges FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_fee_charges_update" ON public.student_fee_charges FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "student_fee_charges_delete" ON public.student_fee_charges FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

-- ===== Discounts =====
CREATE TABLE public.fee_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  original_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  reason text,
  authorized_by text,
  authorized_by_user uuid,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fee_discounts TO authenticated;
GRANT ALL ON public.fee_discounts TO service_role;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_discounts_select" ON public.fee_discounts FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_discounts_insert" ON public.fee_discounts FOR INSERT TO authenticated WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "fee_discounts_update" ON public.fee_discounts FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));

-- ===== School fee payments =====
CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash','Mobile Money','Bank','Other')),
  reference_number text,
  received_by text,
  received_by_user uuid,
  remarks text,
  balance_before numeric(12,2),
  balance_after numeric(12,2),
  voided_at timestamptz,
  void_reason text,
  voided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_payments_select" ON public.fee_payments FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_payments_insert" ON public.fee_payments FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_payments_update" ON public.fee_payments FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid(), school_id)) WITH CHECK (public.has_finance_access(auth.uid(), school_id));

-- ===== Feeding fees =====
CREATE TABLE public.feeding_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
  feeding_days integer NOT NULL DEFAULT 0 CHECK (feeding_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year, term, class_level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feeding_fee_settings TO authenticated;
GRANT ALL ON public.feeding_fee_settings TO service_role;
ALTER TABLE public.feeding_fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feeding_fee_settings_select" ON public.feeding_fee_settings FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "feeding_fee_settings_insert" ON public.feeding_fee_settings FOR INSERT TO authenticated WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "feeding_fee_settings_update" ON public.feeding_fee_settings FOR UPDATE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id)) WITH CHECK (public.can_configure_finance(auth.uid(), school_id));
CREATE POLICY "feeding_fee_settings_delete" ON public.feeding_fee_settings FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

CREATE TABLE public.student_feeding_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text NOT NULL,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
  feeding_days integer NOT NULL DEFAULT 0 CHECK (feeding_days >= 0),
  is_excluded boolean NOT NULL DEFAULT false,
  total_charged numeric(12,2) GENERATED ALWAYS AS (CASE WHEN is_excluded THEN 0 ELSE daily_rate * feeding_days END) STORED,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) GENERATED ALWAYS AS ((CASE WHEN is_excluded THEN 0 ELSE daily_rate * feeding_days END) - total_paid) STORED,
  status text GENERATED ALWAYS AS (
    CASE
      WHEN ((CASE WHEN is_excluded THEN 0 ELSE daily_rate * feeding_days END) - total_paid) < 0 THEN 'OVERPAID'
      WHEN total_paid = 0 THEN 'UNPAID'
      WHEN ((CASE WHEN is_excluded THEN 0 ELSE daily_rate * feeding_days END) - total_paid) = 0 THEN 'PAID'
      ELSE 'PARTIALLY PAID'
    END) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_feeding_accounts TO authenticated;
GRANT ALL ON public.student_feeding_accounts TO service_role;
ALTER TABLE public.student_feeding_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_feeding_accounts_select" ON public.student_feeding_accounts FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_feeding_accounts_insert" ON public.student_feeding_accounts FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_feeding_accounts_update" ON public.student_feeding_accounts FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid(), school_id)) WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "student_feeding_accounts_delete" ON public.student_feeding_accounts FOR DELETE TO authenticated USING (public.can_configure_finance(auth.uid(), school_id));

CREATE TABLE public.feeding_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.student_feeding_accounts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash','Mobile Money','Bank','Other')),
  reference_number text,
  received_by text,
  received_by_user uuid,
  remarks text,
  balance_before numeric(12,2),
  balance_after numeric(12,2),
  voided_at timestamptz,
  void_reason text,
  voided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.feeding_fee_payments TO authenticated;
GRANT ALL ON public.feeding_fee_payments TO service_role;
ALTER TABLE public.feeding_fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feeding_fee_payments_select" ON public.feeding_fee_payments FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "feeding_fee_payments_insert" ON public.feeding_fee_payments FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "feeding_fee_payments_update" ON public.feeding_fee_payments FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid(), school_id)) WITH CHECK (public.has_finance_access(auth.uid(), school_id));

-- ===== Receipts =====
CREATE SEQUENCE public.fee_receipt_seq START 1000;
GRANT USAGE ON SEQUENCE public.fee_receipt_seq TO authenticated, service_role;

CREATE TABLE public.fee_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  payment_kind text NOT NULL CHECK (payment_kind IN ('school','feeding')),
  payment_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_level text,
  amount numeric(12,2) NOT NULL,
  balance_before numeric(12,2),
  balance_after numeric(12,2),
  payment_method text,
  reference_number text,
  received_by text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_kind, payment_id)
);
GRANT SELECT, INSERT ON public.fee_receipts TO authenticated;
GRANT ALL ON public.fee_receipts TO service_role;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_receipts_select" ON public.fee_receipts FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));
CREATE POLICY "fee_receipts_insert" ON public.fee_receipts FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid(), school_id));

-- ===== Audit log =====
CREATE TABLE public.fee_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fee_audit_logs TO authenticated;
GRANT ALL ON public.fee_audit_logs TO service_role;
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_audit_logs_select" ON public.fee_audit_logs FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid(), school_id));

-- ===== Triggers: updated_at =====
CREATE TRIGGER trg_fee_types_updated BEFORE UPDATE ON public.fee_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fee_structures_updated BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fee_structure_items_updated BEFORE UPDATE ON public.fee_structure_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_student_fee_accounts_updated BEFORE UPDATE ON public.student_fee_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_student_fee_charges_updated BEFORE UPDATE ON public.student_fee_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fee_discounts_updated BEFORE UPDATE ON public.fee_discounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fee_payments_updated BEFORE UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_feeding_fee_settings_updated BEFORE UPDATE ON public.feeding_fee_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_student_feeding_accounts_updated BEFORE UPDATE ON public.student_feeding_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_feeding_fee_payments_updated BEFORE UPDATE ON public.feeding_fee_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Recalculation triggers =====
CREATE OR REPLACE FUNCTION public.recalc_fee_account(_account_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.student_fee_accounts a
  SET total_charged = COALESCE((SELECT SUM(amount) FROM public.student_fee_charges c WHERE c.account_id = a.id), 0),
      total_discount = COALESCE((SELECT SUM(discount_amount) FROM public.fee_discounts d WHERE d.account_id = a.id AND d.voided_at IS NULL), 0),
      total_paid = COALESCE((SELECT SUM(amount) FROM public.fee_payments p WHERE p.account_id = a.id AND p.voided_at IS NULL), 0),
      updated_at = now()
  WHERE a.id = _account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_fee_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_fee_account(OLD.account_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_fee_account(NEW.account_id);
  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    PERFORM public.recalc_fee_account(OLD.account_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_charges_recalc AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_charges FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_fee_account();
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_fee_account();
CREATE TRIGGER trg_discounts_recalc AFTER INSERT OR UPDATE OR DELETE ON public.fee_discounts FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_fee_account();

CREATE OR REPLACE FUNCTION public.trg_recalc_feeding_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _acc uuid;
BEGIN
  _acc := CASE WHEN TG_OP = 'DELETE' THEN OLD.account_id ELSE NEW.account_id END;
  UPDATE public.student_feeding_accounts a
  SET total_paid = COALESCE((SELECT SUM(amount) FROM public.feeding_fee_payments p WHERE p.account_id = a.id AND p.voided_at IS NULL), 0),
      updated_at = now()
  WHERE a.id = _acc;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_feeding_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.feeding_fee_payments FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_feeding_account();

-- ===== Audit trigger =====
CREATE OR REPLACE FUNCTION public.trg_fee_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _school uuid; _entity uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _school := OLD.school_id; _entity := OLD.id;
  ELSE
    _school := NEW.school_id; _entity := NEW.id;
  END IF;
  INSERT INTO public.fee_audit_logs (school_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (_school, auth.uid(), TG_OP, TG_TABLE_NAME, _entity,
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_audit_fee_structures AFTER INSERT OR UPDATE OR DELETE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_fee_structure_items AFTER INSERT OR UPDATE OR DELETE ON public.fee_structure_items FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_fee_payments AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_feeding_payments AFTER INSERT OR UPDATE OR DELETE ON public.feeding_fee_payments FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_fee_discounts AFTER INSERT OR UPDATE OR DELETE ON public.fee_discounts FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_feeding_settings AFTER INSERT OR UPDATE OR DELETE ON public.feeding_fee_settings FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();
CREATE TRIGGER trg_audit_student_fee_charges AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_charges FOR EACH ROW EXECUTE FUNCTION public.trg_fee_audit();

-- ===== Indexes =====
CREATE INDEX idx_fee_structures_lookup ON public.fee_structures (school_id, academic_year, term, class_level);
CREATE INDEX idx_sfa_lookup ON public.student_fee_accounts (school_id, academic_year, term, class_level);
CREATE INDEX idx_sfa_student ON public.student_fee_accounts (student_id);
CREATE INDEX idx_fee_payments_lookup ON public.fee_payments (school_id, payment_date);
CREATE INDEX idx_fee_payments_account ON public.fee_payments (account_id);
CREATE INDEX idx_feeding_payments_lookup ON public.feeding_fee_payments (school_id, payment_date);
CREATE INDEX idx_feeding_payments_account ON public.feeding_fee_payments (account_id);
CREATE INDEX idx_sfda_lookup ON public.student_feeding_accounts (school_id, academic_year, term, class_level);
CREATE INDEX idx_fee_receipts_school ON public.fee_receipts (school_id, issued_at);
CREATE INDEX idx_fee_audit_school ON public.fee_audit_logs (school_id, created_at);
