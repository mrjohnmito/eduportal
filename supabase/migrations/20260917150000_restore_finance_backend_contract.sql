BEGIN;

-- The remote project may contain older versions of the finance tables. Add the
-- columns required by the contract without replacing existing rows or tables.
ALTER TABLE public.student_fee_accounts
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_due numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_charged numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'UNPAID';

ALTER TABLE public.student_feeding_accounts
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS class_level text,
  ADD COLUMN IF NOT EXISTS daily_rate numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeding_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_charged numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'UNPAID';

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS fee_account_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_voided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE public.feeding_fee_payments
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS fee_account_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_voided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS is_voided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE public.feeding_fee_payments
  ADD COLUMN IF NOT EXISTS is_voided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

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

CREATE OR REPLACE FUNCTION public.record_school_fee_payment(
  p_school_id uuid,
  p_student_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_received_by text DEFAULT NULL,
  p_remarks text DEFAULT NULL,
  p_academic_year text DEFAULT NULL,
  p_term text DEFAULT NULL
)
RETURNS public.fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_account public.student_fee_accounts%ROWTYPE;
  v_payment public.fee_payments%ROWTYPE;
  v_year text := COALESCE(p_academic_year, '');
  v_term text := COALESCE(p_term, '');
  v_charged numeric(12,2) := 0;
  v_paid numeric(12,2);
