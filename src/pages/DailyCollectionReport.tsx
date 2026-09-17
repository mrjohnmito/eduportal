import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function DailyCollectionReport() {
  const { selectedSchool } = useSelectedSchool();
  const [payments, setPayments] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('all');
  const [methodSummary, setMethodSummary] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      const [{ data: dailyData }, { data: methodData }] = await Promise.all([
        (supabase as any).from('daily_collection_report').select('*').limit(200),
        (supabase as any).from('payment_method_report').select('*').limit(200),
      ]);

      setPayments(Array.isArray(dailyData) ? dailyData : []);
      setMethodSummary(Array.isArray(methodData) ? methodData : []);
    };
    load();
  }, [selectedSchool?.id]);

  const filtered = payments.filter((item) => {
    const date = readText(item, ['payment_date', 'date', 'collected_at']).slice(0, 10);
    const matchesMethod = method === 'all' || readText(item, ['payment_method', 'method']).toLowerCase() === method.toLowerCase();
    return matchesMethod && date >= fromDate && date <= toDate;
  });

  const totals = filtered.reduce((acc, item) => {
    const amount = readNumber(item, ['amount', 'total_amount', 'paid_amount', 'collection_amount']);
    acc.total += amount;
    const methodType = readText(item, ['payment_method', 'method']);
    if (methodType.toLowerCase().includes('cash')) acc.cash += amount;
    if (methodType.toLowerCase().includes('mobile')) acc.mobileMoney += amount;
    if (methodType.toLowerCase().includes('bank')) acc.bank += amount;
    return acc;
  }, { cash: 0, mobileMoney: 0, bank: 0, total: 0 });

  const totalByMethod = methodSummary.reduce((acc, row) => {
    const methodName = readText(row, ['payment_method', 'method', 'method_name']);
    const amount = readNumber(row, ['total_amount', 'amount', 'total', 'collection_amount']);
    acc[methodName] = amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Reports</p>
          <h1 className="text-3xl font-bold">Daily Collections</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm text-muted-foreground">Date from</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Date to</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Payment method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="rounded-lg border bg-muted p-3 w-full text-sm font-medium">Total: {formatCurrency(totals.total)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">Cash: {formatCurrency(totalByMethod.Cash || totalByMethod.cash || totals.cash)}</div>
            <div className="rounded-lg border p-3">Mobile Money: {formatCurrency(totalByMethod['Mobile Money'] || totalByMethod['mobile money'] || totalByMethod.mobile || totals.mobileMoney)}</div>
            <div className="rounded-lg border p-3">Bank: {formatCurrency(totalByMethod.Bank || totalByMethod.bank || totals.bank)}</div>
            <div className="rounded-lg border p-3">Total collected: {formatCurrency(totals.total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No collections in this date range.</TableCell></TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id || `${readText(item, ['student_name', 'student'])}-${readText(item, ['payment_date', 'date'])}`}>
                      <TableCell>{readText(item, ['student_name', 'student', 'student_id'])}</TableCell>
                      <TableCell>{readText(item, ['payment_date', 'date', 'collected_at'])}</TableCell>
                      <TableCell>{readText(item, ['payment_method', 'method'])}</TableCell>
                      <TableCell>{formatCurrency(readNumber(item, ['amount', 'total_amount', 'paid_amount', 'collection_amount']))}</TableCell>
                      <TableCell>{readText(item, ['reference_number', 'reference', 'receipt_number'])}</TableCell>
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
