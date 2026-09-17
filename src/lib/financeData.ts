import { supabase } from '@/integrations/supabase/client';

/**
 * Finance reporting helpers.
 * All figures are computed in the app from the existing finance tables
 * (no database views, functions or schema changes required).
 * Row-level security still restricts every query to the signed-in user's school.
 */

const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);

export interface CollectionRow {
  payment_id: string;
  school_id: string;
  payment_type: string;
  student_name: string;
  class_level: string | null;
  academic_year: string;
  term: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  received_by: string | null;
  receipt_number: string | null;
}

export interface MethodRow {
  payment_date: string;
  payment_type: string;
  payment_method: string;
  payment_count: number;
  total_amount: number;
  academic_year: string;
  term: string;
}

export interface ArrearsRow {
  school_id: string;
  student_id: string;
  student_name: string;
  class_level: string;
  academic_year: string;
  term: string;
  school_fees_balance: number;
  feeding_fees_balance: number;
  total_outstanding: number;
  school_fees_status: string;
}

export interface DashboardRow {
  school_id: string;
  academic_year: string;
  term: string;
  total_school_fees_charged: number;
  total_school_fees_collected: number;
  outstanding_school_fees: number;
  total_feeding_fees_charged: number;
  total_feeding_fees_collected: number;
  outstanding_feeding_fees: number;
  total_charged: number;
  total_collected: number;
  total_outstanding: number;
  students_with_arrears: number;
  today_school_fees_collected: number;
  today_feeding_fees_collected: number;
  today_total_collected: number;
  voided_payment_count: number;
  voided_payment_amount: number;
}

export interface VoidedRow {
  payment_id: string;
  school_id: string;
  payment_type: string;
  receipt_number: string | null;
  student_name: string;
  class_level: string | null;
  academic_year: string;
  term: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  received_by: string | null;
  voided_by: string | null;
  voided_at: string;
  void_reason: string | null;
  status: string;
}

const client = () => supabase as any;

async function studentNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data } = await client().from('students').select('id,name').in('id', unique);
  (data || []).forEach((s: any) => map.set(s.id, s.name));
  return map;
}

async function receiptMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data } = await client().from('fee_receipts').select('payment_id,receipt_number');
  (data || []).forEach((r: any) => map.set(r.payment_id, r.receipt_number));
  return map;
}

async function fetchPayments(voided: boolean) {
  const [sf, ff, sacc, facc, rmap] = await Promise.all([
    client().from('fee_payments').select('*'),
    client().from('feeding_fee_payments').select('*'),
    client().from('student_fee_accounts').select('id,class_level'),
    client().from('student_feeding_accounts').select('id,class_level'),
    receiptMap(),
  ]);
  if (sf.error) throw sf.error;
  if (ff.error) throw ff.error;

  const classOf = new Map<string, string>();
  (sacc.data || []).forEach((a: any) => classOf.set(a.id, a.class_level));
  (facc.data || []).forEach((a: any) => classOf.set(a.id, a.class_level));

  const rows = [
    ...(sf.data || []).map((p: any) => ({ ...p, payment_type: 'School Fees' })),
    ...(ff.data || []).map((p: any) => ({ ...p, payment_type: 'Feeding Fees' })),
  ].filter((p: any) => (voided ? !!p.voided_at : !p.voided_at));

  const names = await studentNames(rows.map((p: any) => p.student_id));

  return rows.map((p: any) => ({
    ...p,
    student_name: names.get(p.student_id) || 'Unknown student',
    class_level: classOf.get(p.account_id) || null,
    receipt_number: rmap.get(p.id) || null,
    amount: num(p.amount),
  }));
}

export async function loadCollections(
  dateFrom: string,
  dateTo: string,
  year?: string,
  term?: string,
): Promise<{ collections: CollectionRow[]; methods: MethodRow[] }> {
  const rows = (await fetchPayments(false)).filter((p: any) =>
    p.payment_date >= dateFrom &&
    p.payment_date <= dateTo &&
    (!year || p.academic_year === year) &&
    (!term || p.term === term),
  );

  const collections: CollectionRow[] = rows
    .map((p: any) => ({
      payment_id: p.id,
      school_id: p.school_id,
      payment_type: p.payment_type,
      student_name: p.student_name,
      class_level: p.class_level,
      academic_year: p.academic_year,
      term: p.term,
      amount: p.amount,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      received_by: p.received_by,
      receipt_number: p.receipt_number,
    }))
    .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

  const grouped = new Map<string, MethodRow>();
  collections.forEach(c => {
    const key = [c.payment_date, c.payment_type, c.payment_method, c.academic_year, c.term].join('|');
    const existing = grouped.get(key);
    if (existing) {
      existing.payment_count += 1;
      existing.total_amount += c.amount;
    } else {
      grouped.set(key, {
        payment_date: c.payment_date,
        payment_type: c.payment_type,
        payment_method: c.payment_method,
        payment_count: 1,
        total_amount: c.amount,
        academic_year: c.academic_year,
        term: c.term,
      });
    }
  });

  return { collections, methods: Array.from(grouped.values()) };
}

