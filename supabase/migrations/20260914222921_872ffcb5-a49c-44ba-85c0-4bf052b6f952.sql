CREATE SEQUENCE IF NOT EXISTS public.fee_receipt_seq;
GRANT USAGE, SELECT ON SEQUENCE public.fee_receipt_seq TO authenticated, service_role;

-- 1. financial_dashboard
CREATE OR REPLACE VIEW public.financial_dashboard WITH (security_invoker = true) AS
WITH keys AS (
  SELECT school_id, academic_year, term FROM public.student_fee_accounts
  UNION SELECT school_id, academic_year, term FROM public.student_feeding_accounts
  UNION SELECT school_id, academic_year, term FROM public.fee_payments
  UNION SELECT school_id, academic_year, term FROM public.feeding_fee_payments
),
sf AS (
  SELECT school_id, academic_year, term,
         COALESCE(SUM(amount_due),0) c, COALESCE(SUM(total_paid),0) p, COALESCE(SUM(balance),0) b
  FROM public.student_fee_accounts GROUP BY 1,2,3
),
ff AS (
  SELECT school_id, academic_year, term,
         COALESCE(SUM(total_charged),0) c, COALESCE(SUM(total_paid),0) p, COALESCE(SUM(balance),0) b
  FROM public.student_feeding_accounts WHERE is_excluded = false GROUP BY 1,2,3
),
arr AS (
  SELECT school_id, academic_year, term, COUNT(DISTINCT student_id) n FROM (
    SELECT school_id, academic_year, term, student_id FROM public.student_fee_accounts WHERE COALESCE(balance,0) > 0
    UNION
    SELECT school_id, academic_year, term, student_id FROM public.student_feeding_accounts WHERE is_excluded = false AND COALESCE(balance,0) > 0
  ) x GROUP BY 1,2,3
),
tsp AS (
  SELECT school_id, academic_year, term, COALESCE(SUM(amount),0) a FROM public.fee_payments
  WHERE voided_at IS NULL AND payment_date = CURRENT_DATE GROUP BY 1,2,3
),
tfp AS (
  SELECT school_id, academic_year, term, COALESCE(SUM(amount),0) a FROM public.feeding_fee_payments
  WHERE voided_at IS NULL AND payment_date = CURRENT_DATE GROUP BY 1,2,3
),
vd AS (
  SELECT school_id, academic_year, term, COUNT(*) n, COALESCE(SUM(amount),0) a FROM (
    SELECT school_id, academic_year, term, amount FROM public.fee_payments WHERE voided_at IS NOT NULL
    UNION ALL
    SELECT school_id, academic_year, term, amount FROM public.feeding_fee_payments WHERE voided_at IS NOT NULL
  ) y GROUP BY 1,2,3
)
SELECT k.school_id, k.academic_year, k.term,
  COALESCE(sf.c,0) AS total_school_fees_charged,
  COALESCE(sf.p,0) AS total_school_fees_collected,
  COALESCE(sf.b,0) AS outstanding_school_fees,
  COALESCE(ff.c,0) AS total_feeding_fees_charged,
  COALESCE(ff.p,0) AS total_feeding_fees_collected,
  COALESCE(ff.b,0) AS outstanding_feeding_fees,
  COALESCE(sf.c,0) + COALESCE(ff.c,0) AS total_charged,
  COALESCE(sf.p,0) + COALESCE(ff.p,0) AS total_collected,
  COALESCE(sf.b,0) + COALESCE(ff.b,0) AS total_outstanding,
  COALESCE(arr.n,0) AS students_with_arrears,
  COALESCE(tsp.a,0) AS today_school_fees_collected,
  COALESCE(tfp.a,0) AS today_feeding_fees_collected,
  COALESCE(tsp.a,0) + COALESCE(tfp.a,0) AS today_total_collected,
  COALESCE(vd.n,0) AS voided_payment_count,
  COALESCE(vd.a,0) AS voided_payment_amount
