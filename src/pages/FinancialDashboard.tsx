import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/finance/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/use-toast';
import { formatGHS, toNumber, todayISO } from '@/lib/currency';
import {
  loadDashboard as loadDashboardData,
  loadArrears as loadArrearsData,
  loadCollections as loadCollectionsData,
} from '@/lib/financeData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Wallet, Banknote, Utensils, Coins, AlertTriangle, Users,
  CalendarDays, Ban, RefreshCw, Search, Printer, ReceiptText,
} from 'lucide-react';

const ALL = '__all__';

interface DashboardRow {
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

interface CollectionRow {
  payment_id: string;
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

interface MethodRow {
  payment_date: string;
  payment_type: string;
  payment_method: string;
  payment_count: number;
  total_amount: number;
  academic_year: string;
  term: string;
}

interface ArrearsRow {
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

const METHODS = ['Cash', 'Mobile Money', 'Bank', 'Other'];

export default function FinancialDashboard() {
  useDocumentTitle('Financial Dashboard');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user, loading: authLoading } = useSchool();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [arrears, setArrears] = useState<ArrearsRow[]>([]);

  const [year, setYear] = useState<string>(ALL);
  const [term, setTerm] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState<string>(todayISO());
  const [dateTo, setDateTo] = useState<string>(todayISO());
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([loadDashboardData(), loadArrearsData()]);
      setRows(d);
      setArrears(a);
    } catch (e: any) {
      setError(e?.message || 'Could not load financial data.');
      toast({ title: 'Could not load financial data', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const { collections: c, methods: m } = await loadCollectionsData(
        dateFrom,
        dateTo,
        year !== ALL ? year : undefined,
        term !== ALL ? term : undefined,
      );
      setCollections(c);
      setMethods(m);
    } catch (e: any) {
      toast({ title: 'Could not load collections', description: e?.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    if (!isAdmin) return;
    load();
  }, [authLoading, user, isAdmin]);

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;
    loadCollections();
  }, [authLoading, user, isAdmin, dateFrom, dateTo, year, term]);

  const years = useMemo(
    () => Array.from(new Set(rows.map(r => r.academic_year))).sort().reverse(), [rows]);
  const terms = useMemo(
    () => Array.from(new Set(rows.map(r => r.term))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r =>
    (year === ALL || r.academic_year === year) && (term === ALL || r.term === term)), [rows, year, term]);

  const totals = useMemo(() => {
    const sum = (k: keyof DashboardRow) => filtered.reduce((t, r) => t + toNumber(r[k]), 0);
    return {
      schoolCharged: sum('total_school_fees_charged'),
      schoolCollected: sum('total_school_fees_collected'),
      feedingCharged: sum('total_feeding_fees_charged'),
      feedingCollected: sum('total_feeding_fees_collected'),
      collected: sum('total_collected'),
      outstanding: sum('total_outstanding'),
      arrearsStudents: sum('students_with_arrears'),
      todayTotal: sum('today_total_collected'),
      todaySchool: sum('today_school_fees_collected'),
      todayFeeding: sum('today_feeding_fees_collected'),
      voidedCount: sum('voided_payment_count'),
      voidedAmount: sum('voided_payment_amount'),
    };
  }, [filtered]);

  const filteredArrears = useMemo(() => arrears.filter(r =>
    (year === ALL || r.academic_year === year) &&
    (term === ALL || r.term === term) &&
    (search.trim() === '' || (r.student_name || '').toLowerCase().includes(search.trim().toLowerCase()))
  ), [arrears, year, term, search]);

  const methodTotals = useMemo(() => {
    const grid: Record<string, { school: number; feeding: number; total: number; count: number }> = {};
    METHODS.forEach(m => { grid[m] = { school: 0, feeding: 0, total: 0, count: 0 }; });
    methods.forEach(m => {
      const key = METHODS.includes(m.payment_method) ? m.payment_method : 'Other';
      const amt = toNumber(m.total_amount);
      grid[key].total += amt;
      grid[key].count += toNumber(m.payment_count);
      if (m.payment_type === 'feeding') grid[key].feeding += amt; else grid[key].school += amt;
    });
    return grid;
  }, [methods]);

  const rangeTotal = collections.reduce((t, c) => t + toNumber(c.amount), 0);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <Ban className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Financial information is restricted</h1>
          <p className="text-muted-foreground text-sm">
            Only school administrators and accountants can open the financial dashboard.
          </p>
          <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 space-y-6 print:py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { load(); loadCollections(); }}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Link to="/finance/voided">
              <Button size="sm" variant="outline" className="gap-2">
                <Ban className="h-4 w-4" /> Voided Payments
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
              <p className="text-primary-foreground/80 text-sm">
                School fees and feeding fees overview • all amounts in Ghana Cedi
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Academic Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All years</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All terms</SelectItem>
                  {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Collections From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Collections To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground space-y-2">
              <Coins className="h-10 w-10 mx-auto opacity-30" />
              <p className="font-medium text-foreground">No financial records yet</p>
              <p className="text-sm">Once fee structures are assigned to students, totals will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="School Fees Charged" value={formatGHS(totals.schoolCharged)} icon={Banknote} tone="primary" />
            <StatCard label="School Fees Collected" value={formatGHS(totals.schoolCollected)} icon={Coins} tone="emerald" />
            <StatCard label="Feeding Fees Charged" value={formatGHS(totals.feedingCharged)} icon={Utensils} tone="primary" />
            <StatCard label="Feeding Fees Collected" value={formatGHS(totals.feedingCollected)} icon={Utensils} tone="emerald" />
            <StatCard label="Total Collected" value={formatGHS(totals.collected)} icon={Wallet} tone="emerald" />
            <StatCard label="Total Outstanding" value={formatGHS(totals.outstanding)} icon={AlertTriangle} tone="rose" />
            <StatCard label="Students With Arrears" value={String(totals.arrearsStudents)} icon={Users} tone="amber" />
            <StatCard label="Today's Collection" value={formatGHS(totals.todayTotal)} icon={CalendarDays} tone="primary"
              hint={`Fees ${formatGHS(totals.todaySchool)} • Feeding ${formatGHS(totals.todayFeeding)}`} />
          </div>
        )}

