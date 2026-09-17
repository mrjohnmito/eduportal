import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function ArrearsReport() {
  const { selectedSchool } = useSelectedSchool();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedSchool) return;

    const load = async () => {
      const { data } = await (supabase as any).from('student_arrears_report').select('*').limit(200);
      const reportRows = Array.isArray(data) ? data : [];

      setRows(reportRows.map((row: any) => ({
        studentId: readText(row, ['student_id', 'id']),
        studentName: readText(row, ['student_name', 'student', 'name']),
        classLevel: readText(row, ['class_level', 'class', 'grade']),
        schoolFeesDue: readNumber(row, ['school_fees_due', 'school_fee_due', 'fees_due', 'due_school_fees']),
        feedingFeesDue: readNumber(row, ['feeding_fees_due', 'feeding_fee_due', 'daily_feeding_due', 'due_feeding_fees']),
        totalOutstanding: readNumber(row, ['total_outstanding', 'outstanding_balance', 'total_due', 'balance_due']),
        status: readText(row, ['status', 'payment_status']) || (readNumber(row, ['total_outstanding', 'outstanding_balance', 'total_due']) > 0 ? 'UNPAID' : 'PAID'),
      })).filter((row) => Number(row.totalOutstanding || 0) > 0));
    };

    load();
  }, [selectedSchool?.id]);

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Reports</p>
          <h1 className="text-3xl font-bold">Arrears</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Students with outstanding balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>School fees due</TableHead>
                  <TableHead>Feeding fees due</TableHead>
                  <TableHead>Total outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No arrears found.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>{row.studentId}</TableCell>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell>{row.classLevel}</TableCell>
                      <TableCell>{formatCurrency(row.schoolFeesDue)}</TableCell>
                      <TableCell>{formatCurrency(row.feedingFeesDue)}</TableCell>
                      <TableCell>{formatCurrency(row.totalOutstanding)}</TableCell>
                      <TableCell>{row.status}</TableCell>
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
