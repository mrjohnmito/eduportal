import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value: number) => `GH₵${Number(value || 0).toFixed(2)}`;

const readNumber = (row: any, keys: string[]) => {
  if (!row) return 0;

  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? null;
    if (value !== null && value !== undefined && value !== '') return Number(value || 0);
  }

  return 0;
};

const readText = (row: any, keys: string[]) => {
  if (!row) return '—';

  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? null;
    if (value !== null && value !== undefined && value !== '') return String(value);
  }

  return '—';
};

const callWithFallback = async (funcName: string, payloadCandidates: Record<string, any>[]) => {
  let lastError: any = null;

  for (const payload of payloadCandidates) {
    try {
      const { data, error } = await (supabase as any).rpc(funcName, payload);
      if (!error) return { data, error: null };
      lastError = error;
    } catch (error) {
      lastError = error;
    }
  }

  return { data: null, error: lastError };
};

export default function StudentFees() {
  const { selectedSchool } = useSelectedSchool();
  const [students, setStudents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [year, setYear] = useState('2026/2027');
  const [term, setTerm] = useState('1st Term');
  const [paymentForm, setPaymentForm] = useState({
    amount: '0',
    payment_method: 'Cash',
    reference_number: '',
    received_by: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(true);

  const selectedStudent = useMemo(() => students.find((student) => student.id === selectedStudentId) || null, [students, selectedStudentId]);

  const loadData = async () => {
    if (!selectedSchool) return;

    const { data: studentsRes, error: studentsError } = await (supabase as any).from('students').select('*').eq('school_id', selectedSchool.id).order('name');
    const { data: statementsRes, error: statementsError } = await (supabase as any).from('student_financial_statement').select('*').eq('school_id', selectedSchool.id);

    if (studentsError) console.error('Failed to load students', studentsError);
    if (statementsError) console.error('Failed to load financial statement', statementsError);

    const studentRows = studentsRes || [];
    const statementRows = statementsRes || [];

    setStudents(studentRows);
    setAccounts(statementRows);
    if (studentRows.length) setSelectedStudentId(studentRows[0].id);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedSchool?.id]);

  const currentAccount = accounts.find((account) => {
    const sameStudent = account.student_id === selectedStudentId || account.student === selectedStudentId || account.student_name === selectedStudent?.name;
    const sameYear = account.academic_year === year || account.year === year;
    const sameTerm = account.term === term;
    return sameStudent && sameYear && sameTerm;
  }) || null;

  const handlePayment = async () => {
    if (!selectedSchool || !currentAccount) return;
    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0) return;

    const studentId = currentAccount.student_id || selectedStudentId;
    const reference = paymentForm.reference_number || `REF-${Date.now()}`;
    const payloadCandidates = [
      {
        school_id: selectedSchool.id,
        student_id: studentId,
        amount,
        payment_method: paymentForm.payment_method,
        reference_number: reference,
        received_by: paymentForm.received_by || 'Administrator',
        remarks: paymentForm.remarks || 'School fee payment',
        academic_year: currentAccount.academic_year || year,
        term: currentAccount.term || term,
      },
      {
        p_school_id: selectedSchool.id,
        p_student_id: studentId,
        p_amount: amount,
        p_payment_method: paymentForm.payment_method,
        p_reference_number: reference,
        p_received_by: paymentForm.received_by || 'Administrator',
        p_remarks: paymentForm.remarks || 'School fee payment',
        p_academic_year: currentAccount.academic_year || year,
        p_term: currentAccount.term || term,
      },
    ];

    const { error } = await callWithFallback('record_school_fee_payment', payloadCandidates);
    if (error) {
      console.error('Payment insert failed:', error);
      return;
    }

    setPaymentForm({ amount: '0', payment_method: 'Cash', reference_number: '', received_by: '', remarks: '' });
    await loadData();
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Student finance</p>
          <h1 className="text-3xl font-bold">Student Fees</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select student and term</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Term">1st Term</SelectItem>
                    <SelectItem value="2nd Term">2nd Term</SelectItem>
                    <SelectItem value="3rd Term">3rd Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded border p-4">
              <div>
                <div className="font-semibold">{selectedStudent?.name || 'No student selected'}</div>
                <div className="text-sm text-muted-foreground">{selectedStudent?.class_level || '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student fee account</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading student fees...</p>
            ) : !currentAccount ? (
              <p className="text-sm text-muted-foreground">No statement exists for this student and period yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div><div className="text-sm text-muted-foreground">Total charged</div><div className="text-xl font-bold">{formatCurrency(readNumber(currentAccount, ['total_charged', 'charged_amount', 'school_fees_charged']))}</div></div>
                  <div><div className="text-sm text-muted-foreground">Discount</div><div className="text-xl font-bold">{formatCurrency(readNumber(currentAccount, ['discount_amount', 'discount', 'fee_discount']))}</div></div>
                  <div><div className="text-sm text-muted-foreground">Total paid</div><div className="text-xl font-bold">{formatCurrency(readNumber(currentAccount, ['total_paid', 'paid_amount', 'school_fees_paid']))}</div></div>
                  <div><div className="text-sm text-muted-foreground">Outstanding</div><div className="text-xl font-bold">{formatCurrency(readNumber(currentAccount, ['outstanding_balance', 'balance', 'balance_due', 'amount_outstanding']))}</div></div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount paid</Label>
                    <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment method</Label>
                    <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Received by</Label>
                    <Input value={paymentForm.received_by} onChange={(e) => setPaymentForm({ ...paymentForm, received_by: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Remarks</Label>
                    <Input value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} />
                  </div>
                </div>

                <Button onClick={handlePayment}>Record payment</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee statements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Charged</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-5">No fee accounts yet.</TableCell></TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={`${readText(account, ['student_name', 'student', 'name'])}-${readText(account, ['academic_year', 'year'])}-${readText(account, ['term'])}`}>
                      <TableCell>{readText(account, ['student_name', 'student', 'name'])}</TableCell>
                      <TableCell>{readText(account, ['academic_year', 'year'])}</TableCell>
                      <TableCell>{readText(account, ['term'])}</TableCell>
                      <TableCell>{formatCurrency(readNumber(account, ['total_charged', 'charged_amount', 'school_fees_charged']))}</TableCell>
                      <TableCell>{formatCurrency(readNumber(account, ['total_paid', 'paid_amount', 'school_fees_paid']))}</TableCell>
                      <TableCell>{formatCurrency(readNumber(account, ['outstanding_balance', 'balance', 'balance_due', 'amount_outstanding']))}</TableCell>
                      <TableCell>{readText(account, ['payment_status', 'status'])}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