        {/* Voided summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Voided Payments</CardTitle>
              <CardDescription>Reversed transactions are kept permanently for audit.</CardDescription>
            </div>
            <Link to="/finance/voided" className="print:hidden">
              <Button size="sm" variant="outline">View details</Button>
            </Link>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Voided Payments" value={String(totals.voidedCount)} icon={Ban} tone="slate" />
            <StatCard label="Voided Amount" value={formatGHS(totals.voidedAmount)} icon={Ban} tone="rose" />
          </CardContent>
        </Card>

        {/* Collections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collections {dateFrom === dateTo ? `on ${dateFrom}` : `from ${dateFrom} to ${dateTo}`}</CardTitle>
            <CardDescription>Total received in the selected range: <span className="font-semibold text-foreground">{formatGHS(rangeTotal)}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {METHODS.map(m => (
                <div key={m} className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{formatGHS(methodTotals[m].total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fees {formatGHS(methodTotals[m].school)} • Feeding {formatGHS(methodTotals[m].feeding)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No payments recorded in this date range.
                      </TableCell>
                    </TableRow>
                  ) : collections.map(c => (
                    <TableRow key={`${c.payment_type}-${c.payment_id}`}>
                      <TableCell className="font-mono text-xs">{c.receipt_number || '—'}</TableCell>
                      <TableCell className="font-medium">{c.student_name}</TableCell>
                      <TableCell>{c.class_level || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.payment_type === 'feeding' ? 'secondary' : 'default'}>
                          {c.payment_type === 'feeding' ? 'Feeding' : 'School Fees'}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.payment_method}</TableCell>
                      <TableCell>{c.payment_date}</TableCell>
                      <TableCell>{c.received_by || '—'}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatGHS(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Arrears */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Arrears</CardTitle>
            <CardDescription>
              {filteredArrears.length} student{filteredArrears.length === 1 ? '' : 's'} owing{' '}
              <span className="font-semibold text-foreground">
                {formatGHS(filteredArrears.reduce((t, r) => t + toNumber(r.total_outstanding), 0))}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm print:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search student name" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">School Fees Due</TableHead>
                    <TableHead className="text-right">Feeding Due</TableHead>
                    <TableHead className="text-right">Total Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="py-8"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ) : filteredArrears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No outstanding balances for this selection.
                      </TableCell>
                    </TableRow>
                  ) : filteredArrears.map(r => (
                    <TableRow key={`${r.student_id}-${r.academic_year}-${r.term}`}>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell>{r.class_level}</TableCell>
                      <TableCell>{r.academic_year}</TableCell>
                      <TableCell>{r.term}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGHS(r.school_fees_balance)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGHS(r.feeding_fees_balance)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-rose-600">{formatGHS(r.total_outstanding)}</TableCell>
                      <TableCell><Badge variant="outline">{r.school_fees_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
