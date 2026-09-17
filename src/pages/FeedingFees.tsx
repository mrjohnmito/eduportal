import { useEffect, useState } from 'react';
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

export default function FeedingFees() {
  const { selectedSchool } = useSelectedSchool();
  const [students, setStudents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [term, setTerm] = useState('1st Term');
  const [dailyRate, setDailyRate] = useState('10');
  const [feedingDays, setFeedingDays] = useState('60');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      const [studentsRes, accountsRes] = await Promise.all([
        (supabase as any).from('students').select('*').eq('school_id', selectedSchool.id).order('name'),
        (supabase as any).from('student_financial_statement').select('*').eq('school_id', selectedSchool.id),
      ]);
      setStudents(studentsRes.data || []);
      setAccounts(accountsRes.data || []);
      setSelectedClass((studentsRes.data || [])[0]?.class_level || '');
      setStudentId((studentsRes.data || [])[0]?.id || '');
      setLoading(false);
    };

    load();
  }, [selectedSchool?.id]);

  const recordFeedingPayment = async () => {
    if (!selectedSchool || !studentId) return;

    const payloadCandidates = [
      {
        school_id: selectedSchool.id,
        student_id: studentId,
        amount: Number(dailyRate || 0) * Number(feedingDays || 0),
        payment_method: 'Cash',
        reference_number: `FEED-${Date.now()}`,
        academic_year: academicYear,
        term,
        remarks: `Feeding fee payment for ${selectedClass}`,
      },
      {
        p_school_id: selectedSchool.id,
        p_student_id: studentId,
        p_amount: Number(dailyRate || 0) * Number(feedingDays || 0),
        p_payment_method: 'Cash',
        p_reference_number: `FEED-${Date.now()}`,
        p_academic_year: academicYear,
        p_term: term,
        p_remarks: `Feeding fee payment for ${selectedClass}`,
      },
    ];

    const { error } = await callWithFallback('record_feeding_fee_payment', payloadCandidates);
    if (error) {
      console.error('Recording feeding payment failed:', error);
      return;
    }

    const refreshed = await (supabase as any).from('student_financial_statement').select('*').eq('school_id', selectedSchool.id);
    setAccounts(refreshed.data || []);
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Daily feeding</p>
          <h1 className="text-3xl font-bold">Feeding Fees</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure feeding rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
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
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set(students.map((student) => student.class_level))].map((className) => (
                      <SelectItem key={className} value={className}>{className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily rate</Label>
                <Input type="number" step="0.01" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Feeding days</Label>
                <Input type="number" step="1" value={feedingDays} onChange={(e) => setFeedingDays(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Expected amount: {formatCurrency(Number(dailyRate || 0) * Number(feedingDays || 0))}</div>
              <Button onClick={recordFeedingPayment}>Record feeding payment</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student feeding accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={recordFeedingPayment}>Record payment</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Daily rate</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Charged</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No feeding accounts yet.</TableCell></TableRow>
                ) : (
                  accounts.map((account) => {
                    const student = students.find((item) => item.id === account.student_id);
                    return (
                      <TableRow key={account.id}>
                        <TableCell>{student?.name || readText(account, ['student_name', 'student'])}</TableCell>
                        <TableCell>{readText(account, ['academic_year', 'year'])}</TableCell>
                        <TableCell>{readText(account, ['term'])}</TableCell>
                        <TableCell>{formatCurrency(readNumber(account, ['daily_rate', 'feeding_daily_rate']))}</TableCell>
                        <TableCell>{readNumber(account, ['feeding_days', 'days'])}</TableCell>
                        <TableCell>{formatCurrency(readNumber(account, ['total_charged', 'feeding_charged', 'feeding_amount_charged']))}</TableCell>
                        <TableCell>{formatCurrency(readNumber(account, ['total_paid', 'feeding_paid', 'feeding_amount_paid']))}</TableCell>
                        <TableCell>{formatCurrency(readNumber(account, ['outstanding_balance', 'feeding_balance', 'amount_outstanding']))}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
