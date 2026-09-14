import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/use-toast';
import { formatGHS, toNumber } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Ban, Search, Printer, AlertTriangle } from 'lucide-react';

interface VoidedRow {
  payment_id: string;
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

export default function VoidedPayments() {
  useDocumentTitle('Voided Payments');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user, loading: authLoading } = useSchool();

  const [rows, setRows] = useState<VoidedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await (supabase as any)
        .from('voided_payments_detailed_report')
        .select('*')
        .order('voided_at', { ascending: false });
      if (error) {
        setError(error.message);
        toast({ title: 'Could not load voided payments', description: error.message, variant: 'destructive' });
      } else {
        setRows(data || []);
      }
      setLoading(false);
    })();
  }, [authLoading, user, isAdmin]);

  const filtered = useMemo(() => rows.filter(r =>
    search.trim() === '' ||
    (r.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.receipt_number || '').toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  const total = filtered.reduce((t, r) => t + toNumber(r.amount), 0);

  if (!authLoading && !isAdmin) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <Ban className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Financial information is restricted</h1>
          <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/finance">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Financial Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ban className="h-5 w-5 text-rose-600" /> Voided Payments
            </CardTitle>
            <CardDescription>
              {filtered.length} voided transaction{filtered.length === 1 ? '' : 's'} totalling{' '}
              <span className="font-semibold text-foreground">{formatGHS(total)}</span>. Records are never deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}
            <div className="relative max-w-sm print:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search student or receipt number" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Voided By</TableHead>
                    <TableHead>Voided Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={11} className="py-8"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                        <Ban className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No voided payments.
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={`${r.payment_type}-${r.payment_id}`}>
                      <TableCell className="font-mono text-xs">{r.receipt_number || '—'}</TableCell>
                      <TableCell className="font-medium">{r.student_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatGHS(r.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={r.payment_type === 'feeding' ? 'secondary' : 'default'}>
                          {r.payment_type === 'feeding' ? 'Feeding' : 'School Fees'}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.payment_method}</TableCell>
                      <TableCell>{r.payment_date}</TableCell>
                      <TableCell>{r.received_by || '—'}</TableCell>
                      <TableCell>{r.voided_by || '—'}</TableCell>
                      <TableCell>{r.voided_at ? new Date(r.voided_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap">{r.void_reason || '—'}</TableCell>
                      <TableCell><Badge variant="destructive">{r.status}</Badge></TableCell>
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