FROM keys k
LEFT JOIN sf ON sf.school_id=k.school_id AND sf.academic_year=k.academic_year AND sf.term=k.term
LEFT JOIN ff ON ff.school_id=k.school_id AND ff.academic_year=k.academic_year AND ff.term=k.term
LEFT JOIN arr ON arr.school_id=k.school_id AND arr.academic_year=k.academic_year AND arr.term=k.term
LEFT JOIN tsp ON tsp.school_id=k.school_id AND tsp.academic_year=k.academic_year AND tsp.term=k.term
LEFT JOIN tfp ON tfp.school_id=k.school_id AND tfp.academic_year=k.academic_year AND tfp.term=k.term
LEFT JOIN vd ON vd.school_id=k.school_id AND vd.academic_year=k.academic_year AND vd.term=k.term;

-- 2. student_financial_statement
CREATE OR REPLACE VIEW public.student_financial_statement WITH (security_invoker = true) AS
WITH keys AS (
  SELECT school_id, student_id, academic_year, term, class_level FROM public.student_fee_accounts
  UNION
  SELECT school_id, student_id, academic_year, term, class_level FROM public.student_feeding_accounts
)
SELECT k.school_id, k.student_id, s.name AS student_name, k.class_level, k.academic_year, k.term,
  COALESCE(a.total_charged,0) AS school_fees_charged,
  COALESCE(a.total_discount,0) AS school_fees_discount,
  COALESCE(a.amount_due,0) AS school_fees_due,
  COALESCE(a.total_paid,0) AS school_fees_paid,
  COALESCE(a.balance,0) AS school_fees_balance,
  COALESCE(a.status,'UNPAID') AS school_fees_status,
  COALESCE(f.is_excluded,false) AS feeding_excluded,
  COALESCE(f.total_charged,0) AS feeding_fees_charged,
  COALESCE(f.total_paid,0) AS feeding_fees_paid,
  COALESCE(f.balance,0) AS feeding_fees_balance,
  COALESCE(f.status,'UNPAID') AS feeding_fees_status,
  COALESCE(a.balance,0) + COALESCE(f.balance,0) AS total_outstanding
FROM keys k
JOIN public.students s ON s.id = k.student_id
LEFT JOIN public.student_fee_accounts a
  ON a.school_id=k.school_id AND a.student_id=k.student_id AND a.academic_year=k.academic_year AND a.term=k.term
LEFT JOIN public.student_feeding_accounts f
  ON f.school_id=k.school_id AND f.student_id=k.student_id AND f.academic_year=k.academic_year AND f.term=k.term;

-- 3. daily_collection_report
CREATE OR REPLACE VIEW public.daily_collection_report WITH (security_invoker = true) AS
SELECT p.id AS payment_id, 'school'::text AS payment_type, p.school_id, p.student_id, s.name AS student_name,
       a.class_level, p.academic_year, p.term, p.amount, p.payment_date, p.payment_method,
       p.reference_number, p.received_by, p.remarks, r.receipt_number
FROM public.fee_payments p
JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.student_fee_accounts a ON a.id = p.account_id
LEFT JOIN public.fee_receipts r ON r.payment_id = p.id AND r.payment_kind = 'school'
WHERE p.voided_at IS NULL
UNION ALL
SELECT p.id, 'feeding'::text, p.school_id, p.student_id, s.name,
       a.class_level, p.academic_year, p.term, p.amount, p.payment_date, p.payment_method,
       p.reference_number, p.received_by, p.remarks, r.receipt_number
FROM public.feeding_fee_payments p
JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.student_feeding_accounts a ON a.id = p.account_id
LEFT JOIN public.fee_receipts r ON r.payment_id = p.id AND r.payment_kind = 'feeding'
WHERE p.voided_at IS NULL;

-- 4. student_arrears_report
CREATE OR REPLACE VIEW public.student_arrears_report WITH (security_invoker = true) AS
SELECT * FROM public.student_financial_statement WHERE total_outstanding > 0;

-- 5. payment_method_report
CREATE OR REPLACE VIEW public.payment_method_report WITH (security_invoker = true) AS
SELECT school_id, academic_year, term, payment_date, payment_type, payment_method,
       COUNT(*) AS payment_count, SUM(amount) AS total_amount
FROM public.daily_collection_report
GROUP BY 1,2,3,4,5,6;

