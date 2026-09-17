import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatCurrency = (value: number) => `GH₵${Number(value || 0).toFixed(2)}`;

export default function ClassFeeReport() {
  const { selectedSchool } = useSelectedSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeAccounts, setFeeAccounts] = useState<any[]>([]);
  const [feedingAccounts, setFeedingAccounts] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026/2027');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');

  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      const [classesRes, studentsRes, feeAccountsRes, feedingAccountsRes] = await Promise.all([
        (supabase as any).from('classes').select('*').eq('school_id', selectedSchool.id).order('name'),
        (supabase as any).from('students').select('*').eq('school_id', selectedSchool.id).order('name'),
        (supabase as any).from('student_fee_accounts').select('*').eq('school_id', selectedSchool.id),
        (supabase as any).from('student_feeding_accounts').select('*').eq('school_id', selectedSchool.id),
      ]);

      setClasses(classesRes.data || []);
      setStudents(studentsRes.data || []);
      setFeeAccounts(feeAccountsRes.data || []);
      setFeedingAccounts(feedingAccountsRes.data || []);
      if ((classesRes.data || []).length) setSelectedClass((classesRes.data || [])[0].name);
    };
    load();
  }, [selectedSchool?.id]);

  const rows = students.filter((student) => student.class_level === selectedClass || student.classLevel === selectedClass).map((student) => {
    const fee = feeAccounts.find((account) => account.student_id === student.id && account.academic_year === selectedYear && account.term === selectedTerm) || { total_charged: 0, total_paid: 0, outstanding_balance: 0, payment_status: 'UNPAID' };
    const feeding = feedingAccounts.find((account) => account.student_id === student.id && account.academic_year === selectedYear && account.term === selectedTerm) || { total_paid: 0, outstanding_balance: 0 };
    const totalOutstanding = Number(fee.outstanding_balance || 0) + Number(feeding.outstanding_balance || 0);
    return {
      studentName: student.name,
      schoolPaid: Number(fee.total_paid || 0),
      schoolBalance: Number(fee.outstanding_balance || 0),
      feedingPaid: Number(feeding.total_paid || 0),
      feedingBalance: Number(feeding.outstanding_balance || 0),
      totalOutstanding,
      status: totalOutstanding > 0 ? 'UNPAID' : 'PAID',
    };
  });

  const totals = rows.reduce((acc, row) => {
    acc.schoolPaid += row.schoolPaid;
    acc.schoolBalance += row.schoolBalance;
    acc.feedingPaid += row.feedingPaid;
    acc.feedingBalance += row.feedingBalance;
    acc.totalOutstanding += row.totalOutstanding;
    return acc;
  }, { schoolPaid: 0, schoolBalance: 0, feedingPaid: 0, feedingBalance: 0, totalOutstanding: 0 });

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Reports</p>
          <h1 className="text-3xl font-bold">Class Fees Report</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select class</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026/2027">2026/2027</SelectItem>
                <SelectItem value="2025/2026">2025/2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1st Term">1st Term</SelectItem>
                <SelectItem value="2nd Term">2nd Term</SelectItem>
                <SelectItem value="3rd Term">3rd Term</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>School fees Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Feeding fees Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Total outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No student data for this class.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={`${row.studentName}-${index}`}>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell>{formatCurrency(row.schoolPaid)}</TableCell>
                      <TableCell>{formatCurrency(row.schoolBalance)}</TableCell>
                      <TableCell>{formatCurrency(row.feedingPaid)}</TableCell>
                      <TableCell>{formatCurrency(row.feedingBalance)}</TableCell>
                      <TableCell>{formatCurrency(row.totalOutstanding)}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{formatCurrency(totals.schoolPaid)}</TableCell>
                  <TableCell>{formatCurrency(totals.schoolBalance)}</TableCell>
                  <TableCell>{formatCurrency(totals.feedingPaid)}</TableCell>
                  <TableCell>{formatCurrency(totals.feedingBalance)}</TableCell>
                  <TableCell>{formatCurrency(totals.totalOutstanding)}</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