BEGIN
  IF NOT public.user_school_finance_access(auth.uid(), p_school_id) THEN
    RAISE EXCEPTION 'Not authorized for this school';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF p_payment_method NOT IN ('Cash', 'Mobile Money', 'Bank', 'Other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_student FROM public.students
  WHERE id = p_student_id AND school_id = p_school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student does not belong to this school'; END IF;

  SELECT * INTO v_account FROM public.student_fee_accounts
  WHERE school_id = p_school_id AND student_id = p_student_id
    AND academic_year = v_year AND term = v_term
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT COALESCE(total_amount, 0) INTO v_charged
    FROM public.fee_structures
    WHERE school_id = p_school_id AND academic_year = v_year
      AND term = v_term AND class_level = v_student.class_level;

    INSERT INTO public.student_fee_accounts (
      school_id, student_id, academic_year, term, class_level,
      total_charged, total_due, outstanding_balance, payment_status
    ) VALUES (
      p_school_id, p_student_id, v_year, v_term, v_student.class_level,
      v_charged, v_charged, v_charged,
      CASE WHEN v_charged > 0 THEN 'UNPAID' ELSE 'PAID' END
    ) RETURNING * INTO v_account;
  END IF;

  INSERT INTO public.fee_payments (
    school_id, student_id, fee_account_id, academic_year, term,
    amount, payment_method, reference_number, received_by, remarks, created_by
  ) VALUES (
    p_school_id, p_student_id, v_account.id, v_year, v_term,
    p_amount, p_payment_method, p_reference_number, p_received_by, p_remarks, auth.uid()
  ) RETURNING * INTO v_payment;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.fee_payments
  WHERE fee_account_id = v_account.id AND NOT is_voided;

  UPDATE public.student_fee_accounts
  SET total_paid = v_paid,
      total_due = GREATEST(v_account.total_charged - v_account.discount_amount, 0),
      outstanding_balance = GREATEST(v_account.total_charged - v_account.discount_amount - v_paid, 0),
      payment_status = CASE
        WHEN v_paid > GREATEST(v_account.total_charged - v_account.discount_amount, 0) THEN 'OVERPAID'
        WHEN v_paid >= GREATEST(v_account.total_charged - v_account.discount_amount, 0) THEN 'PAID'
        WHEN v_paid > 0 THEN 'PARTIALLY PAID'
        ELSE 'UNPAID'
      END
  WHERE id = v_account.id;

  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_feeding_fee_payment(
  p_school_id uuid,
  p_student_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_received_by text DEFAULT NULL,
  p_remarks text DEFAULT NULL,
  p_academic_year text DEFAULT NULL,
  p_term text DEFAULT NULL
)
RETURNS public.feeding_fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_account public.student_feeding_accounts%ROWTYPE;
  v_payment public.feeding_fee_payments%ROWTYPE;
  v_year text := COALESCE(p_academic_year, '');
  v_term text := COALESCE(p_term, '');
  v_charged numeric(12,2) := 0;
  v_paid numeric(12,2);
BEGIN
  IF NOT public.user_school_finance_access(auth.uid(), p_school_id) THEN
    RAISE EXCEPTION 'Not authorized for this school';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF p_payment_method NOT IN ('Cash', 'Mobile Money', 'Bank', 'Other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_student FROM public.students
  WHERE id = p_student_id AND school_id = p_school_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student does not belong to this school'; END IF;

  SELECT * INTO v_account FROM public.student_feeding_accounts
  WHERE school_id = p_school_id AND student_id = p_student_id
    AND academic_year = v_year AND term = v_term
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT COALESCE(daily_rate * feeding_days, 0) INTO v_charged
    FROM public.feeding_fee_settings
    WHERE school_id = p_school_id AND academic_year = v_year
      AND term = v_term AND class_level = v_student.class_level;

    INSERT INTO public.student_feeding_accounts (
      school_id, student_id, academic_year, term, class_level,
      total_charged, outstanding_balance, payment_status
    ) VALUES (
      p_school_id, p_student_id, v_year, v_term, v_student.class_level,
      v_charged, v_charged, CASE WHEN v_charged > 0 THEN 'UNPAID' ELSE 'PAID' END
    ) RETURNING * INTO v_account;
  END IF;

  INSERT INTO public.feeding_fee_payments (
    school_id, student_id, fee_account_id, academic_year, term,
    amount, payment_method, reference_number, received_by, remarks, created_by
  ) VALUES (
    p_school_id, p_student_id, v_account.id, v_year, v_term,
    p_amount, p_payment_method, p_reference_number, p_received_by, p_remarks, auth.uid()
  ) RETURNING * INTO v_payment;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.feeding_fee_payments
  WHERE fee_account_id = v_account.id AND NOT is_voided;

  UPDATE public.student_feeding_accounts
  SET total_paid = v_paid,
      outstanding_balance = GREATEST(v_account.total_charged - v_paid, 0),
      payment_status = CASE
        WHEN v_paid > v_account.total_charged THEN 'OVERPAID'
        WHEN v_paid >= v_account.total_charged THEN 'PAID'
        WHEN v_paid > 0 THEN 'PARTIALLY PAID'
        ELSE 'UNPAID'
      END
  WHERE id = v_account.id;

  RETURN v_payment;
END;
$$;

DROP FUNCTION IF EXISTS public.void_school_fee_payment(uuid, text);

CREATE FUNCTION public.void_school_fee_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_payment public.fee_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.fee_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT public.user_school_finance_access(auth.uid(), v_payment.school_id) THEN RAISE EXCEPTION 'Not authorized for this school'; END IF;
  IF v_payment.is_voided THEN RAISE EXCEPTION 'Payment is already voided'; END IF;
  UPDATE public.fee_payments SET is_voided = true, voided_at = now(), voided_by = auth.uid(), void_reason = p_reason WHERE id = p_payment_id RETURNING * INTO v_payment;
  UPDATE public.student_fee_accounts a
  SET total_paid = totals.paid,
      outstanding_balance = GREATEST(a.total_charged - a.discount_amount - totals.paid, 0),
      payment_status = CASE
        WHEN totals.paid > GREATEST(a.total_charged - a.discount_amount, 0) THEN 'OVERPAID'
        WHEN totals.paid >= GREATEST(a.total_charged - a.discount_amount, 0) THEN 'PAID'
        WHEN totals.paid > 0 THEN 'PARTIALLY PAID'
        ELSE 'UNPAID'
      END
  FROM (
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM public.fee_payments
    WHERE fee_account_id = v_payment.fee_account_id AND NOT is_voided
  ) totals
  WHERE a.id = v_payment.fee_account_id;
  INSERT INTO public.fee_audit_logs (school_id, entity_type, entity_id, action, actor_id, details)
  VALUES (v_payment.school_id, 'fee_payment', v_payment.id, 'VOID_PAYMENT', auth.uid(), jsonb_build_object('reason', p_reason));
  RETURN v_payment;
END;
$$;

DROP FUNCTION IF EXISTS public.void_feeding_fee_payment(uuid, text);

CREATE FUNCTION public.void_feeding_fee_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.feeding_fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_payment public.feeding_fee_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.feeding_fee_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT public.user_school_finance_access(auth.uid(), v_payment.school_id) THEN RAISE EXCEPTION 'Not authorized for this school'; END IF;
  IF v_payment.is_voided THEN RAISE EXCEPTION 'Payment is already voided'; END IF;
  UPDATE public.feeding_fee_payments SET is_voided = true, voided_at = now(), voided_by = auth.uid(), void_reason = p_reason WHERE id = p_payment_id RETURNING * INTO v_payment;
  UPDATE public.student_feeding_accounts a
  SET total_paid = totals.paid,
      outstanding_balance = GREATEST(a.total_charged - totals.paid, 0),
      payment_status = CASE
        WHEN totals.paid > a.total_charged THEN 'OVERPAID'
        WHEN totals.paid >= a.total_charged THEN 'PAID'
        WHEN totals.paid > 0 THEN 'PARTIALLY PAID'
        ELSE 'UNPAID'
      END
  FROM (
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM public.feeding_fee_payments
    WHERE fee_account_id = v_payment.fee_account_id AND NOT is_voided
  ) totals
  WHERE a.id = v_payment.fee_account_id;
  INSERT INTO public.fee_audit_logs (school_id, entity_type, entity_id, action, actor_id, details)
  VALUES (v_payment.school_id, 'feeding_fee_payment', v_payment.id, 'VOID_PAYMENT', auth.uid(), jsonb_build_object('reason', p_reason));
  RETURN v_payment;
END;
$$;

DROP VIEW IF EXISTS public.financial_dashboard;
DROP VIEW IF EXISTS public.student_financial_statement;
DROP VIEW IF EXISTS public.daily_collection_report;
DROP VIEW IF EXISTS public.payment_method_report;
DROP VIEW IF EXISTS public.student_arrears_report;
DROP VIEW IF EXISTS public.voided_payments_detailed_report;

CREATE VIEW public.financial_dashboard
WITH (security_invoker = true)
AS
SELECT
  s.id AS school_id,
  COALESCE(sf.expected, 0) AS school_fees_expected,
  COALESCE(sf.collected, 0) AS school_fees_collected,
  COALESCE(sf.outstanding, 0) AS school_fees_outstanding,
  COALESCE(ff.expected, 0) AS feeding_fees_expected,
  COALESCE(ff.collected, 0) AS feeding_fees_collected,
  COALESCE(ff.outstanding, 0) AS feeding_fees_outstanding
FROM public.schools s
LEFT JOIN (
  SELECT school_id, SUM(total_due) expected, SUM(total_paid) collected, SUM(outstanding_balance) outstanding
  FROM public.student_fee_accounts GROUP BY school_id
) sf ON sf.school_id = s.id
LEFT JOIN (
  SELECT school_id, SUM(total_charged) expected, SUM(total_paid) collected, SUM(outstanding_balance) outstanding
  FROM public.student_feeding_accounts GROUP BY school_id
) ff ON ff.school_id = s.id;

CREATE VIEW public.student_financial_statement
WITH (security_invoker = true)
AS
SELECT
  a.school_id, a.student_id, st.name AS student_name, a.academic_year, a.term,
  a.class_level, a.total_charged, a.discount_amount, a.total_paid,
  a.total_due, a.outstanding_balance, a.payment_status,
  COALESCE(f.total_charged, 0) AS feeding_total_charged,
  COALESCE(f.total_paid, 0) AS feeding_total_paid,
  COALESCE(f.outstanding_balance, 0) AS feeding_outstanding_balance,
  (a.outstanding_balance + COALESCE(f.outstanding_balance, 0)) AS total_outstanding
FROM public.student_fee_accounts a
JOIN public.students st ON st.id = a.student_id
LEFT JOIN public.student_feeding_accounts f
  ON f.school_id = a.school_id AND f.student_id = a.student_id
  AND f.academic_year = a.academic_year AND f.term = a.term;

CREATE VIEW public.daily_collection_report
WITH (security_invoker = true)
AS
SELECT p.school_id, p.id AS payment_id, p.student_id, st.name AS student_name,
  p.payment_date, p.payment_method, p.amount, p.reference_number,
  p.received_by, 'School Fees'::text AS fee_category
FROM public.fee_payments p JOIN public.students st ON st.id = p.student_id
WHERE NOT p.is_voided
UNION ALL
SELECT p.school_id, p.id AS payment_id, p.student_id, st.name AS student_name,
  p.payment_date, p.payment_method, p.amount, p.reference_number,
  p.received_by, 'Feeding Fees'::text AS fee_category
FROM public.feeding_fee_payments p JOIN public.students st ON st.id = p.student_id
WHERE NOT p.is_voided;

CREATE VIEW public.payment_method_report
WITH (security_invoker = true)
AS
SELECT school_id, payment_method, fee_category, SUM(amount) AS total_amount, COUNT(*) AS payment_count
FROM public.daily_collection_report
GROUP BY school_id, payment_method, fee_category;

CREATE VIEW public.student_arrears_report
WITH (security_invoker = true)
AS
SELECT
  a.school_id, a.student_id, st.name AS student_name, a.class_level,
  a.outstanding_balance AS school_fees_due,
  COALESCE(f.outstanding_balance, 0) AS feeding_fees_due,
  a.outstanding_balance + COALESCE(f.outstanding_balance, 0) AS total_outstanding,
  CASE WHEN a.outstanding_balance + COALESCE(f.outstanding_balance, 0) > 0 THEN 'UNPAID' ELSE 'PAID' END AS status
FROM public.student_fee_accounts a
JOIN public.students st ON st.id = a.student_id
LEFT JOIN public.student_feeding_accounts f
  ON f.school_id = a.school_id AND f.student_id = a.student_id
  AND f.academic_year = a.academic_year AND f.term = a.term
WHERE a.outstanding_balance > 0 OR COALESCE(f.outstanding_balance, 0) > 0;

CREATE VIEW public.voided_payments_detailed_report
WITH (security_invoker = true)
AS
SELECT p.school_id, p.id AS payment_id, p.student_id, st.name AS student_name,
  p.payment_date, p.amount, p.payment_method, p.reference_number,
  p.voided_at, p.voided_by, p.void_reason, 'School Fees'::text AS fee_category
FROM public.fee_payments p JOIN public.students st ON st.id = p.student_id
WHERE p.is_voided
UNION ALL
SELECT p.school_id, p.id AS payment_id, p.student_id, st.name AS student_name,
  p.payment_date, p.amount, p.payment_method, p.reference_number,
  p.voided_at, p.voided_by, p.void_reason, 'Feeding Fees'::text AS fee_category
FROM public.feeding_fee_payments p JOIN public.students st ON st.id = p.student_id
WHERE p.is_voided;

GRANT SELECT ON public.financial_dashboard TO authenticated;
GRANT SELECT ON public.student_financial_statement TO authenticated;
GRANT SELECT ON public.daily_collection_report TO authenticated;
GRANT SELECT ON public.student_arrears_report TO authenticated;
GRANT SELECT ON public.payment_method_report TO authenticated;
GRANT SELECT ON public.voided_payments_detailed_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_school_fee_payment(uuid, uuid, numeric, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_feeding_fee_payment(uuid, uuid, numeric, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_school_fee_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_feeding_fee_payment(uuid, text) TO authenticated;

COMMIT;