-- 6. voided_payments_detailed_report
CREATE OR REPLACE VIEW public.voided_payments_detailed_report WITH (security_invoker = true) AS
SELECT p.id AS payment_id, 'school'::text AS payment_type, p.school_id, r.receipt_number,
       p.student_id, s.name AS student_name, a.class_level, p.academic_year, p.term,
       p.amount, p.payment_method, p.payment_date, p.received_by,
       p.voided_by, p.voided_at, p.void_reason, 'VOIDED'::text AS status
FROM public.fee_payments p
JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.student_fee_accounts a ON a.id = p.account_id
LEFT JOIN public.fee_receipts r ON r.payment_id = p.id AND r.payment_kind = 'school'
WHERE p.voided_at IS NOT NULL
UNION ALL
SELECT p.id, 'feeding'::text, p.school_id, r.receipt_number,
       p.student_id, s.name, a.class_level, p.academic_year, p.term,
       p.amount, p.payment_method, p.payment_date, p.received_by,
       p.voided_by, p.voided_at, p.void_reason, 'VOIDED'::text
FROM public.feeding_fee_payments p
JOIN public.students s ON s.id = p.student_id
LEFT JOIN public.student_feeding_accounts a ON a.id = p.account_id
LEFT JOIN public.fee_receipts r ON r.payment_id = p.id AND r.payment_kind = 'feeding'
WHERE p.voided_at IS NOT NULL;

GRANT SELECT ON public.financial_dashboard, public.student_financial_statement,
  public.daily_collection_report, public.student_arrears_report,
  public.payment_method_report, public.voided_payments_detailed_report
  TO authenticated, service_role;

