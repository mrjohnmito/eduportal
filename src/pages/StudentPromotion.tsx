import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ALUMNI_CLASS } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft, GraduationCap, ArrowUpCircle, RotateCcw, Award,
  Users, FileDown, FileSpreadsheet, Printer, Loader2, History,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ClassItem { id: string; name: string; }
interface PromotionRow {
  id: string;
  student_name: string;
  action: string;
  from_academic_year: string;
  from_class: string;
  to_academic_year: string | null;
  to_class: string | null;
  performed_by: string | null;
  performed_at: string;
}

type PromoAction = 'promote' | 'repeat' | 'graduate';

const nextAcademicYear = (year: string): string => {
  if (!year) return '';
  const m = year.match(/(\d{4})\s*\/\s*(\d{4})/);
  if (m) return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
  const single = year.match(/(\d{4})/);
  if (single) return `${Number(single[1]) + 1}`;
  return year;
};

// Students store class_level as a normalized key ("Basic 1" -> "basic1")
const toKey = (name: string) => name.toLowerCase().replace(/\s+/g, '');

const actionLabel: Record<PromoAction, string> = {
  promote: 'Promote', repeat: 'Repeat', graduate: 'Graduate',
};

export default function StudentPromotion() {
  const navigate = useNavigate();
  const { settings, isAdmin, user, loading, students, refreshData } = useSchool();
  const { selectedSchool } = useSelectedSchool();
  useDocumentTitle('Student Promotion');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [destYear, setDestYear] = useState('');
  const [destClass, setDestClass] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [confirm, setConfirm] = useState<PromoAction | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  // Report filters
  const [filterYear, setFilterYear] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  // Route guard: admins only
  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !user) { navigate('/'); return; }
    if (!selectedSchool) navigate('/');
  }, [loading, isAdmin, user, selectedSchool, navigate]);

  // Defaults from settings
  useEffect(() => {
    if (settings.academicYear) {
      setCurrentYear(prev => prev || settings.academicYear);
      setDestYear(prev => prev || nextAcademicYear(settings.academicYear));
    }
  }, [settings.academicYear]);

  const fetchClasses = async () => {
    if (!selectedSchool) return;
    const { data } = await supabase
      .from('classes').select('id, name').eq('school_id', selectedSchool.id).order('name');
    setClasses(data || []);
  };

  const fetchPromotions = async () => {
    if (!selectedSchool) return;
    const { data } = await fetchAllRows<any>(() =>
      supabase
        .from('student_promotions')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('performed_at', { ascending: false })
    );
    setPromotions((data as any) || []);
  };

  useEffect(() => {
    fetchClasses();
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool?.id]);

  const isFinalClass = !!settings.finalClass && currentClass === settings.finalClass;

  const classNameForKey = (key: string) => classes.find(c => toKey(c.name) === key)?.name || key;

  // Students eligible = in the selected current class
  const eligible = useMemo(
    () => students.filter(s => s.classLevel === toKey(currentClass)),
    [students, currentClass],
  );

  // Students already promoted/repeated into the destination year (disabled to prevent duplicates)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = async () => {
      if (!selectedSchool || !destYear) { setDoneIds(new Set()); return; }
      const { data } = await fetchAllRows<any>(() =>
        supabase
          .from('student_promotions')
          .select('student_id, action, to_academic_year')
          .eq('school_id', selectedSchool.id)
          .eq('to_academic_year', destYear)
          .in('action', ['promote', 'repeat'])
          .order('id')
      );
      setDoneIds(new Set((data || []).map((d: any) => d.student_id)));
    };
    load();
  }, [selectedSchool?.id, destYear, promotions.length]);

  const selectableIds = eligible.filter(s => !doneIds.has(s.id)).map(s => s.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const validate = (action: PromoAction, ids: string[]): string | null => {
    if (!currentYear) return 'Select the current academic year.';
    if (!currentClass) return 'Select the current class.';
    if (ids.length === 0) return 'No eligible students selected.';
    if (action === 'graduate') {
      if (!settings.finalClass) return 'Set a Final Year Class in Settings first.';
      if (!isFinalClass) return `Graduation is only allowed for the final year class (${settings.finalClass}).`;
      if (!destYear) return 'Select the destination academic year.';
    } else {
      if (!destYear) return 'Select the destination academic year.';
      if (action === 'promote' && !destClass) return 'Select the destination class.';
      if (action === 'promote' && destClass === currentClass) return 'Destination class must differ from current class.';
    }
    return null;
  };

  const requestAction = (action: PromoAction, scope: 'all' | 'selected') => {
    const ids = scope === 'all' ? selectableIds : Array.from(selected).filter(id => selectableIds.includes(id));
    const err = validate(action, ids);
    if (err) { toast.error(err); return; }
    setConfirmIds(ids);
    setConfirm(action);
  };

  const runAction = async () => {
    if (!confirm || !selectedSchool) return;
    const action = confirm;
    const ids = confirmIds;
    setConfirm(null);
    setProcessing(true);
    setProgress(0);

    const performedBy = user?.email || 'Admin';

    let ok = 0, fail = 0;
    for (let i = 0; i < ids.length; i++) {
      const student = eligible.find(s => s.id === ids[i]);
      if (!student) { fail++; continue; }
      try {
        // Source enrollment record (preserve history)
        const sourceStatus = action === 'promote' ? 'promoted' : action === 'repeat' ? 'repeated' : 'graduated';
        const { error: sourceEnrollmentError } = await supabase.from('student_enrollments').upsert({
          school_id: selectedSchool.id, student_id: student.id,
          academic_year: currentYear, class_level: toKey(currentClass), status: sourceStatus,
        }, { onConflict: 'school_id,student_id,academic_year' });
        if (sourceEnrollmentError) throw sourceEnrollmentError;

        // Destination enrollment + student class update
        let toClass: string | null = null;
        if (action === 'promote') {
          toClass = destClass;
          const { error: destinationEnrollmentError } = await supabase.from('student_enrollments').upsert({
            school_id: selectedSchool.id, student_id: student.id,
            academic_year: destYear, class_level: toKey(destClass), status: 'active',
          }, { onConflict: 'school_id,student_id,academic_year' });
          if (destinationEnrollmentError) throw destinationEnrollmentError;
          const { error: studentUpdateError } = await supabase
            .from('students')
            .update({ class_level: toKey(destClass) })
            .eq('id', student.id)
            .eq('school_id', selectedSchool.id);
          if (studentUpdateError) throw studentUpdateError;
        } else if (action === 'repeat') {
          toClass = currentClass;
          const { error: destinationEnrollmentError } = await supabase.from('student_enrollments').upsert({
            school_id: selectedSchool.id, student_id: student.id,
            academic_year: destYear, class_level: toKey(currentClass), status: 'active',
          }, { onConflict: 'school_id,student_id,academic_year' });
          if (destinationEnrollmentError) throw destinationEnrollmentError;
        } else {
          toClass = ALUMNI_CLASS;
          const { error: studentUpdateError } = await supabase
            .from('students')
            .update({ class_level: ALUMNI_CLASS })
            .eq('id', student.id)
            .eq('school_id', selectedSchool.id);
          if (studentUpdateError) throw studentUpdateError;
        }

        // Audit trail (unique index prevents duplicate promote/repeat per dest year)
        const { error: auditErr } = await supabase.from('student_promotions').insert({
          school_id: selectedSchool.id, student_id: student.id, student_name: student.name,
          action, from_academic_year: currentYear, from_class: currentClass,
          to_academic_year: destYear, to_class: toClass, performed_by: performedBy,
        });
        if (auditErr) throw auditErr;
        ok++;
      } catch (e) {
        console.error('Promotion failed for', student.name, e);
        fail++;
      }
      setProgress(Math.round(((i + 1) / ids.length) * 100));
    }

    setProcessing(false);
    setSelected(new Set());
    await Promise.all([fetchPromotions(), refreshData()]);

    if (ok > 0) toast.success(`${actionLabel[action]}d ${ok} student${ok > 1 ? 's' : ''} successfully.`);
    if (fail > 0) toast.error(`${fail} student${fail > 1 ? 's' : ''} could not be processed (possibly already done).`);
  };

  // ---- Reports ----
  const filteredReport = promotions.filter(p =>
    (filterYear === 'all' || p.from_academic_year === filterYear || p.to_academic_year === filterYear) &&
    (filterClass === 'all' || p.from_class === filterClass || p.to_class === filterClass),
  );

  const reportYears = Array.from(new Set(
    promotions.flatMap(p => [p.from_academic_year, p.to_academic_year]).filter(Boolean) as string[],
  ));

  const buildPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${settings.schoolName || selectedSchool?.name || 'School'} — Promotion Report`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Student', 'Action', 'From', 'To', 'By']],
      body: filteredReport.map(p => [
        new Date(p.performed_at).toLocaleDateString(),
        p.student_name,
        actionLabel[p.action as PromoAction] || p.action,
        `${p.from_class} (${p.from_academic_year})`,
        p.to_class ? `${p.to_class} (${p.to_academic_year})` : '—',
        p.performed_by || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    return doc;
  };

  const exportPdf = () => {
    if (filteredReport.length === 0) { toast.error('No records to export.'); return; }
    buildPdf().save(`promotion-report-${Date.now()}.pdf`);
  };
  const printReport = () => {
    if (filteredReport.length === 0) { toast.error('No records to print.'); return; }
    const url = buildPdf().output('bloburl');
    window.open(url as any, '_blank');
  };
  const exportExcel = () => {
    if (filteredReport.length === 0) { toast.error('No records to export.'); return; }
    const rows = filteredReport.map(p => ({
      Date: new Date(p.performed_at).toLocaleString(),
      Student: p.student_name,
      Action: actionLabel[p.action as PromoAction] || p.action,
      'From Class': p.from_class,
      'From Year': p.from_academic_year,
      'To Class': p.to_class || '',
      'To Year': p.to_academic_year || '',
      'Performed By': p.performed_by || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotions');
    XLSX.writeFile(wb, `promotion-report-${Date.now()}.xlsx`);
  };

  const confirmSummary = () => {
    if (!confirm) return '';
    if (confirm === 'graduate')
      return `Graduate ${confirmIds.length} student(s) from ${currentClass} (${currentYear}). They will be moved to Alumni and hidden from active classes.`;
    if (confirm === 'repeat')
      return `Repeat ${confirmIds.length} student(s) in ${currentClass} for ${destYear}.`;
    return `Promote ${confirmIds.length} student(s) from ${currentClass} (${currentYear}) to ${destClass} (${destYear}).`;
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border bg-card p-6"
        >
          <div className="blob absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="rounded-xl bg-primary p-3 text-primary-foreground">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Student Promotion</h1>
              <p className="text-sm text-muted-foreground">
                Promote, repeat, or graduate students while preserving full academic history.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Selectors */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Promotion Setup</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Current Academic Year</Label>
              <Input value={currentYear} onChange={e => setCurrentYear(e.target.value)} placeholder="2024/2025" />
            </div>
            <div className="space-y-2">
              <Label>Current Class</Label>
              <Select value={currentClass || undefined} onValueChange={(v) => { setCurrentClass(v); setSelected(new Set()); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination Academic Year</Label>
              <Input value={destYear} onChange={e => setDestYear(e.target.value)} placeholder="2025/2026" />
            </div>
            <div className="space-y-2">
              <Label>Destination Class</Label>
              <Select value={destClass || undefined} onValueChange={setDestClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => requestAction('promote', 'all')} disabled={processing} className="gap-2">
            <ArrowUpCircle className="h-4 w-4" /> Promote All
          </Button>
          <Button onClick={() => requestAction('promote', 'selected')} disabled={processing} variant="secondary" className="gap-2">
            <ArrowUpCircle className="h-4 w-4" /> Promote Selected
          </Button>
          <Button onClick={() => requestAction('repeat', 'selected')} disabled={processing} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Repeat Selected
          </Button>
          <Button
            onClick={() => requestAction('graduate', 'selected')}
            disabled={processing || !isFinalClass}
            variant="outline"
            className="gap-2"
            title={!isFinalClass ? `Only available for the final year class${settings.finalClass ? ` (${settings.finalClass})` : ''}` : undefined}
          >
            <Award className="h-4 w-4" /> Graduate Selected
          </Button>
        </div>

        {processing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing… {progress}%
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Eligible students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" /> Eligible Students
              <Badge variant="secondary">{eligible.length}</Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">{selected.size} selected</div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
            ) : !currentClass ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Select a current class to view students.</p>
            ) : eligible.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No students found in {currentClass}.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligible.map(s => {
                      const done = doneIds.has(s.id);
                      return (
                        <TableRow key={s.id} className={done ? 'opacity-60' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(s.id)}
                              disabled={done}
                              onCheckedChange={() => toggleOne(s.id)}
                              aria-label={`Select ${s.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{classNameForKey(s.classLevel)}</TableCell>
                          <TableCell>
                            {done
                              ? <Badge variant="outline">Already promoted for {destYear}</Badge>
                              : <Badge variant="secondary">Eligible</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report */}
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" /> Promotion History
              <Badge variant="secondary">{filteredReport.length}</Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {reportYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={printReport} className="gap-1"><Printer className="h-4 w-4" /> Print</Button>
              <Button size="sm" variant="outline" onClick={exportPdf} className="gap-1"><FileDown className="h-4 w-4" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={exportExcel} className="gap-1"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReport.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No promotion records yet.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReport.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">{new Date(p.performed_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{p.student_name}</TableCell>
                        <TableCell>
                          <Badge variant={p.action === 'graduate' ? 'default' : 'secondary'}>
                            {actionLabel[p.action as PromoAction] || p.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{p.from_class} ({p.from_academic_year})</TableCell>
                        <TableCell className="whitespace-nowrap">{p.to_class ? `${p.to_class} (${p.to_academic_year})` : '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">{p.performed_by || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {confirm ? actionLabel[confirm] : ''}</AlertDialogTitle>
            <AlertDialogDescription>{confirmSummary()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
