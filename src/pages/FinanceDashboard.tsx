import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Banknote, BookOpen, CircleDollarSign, ReceiptText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const formatCurrency = (value: number) => `GH₵${Number(value || 0).toFixed(2)}`;

const readNumber = (row: any, keys: string[]) => {
  if (!row) return 0;

  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()] ?? null;
    if (value !== null && value !== undefined && value !== '') {
      return Number(value || 0);
    }
  }

  return 0;
};

export default function FinanceDashboard() {
  const { selectedSchool } = useSelectedSchool();
  const [schoolTotals, setSchoolTotals] = useState({ expected: 0, collected: 0, outstanding: 0 });
  const [feedingTotals, setFeedingTotals] = useState({ expected: 0, collected: 0, outstanding: 0 });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSchool) return;

    const loadData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: dashboardRows, error: dashboardError } = await (supabase as any)
          .from('financial_dashboard')
          .select('*')
          .eq('school_id', selectedSchool.id)
          .limit(20);
        if (dashboardError) throw dashboardError;

        const rows = Array.isArray(dashboardRows) ? dashboardRows : [];
        const summary = rows[0] ?? {};

        const schoolExpected = readNumber(summary, ['school_fees_expected', 'expected_school_fees', 'total_school_fees_expected', 'fees_expected']);
        const schoolCollected = readNumber(summary, ['school_fees_collected', 'collected_school_fees', 'total_school_fees_collected', 'fees_collected']);
        const schoolOutstanding = readNumber(summary, ['school_fees_outstanding', 'school_fee_outstanding', 'outstanding_school_fees', 'total_school_fees_outstanding', 'school_balance']);
        const feedingExpected = readNumber(summary, ['feeding_fees_expected', 'expected_feeding_fees', 'total_feeding_fees_expected', 'feeding_expected']);
        const feedingCollected = readNumber(summary, ['feeding_fees_collected', 'collected_feeding_fees', 'total_feeding_fees_collected', 'feeding_collected']);
        const feedingOutstanding = readNumber(summary, ['feeding_fees_outstanding', 'feeding_fee_outstanding', 'outstanding_feeding_fees', 'total_feeding_fees_outstanding']);

        setSchoolTotals({
          expected: schoolExpected,
          collected: schoolCollected,
          outstanding: schoolOutstanding || Math.max(0, schoolExpected - schoolCollected),
        });
        setFeedingTotals({
          expected: feedingExpected,
          collected: feedingCollected,
          outstanding: feedingOutstanding || Math.max(0, feedingExpected - feedingCollected),
        });

        const { data: statementRows, error: statementError } = await (supabase as any)
          .from('student_financial_statement')
          .select('*')
          .eq('school_id', selectedSchool.id)
          .limit(25);
        if (statementError) throw statementError;

        const accountRows = Array.isArray(statementRows) ? statementRows : [];
        setAccounts(accountRows.map((account: any) => ({
          studentName: account.student_name || account.student || account.name || 'Unknown student',
          academicYear: account.academic_year || account.year || '—',
          term: account.term || '—',
          charged: readNumber(account, ['total_charged', 'school_fees_charged', 'charged_amount', 'amount_charged']),
          paid: readNumber(account, ['total_paid', 'school_fees_paid', 'paid_amount', 'amount_paid']),
          balance: readNumber(account, ['outstanding_balance', 'balance', 'remaining_balance', 'amount_outstanding']),
          status: account.payment_status || account.status || '—',
        })));
      } catch (error) {
        console.error('Finance dashboard load failed:', error);
        setLoadError(error instanceof Error ? error.message : 'The financial backend could not be loaded.');
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedSchool?.id]);

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Finance</p>
            <h1 className="text-3xl font-bold">Fees Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/fees/structure">Fee Structure</Link>
            </Button>
            <Button asChild>
              <Link to="/fees/students">Student Fees</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">School Fees Expected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CircleDollarSign className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{loadError ? '—' : formatCurrency(schoolTotals.expected)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">School Fees Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Banknote className="h-8 w-8 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{loadError ? '—' : formatCurrency(schoolTotals.collected)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Feeding Fees Expected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-violet-600" />
                <div>
                  <div className="text-2xl font-bold">{loadError ? '—' : formatCurrency(feedingTotals.expected)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <ReceiptText className="h-8 w-8 text-amber-600" />
                <div>
                  <div className="text-2xl font-bold text-amber-600">{loadError ? '—' : formatCurrency(schoolTotals.outstanding + feedingTotals.outstanding)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loadError && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive">
              Financial data is unavailable: {loadError}. No totals are being displayed as live data.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>School Fees Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Expected</span><strong>{loadError ? '—' : formatCurrency(schoolTotals.expected)}</strong></div>
              <div className="flex justify-between"><span>Collected</span><strong>{loadError ? '—' : formatCurrency(schoolTotals.collected)}</strong></div>
              <div className="flex justify-between"><span>Outstanding</span><strong>{loadError ? '—' : formatCurrency(schoolTotals.outstanding)}</strong></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feeding Fees Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Expected</span><strong>{loadError ? '—' : formatCurrency(feedingTotals.expected)}</strong></div>
              <div className="flex justify-between"><span>Collected</span><strong>{loadError ? '—' : formatCurrency(feedingTotals.collected)}</strong></div>
              <div className="flex justify-between"><span>Outstanding</span><strong>{loadError ? '—' : formatCurrency(feedingTotals.outstanding)}</strong></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Account Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading financial data...</p>
            ) : loadError ? (
              <p className="text-sm text-muted-foreground">The student statement could not be loaded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Charged</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No fee accounts have been created yet.</TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={`${account.studentName}-${account.academicYear}-${account.term}`}>
                        <TableCell>{account.studentName}</TableCell>
                        <TableCell>{account.academicYear}</TableCell>
                        <TableCell>{account.term}</TableCell>
                        <TableCell>{formatCurrency(account.charged)}</TableCell>
                        <TableCell>{formatCurrency(account.paid)}</TableCell>
                        <TableCell>{formatCurrency(account.balance)}</TableCell>
                        <TableCell>{account.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild variant="secondary">
            <Link to="/fees/feeding" className="inline-flex items-center gap-2">
              Feeding fees <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