export async function loadVoidedPayments(): Promise<VoidedRow[]> {
  const rows = await fetchPayments(true);
  return rows
    .map((p: any) => ({
      payment_id: p.id,
      school_id: p.school_id,
      payment_type: p.payment_type,
      receipt_number: p.receipt_number,
      student_name: p.student_name,
      class_level: p.class_level,
      academic_year: p.academic_year,
      term: p.term,
      amount: p.amount,
      payment_method: p.payment_method,
      payment_date: p.payment_date,
      received_by: p.received_by,
      voided_by: p.voided_by,
      voided_at: p.voided_at,
      void_reason: p.void_reason,
      status: 'VOIDED',
    }))
    .sort((a, b) => (a.voided_at < b.voided_at ? 1 : -1));
}

export async function loadArrears(): Promise<ArrearsRow[]> {
  const [sacc, facc] = await Promise.all([
    client().from('student_fee_accounts').select('*'),
    client().from('student_feeding_accounts').select('*'),
  ]);
  if (sacc.error) throw sacc.error;
  if (facc.error) throw facc.error;

  const key = (r: any) => [r.school_id, r.student_id, r.academic_year, r.term].join('|');
  const merged = new Map<string, ArrearsRow>();

  (sacc.data || []).forEach((a: any) => {
    merged.set(key(a), {
      school_id: a.school_id,
      student_id: a.student_id,
      student_name: '',
      class_level: a.class_level,
      academic_year: a.academic_year,
      term: a.term,
      school_fees_balance: num(a.balance),
      feeding_fees_balance: 0,
      total_outstanding: num(a.balance),
      school_fees_status: a.status || 'UNPAID',
    });
  });

  (facc.data || []).forEach((f: any) => {
    const bal = f.is_excluded ? 0 : num(f.balance);
    const k = key(f);
    const existing = merged.get(k);
    if (existing) {
      existing.feeding_fees_balance = bal;
      existing.total_outstanding = existing.school_fees_balance + bal;
    } else {
      merged.set(k, {
        school_id: f.school_id,
        student_id: f.student_id,
        student_name: '',
        class_level: f.class_level,
        academic_year: f.academic_year,
        term: f.term,
        school_fees_balance: 0,
        feeding_fees_balance: bal,
        total_outstanding: bal,
        school_fees_status: 'UNPAID',
      });
    }
  });

  const rows = Array.from(merged.values()).filter(r => r.total_outstanding > 0);
  const names = await studentNames(rows.map(r => r.student_id));
  rows.forEach(r => { r.student_name = names.get(r.student_id) || 'Unknown student'; });
  return rows.sort((a, b) => b.total_outstanding - a.total_outstanding);
}

export async function loadDashboard(): Promise<DashboardRow[]> {
  const [sacc, facc, arrears, paid, voided] = await Promise.all([
    client().from('student_fee_accounts').select('*'),
    client().from('student_feeding_accounts').select('*'),
    loadArrears(),
    fetchPayments(false),
    fetchPayments(true),
  ]);
  if (sacc.error) throw sacc.error;
  if (facc.error) throw facc.error;

  const today = new Date().toISOString().slice(0, 10);
  const rows = new Map<string, DashboardRow>();
  const blank = (school_id: string, academic_year: string, term: string): DashboardRow => ({
    school_id, academic_year, term,
    total_school_fees_charged: 0, total_school_fees_collected: 0, outstanding_school_fees: 0,
    total_feeding_fees_charged: 0, total_feeding_fees_collected: 0, outstanding_feeding_fees: 0,
    total_charged: 0, total_collected: 0, total_outstanding: 0, students_with_arrears: 0,
    today_school_fees_collected: 0, today_feeding_fees_collected: 0, today_total_collected: 0,
    voided_payment_count: 0, voided_payment_amount: 0,
  });
  const get = (r: any) => {
    const k = [r.school_id, r.academic_year, r.term].join('|');
    if (!rows.has(k)) rows.set(k, blank(r.school_id, r.academic_year, r.term));
    return rows.get(k)!;
  };

  (sacc.data || []).forEach((a: any) => {
    const row = get(a);
    row.total_school_fees_charged += num(a.amount_due);
    row.total_school_fees_collected += num(a.total_paid);
    row.outstanding_school_fees += num(a.balance);
  });

  (facc.data || []).forEach((f: any) => {
    const row = get(f);
    row.total_feeding_fees_charged += f.is_excluded ? 0 : num(f.total_charged);
    row.total_feeding_fees_collected += num(f.total_paid);
    row.outstanding_feeding_fees += f.is_excluded ? 0 : num(f.balance);
  });

  arrears.forEach(a => { get(a).students_with_arrears += 1; });

  paid.filter((p: any) => p.payment_date === today).forEach((p: any) => {
    const row = get(p);
    if (p.payment_type === 'School Fees') row.today_school_fees_collected += p.amount;
    else row.today_feeding_fees_collected += p.amount;
  });

  voided.forEach((p: any) => {
    const row = get(p);
    row.voided_payment_count += 1;
    row.voided_payment_amount += p.amount;
  });

  return Array.from(rows.values()).map(r => ({
    ...r,
    total_charged: r.total_school_fees_charged + r.total_feeding_fees_charged,
    total_collected: r.total_school_fees_collected + r.total_feeding_fees_collected,
    total_outstanding: r.outstanding_school_fees + r.outstanding_feeding_fees,
    today_total_collected: r.today_school_fees_collected + r.today_feeding_fees_collected,
  }));
}
