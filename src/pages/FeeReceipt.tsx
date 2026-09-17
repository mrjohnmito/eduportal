import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrency = (value: number) => `GH₵${Number(value || 0).toFixed(2)}`;

export default function FeeReceipt() {
  const { selectedSchool } = useSelectedSchool();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<Record<string, any>>({});
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSchool) return;

    const load = async () => {
      const [paymentsRes, studentsRes] = await Promise.all([
        (supabase as any).from('fee_payments').select('*').eq('school_id', selectedSchool.id).order('payment_date', { ascending: false }),
        (supabase as any).from('students').select('*').eq('school_id', selectedSchool.id),
      ]);

      const studentMap = Object.fromEntries((studentsRes.data || []).map((student: any) => [student.id, student]));
      setStudents(studentMap);
      setPayments(paymentsRes.data || []);
      if ((paymentsRes.data || []).length) setSelectedPaymentId((paymentsRes.data || [0]).id ?? '');
      setLoading(false);
    };

    load();
  }, [selectedSchool?.id]);

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.id === selectedPaymentId) || payments[0] || null,
    [payments, selectedPaymentId]
  );

  const handlePrint = () => window.print();

  if (!selectedSchool) return null;

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Receipts</p>
            <h1 className="text-3xl font-bold">Fee Receipts</h1>
          </div>
          <Button onClick={handlePrint}>Print receipt</Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {loading ? (
              <p>Loading payments...</p>
            ) : payments.length === 0 ? (
              <p>No payments recorded yet.</p>
            ) : (
              <>
                <div className="max-w-sm">
                  <Select value={selectedPayment?.id || ''} onValueChange={setSelectedPaymentId}>
                    <SelectTrigger><SelectValue placeholder="Select payment" /></SelectTrigger>
                    <SelectContent>
                      {payments.map((payment) => (
                        <SelectItem key={payment.id} value={payment.id}>
                          {students[payment.student_id]?.name || 'Unknown student'} - {payment.reference_number || 'No ref'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPayment && (
                  <div className="rounded-xl border bg-white p-6 print:shadow-none print:border-0 print:p-0">
                    <div className="flex items-start justify-between gap-3 border-b pb-4">
                      <div>
                        <div className="text-xl font-bold">{selectedSchool.name}</div>
                        <div className="text-sm text-muted-foreground">School Payment Receipt</div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Receipt # {selectedPayment.reference_number || selectedPayment.id.slice(0, 8).toUpperCase()}</div>
                        <div>Date: {new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
                      <div><span className="font-semibold">Student:</span> {students[selectedPayment.student_id]?.name || 'N/A'}</div>
                      <div><span className="font-semibold">Student ID:</span> {students[selectedPayment.student_id]?.id.slice(0, 8).toUpperCase() || 'N/A'}</div>
                      <div><span className="font-semibold">Class:</span> {students[selectedPayment.student_id]?.class_level || 'N/A'}</div>
                      <div><span className="font-semibold">Academic Year:</span> {selectedPayment.academic_year}</div>
                      <div><span className="font-semibold">Term:</span> {selectedPayment.term}</div>
                      <div><span className="font-semibold">Payment Method:</span> {selectedPayment.payment_method}</div>
                      <div><span className="font-semibold">Amount Paid:</span> {formatCurrency(Number(selectedPayment.amount || 0))}</div>
                      <div><span className="font-semibold">Reference:</span> {selectedPayment.reference_number || '—'}</div>
                      <div className="sm:col-span-2"><span className="font-semibold">Received By:</span> {selectedPayment.received_by || 'Administrator'}</div>
                    </div>

                    <div className="mt-6 border-t pt-4 text-sm">
                      <div className="flex items-center justify-between"><span>Previous balance</span><strong>{formatCurrency(0)}</strong></div>
                      <div className="flex items-center justify-between"><span>Payment made</span><strong>{formatCurrency(Number(selectedPayment.amount || 0))}</strong></div>
                      <div className="flex items-center justify-between"><span>New balance</span><strong>{formatCurrency(0)}</strong></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