-- RPC: record school fee payment
CREATE OR REPLACE FUNCTION public.record_school_fee_payment(
  _account_id uuid, _amount numeric, _payment_date date, _payment_method text,
  _reference_number text DEFAULT NULL, _received_by text DEFAULT NULL, _remarks text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE acc public.student_fee_accounts; bb numeric; ba numeric; pid uuid; rn text;
BEGIN
  SELECT * INTO acc FROM public.student_fee_accounts WHERE id = _account_id;
  IF acc.id IS NULL THEN RAISE EXCEPTION 'Fee account not found'; END IF;
  IF NOT public.has_finance_access(auth.uid(), acc.school_id) THEN
    RAISE EXCEPTION 'Not authorised to record payments for this school';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  bb := COALESCE(acc.balance, 0);
  INSERT INTO public.fee_payments (school_id, account_id, student_id, academic_year, term, amount,
    payment_date, payment_method, reference_number, received_by, received_by_user, remarks, balance_before)
  VALUES (acc.school_id, acc.id, acc.student_id, acc.academic_year, acc.term, _amount,
    COALESCE(_payment_date, CURRENT_DATE), _payment_method, _reference_number, _received_by, auth.uid(), _remarks, bb)
  RETURNING id INTO pid;

  SELECT COALESCE(balance,0) INTO ba FROM public.student_fee_accounts WHERE id = _account_id;
  UPDATE public.fee_payments SET balance_after = ba WHERE id = pid;

  rn := 'RCP-' || lpad(nextval('public.fee_receipt_seq')::text, 6, '0');
  INSERT INTO public.fee_receipts (school_id, receipt_number, payment_kind, payment_id, student_id,
    academic_year, term, class_level, amount, balance_before, balance_after, payment_method,
    reference_number, received_by)
  VALUES (acc.school_id, rn, 'school', pid, acc.student_id, acc.academic_year, acc.term, acc.class_level,
    _amount, bb, ba, _payment_method, _reference_number, _received_by);

  RETURN jsonb_build_object('payment_id', pid, 'receipt_number', rn, 'balance_before', bb, 'balance_after', ba);
END;
$$;

-- RPC: record feeding fee payment
CREATE OR REPLACE FUNCTION public.record_feeding_fee_payment(
  _account_id uuid, _amount numeric, _payment_date date, _payment_method text,
  _reference_number text DEFAULT NULL, _received_by text DEFAULT NULL, _remarks text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE acc public.student_feeding_accounts; bb numeric; ba numeric; pid uuid; rn text;
BEGIN
  SELECT * INTO acc FROM public.student_feeding_accounts WHERE id = _account_id;
  IF acc.id IS NULL THEN RAISE EXCEPTION 'Feeding account not found'; END IF;
  IF NOT public.has_finance_access(auth.uid(), acc.school_id) THEN
    RAISE EXCEPTION 'Not authorised to record payments for this school';
  END IF;
  IF acc.is_excluded THEN RAISE EXCEPTION 'This student is excluded from feeding fees'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  bb := COALESCE(acc.balance, 0);
  INSERT INTO public.feeding_fee_payments (school_id, account_id, student_id, academic_year, term, amount,
    payment_date, payment_method, reference_number, received_by, received_by_user, remarks, balance_before)
  VALUES (acc.school_id, acc.id, acc.student_id, acc.academic_year, acc.term, _amount,
    COALESCE(_payment_date, CURRENT_DATE), _payment_method, _reference_number, _received_by, auth.uid(), _remarks, bb)
  RETURNING id INTO pid;

  SELECT COALESCE(balance,0) INTO ba FROM public.student_feeding_accounts WHERE id = _account_id;
  UPDATE public.feeding_fee_payments SET balance_after = ba WHERE id = pid;

  rn := 'RCF-' || lpad(nextval('public.fee_receipt_seq')::text, 6, '0');
  INSERT INTO public.fee_receipts (school_id, receipt_number, payment_kind, payment_id, student_id,
    academic_year, term, class_level, amount, balance_before, balance_after, payment_method,
    reference_number, received_by)
  VALUES (acc.school_id, rn, 'feeding', pid, acc.student_id, acc.academic_year, acc.term, acc.class_level,
    _amount, bb, ba, _payment_method, _reference_number, _received_by);

  RETURN jsonb_build_object('payment_id', pid, 'receipt_number', rn, 'balance_before', bb, 'balance_after', ba);
END;
$$;

-- RPC: void school fee payment
CREATE OR REPLACE FUNCTION public.void_school_fee_payment(_payment_id uuid, _reason text, _voided_by text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.fee_payments;
BEGIN
  SELECT * INTO p FROM public.fee_payments WHERE id = _payment_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT public.can_configure_finance(auth.uid(), p.school_id) THEN
    RAISE EXCEPTION 'Not authorised to void payments for this school';
  END IF;
  IF p.voided_at IS NOT NULL THEN RAISE EXCEPTION 'Payment is already voided'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A void reason is required'; END IF;

  UPDATE public.fee_payments
  SET voided_at = now(), void_reason = _reason, voided_by = COALESCE(_voided_by, auth.uid()::text)
  WHERE id = _payment_id;

  RETURN jsonb_build_object('payment_id', _payment_id, 'voided', true);
END;
$$;

-- RPC: void feeding fee payment
CREATE OR REPLACE FUNCTION public.void_feeding_fee_payment(_payment_id uuid, _reason text, _voided_by text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.feeding_fee_payments;
BEGIN
  SELECT * INTO p FROM public.feeding_fee_payments WHERE id = _payment_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT public.can_configure_finance(auth.uid(), p.school_id) THEN
    RAISE EXCEPTION 'Not authorised to void payments for this school';
  END IF;
  IF p.voided_at IS NOT NULL THEN RAISE EXCEPTION 'Payment is already voided'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A void reason is required'; END IF;

  UPDATE public.feeding_fee_payments
  SET voided_at = now(), void_reason = _reason, voided_by = COALESCE(_voided_by, auth.uid()::text)
  WHERE id = _payment_id;

  RETURN jsonb_build_object('payment_id', _payment_id, 'voided', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_school_fee_payment(uuid,numeric,date,text,text,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_feeding_fee_payment(uuid,numeric,date,text,text,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.void_school_fee_payment(uuid,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.void_feeding_fee_payment(uuid,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_school_fee_payment(uuid,numeric,date,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_feeding_fee_payment(uuid,numeric,date,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.void_school_fee_payment(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.void_feeding_fee_payment(uuid,text,text) TO authenticated, service_role;