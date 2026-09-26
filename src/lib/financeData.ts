import { supabase } from '@/integrations/supabase/client';

/**
 * Finance reporting helpers — read the existing database views
 * (financial_dashboard, daily_collection_report, payment_method_report,
 * student_arrears_report, voided_payments_detailed_report).
 * Views are security_invoker, so RLS restricts rows to the user's school.
 */

const num = (v: any) => (v === null || v === undefined ? 0 : Number(v) || 0);

export interface CollectionRow {
  payment_id: string; school_id: string; payment_type: string; student_name: string;
  class_level: string | null; academic_year: string; term: string; amount: number;
  payment_date: string; payment_method: string; reference_number: string | null;
  received_by: string | null; receipt_number: string | null;
}
export interface MethodRow {
  payment_date: string; payment_type: string; payment_method: string;
  payment_count: number; total_amount: number; academic_year: string; term: string;
}
export interface ArrearsRow {
  school_id: string; student_id: string; student_name: string; class_level: string;
  academic_year: string; term: string; school_fees_balance: number;
  feeding_fees_balance: number; total_outstanding: number; school_fees_status: string;
}
export interface DashboardRow {
  school_id: string; academic_year: string; term: string;
  total_school_fees_charged: number; total_school_fees_collected: number; outstanding_school_fees: number;
  total_feeding_fees_charged: number; total_feeding_fees_collected: number; outstanding_feeding_fees: number;
  total_charged: number; total_collected: number; total_outstanding: number; students_with_arrears: number;
  today_school_fees_collected: number; today_feeding_fees_collected: number; today_total_collected: number;
  voided_payment_count: number; voided_payment_amount: number;
}
export interface VoidedRow {
  payment_id: string; school_id: string; payment_type: string; receipt_number: string | null;
  student_name: string; class_level: string | null; academic_year: string; term: string;
  amount: number; payment_method: string; payment_date: string; received_by: string | null;
  voided_by: string | null; voided_at: string; void_reason: string | null; status: string;
}

const client = () => supabase as any;

const numify = <T,>(rows: any[], keys: string[]): T[] =>
  rows.map(r => { const o = { ...r }; keys.forEach(k => { o[k] = num(r[k]); }); return o as T; });

export async function loadCollections(dateFrom: string, dateTo: string, year?: string, term?: string) {
  let cq = client().from('daily_collection_report').select('*')
    .gte('payment_date', dateFrom).lte('payment_date', dateTo).order('payment_date', { ascending: false });
  let mq = client().from('payment_method_report').select('*')
    .gte('payment_date', dateFrom).lte('payment_date', dateTo);
  if (year) { cq = cq.eq('academic_year', year); mq = mq.eq('academic_year', year); }
  if (term) { cq = cq.eq('term', term); mq = mq.eq('term', term); }
  const [c, m] = await Promise.all([cq, mq]);
  if (c.error) throw c.error;
  if (m.error) throw m.error;
  return {
    collections: numify<CollectionRow>(c.data || [], ['amount']),
    methods: numify<MethodRow>(m.data || [], ['payment_count', 'total_amount']),
  };
}

export async function loadVoidedPayments(): Promise<VoidedRow[]> {
  const { data, error } = await client().from('voided_payments_detailed_report')
    .select('*').order('voided_at', { ascending: false });
  if (error) throw error;
  return numify<VoidedRow>(data || [], ['amount']);
}

export async function loadArrears(): Promise<ArrearsRow[]> {
  const { data, error } = await client().from('student_arrears_report')
    .select('*').order('total_outstanding', { ascending: false });
  if (error) throw error;
  return numify<ArrearsRow>(data || [], ['school_fees_balance', 'feeding_fees_balance', 'total_outstanding']);
}

export async function loadDashboard(): Promise<DashboardRow[]> {
  const { data, error } = await client().from('financial_dashboard').select('*');
  if (error) throw error;
  return numify<DashboardRow>(data || [], [
    'total_school_fees_charged', 'total_school_fees_collected', 'outstanding_school_fees',
    'total_feeding_fees_charged', 'total_feeding_fees_collected', 'outstanding_feeding_fees',
    'total_charged', 'total_collected', 'total_outstanding', 'students_with_arrears',
    'today_school_fees_collected', 'today_feeding_fees_collected', 'today_total_collected',
    'voided_payment_count', 'voided_payment_amount',
  ]);
}
