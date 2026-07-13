import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { SubjectScore, Student, GRADE_SCALE } from '@/types/school';
import { calculateScores, validateScore } from '@/lib/gradeUtils';
import { CalculatedScore } from '@/types/school';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Save, Users, Download, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScoreRow {
  student: Student;
  score: SubjectScore;
  calculated: CalculatedScore;
  errors: Record<string, boolean>;
}

export default function ScoreEntry() {
  const { classLevel, subject } = useParams<{ classLevel: string; subject: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    getStudentsByClass,
    getScoresByClassAndSubject,
    addScore,
    updateScore,
    refreshData,
    updateStudent,
    deleteStudent,
    isAdmin,
  } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allClasses, setAllClasses] = useState<{ id: string; name: string }[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const decodedSubject = decodeURIComponent(subject || '');

  // Fetch class info filtered by school_id
  useEffect(() => {
    const fetchClass = async () => {
      if (!classLevel || !subject || !selectedSchool) {
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      const foundClass = data.find(c => 
        c.name.toLowerCase().replace(/\s/g, '') === classLevel
      );

      if (!foundClass) {
        navigate('/dashboard');
        return;
      }

      setClassInfo({ id: foundClass.id, name: foundClass.name });
      setAllClasses(data.map(c => ({ id: c.id, name: c.name })));
      setLoading(false);
    };

    fetchClass();
  }, [classLevel, subject, navigate]);

  const students = classLevel ? getStudentsByClass(classLevel) : [];
  const existingScores = classLevel ? getScoresByClassAndSubject(classLevel, decodedSubject) : [];

  // Initialize score rows
  useEffect(() => {
    if (!classLevel) return;
    
    const rows: ScoreRow[] = students.map(student => {
      const existing = existingScores.find(s => s.studentId === student.id);
      const score: SubjectScore = existing || {
        id: '',
        studentId: student.id,
        subject: decodedSubject,
        classLevel: classLevel as any,
        test1: null,
        groupWork: null,
        test2: null,
        project: null,
        examScore: null,
      };
      
      return {
        student,
        score,
        calculated: calculateScores(score),
        errors: {},
      };
    });
    setScoreRows(rows);
  }, [students.length, existingScores.length, classLevel, decodedSubject]);

  const handleScoreChange = useCallback((
    studentId: string,
    field: keyof SubjectScore,
    value: string,
    maxValue: number
  ) => {
    setScoreRows(prev =>
      prev.map(row => {
        if (row.student.id !== studentId) return row;

        const numValue = value === '' ? null : parseFloat(value);
        const hasError = numValue !== null && !validateScore(numValue, maxValue);

        const newScore = {
          ...row.score,
          [field]: numValue,
        };

        return {
          ...row,
          score: newScore,
          calculated: calculateScores(newScore),
          errors: {
            ...row.errors,
            [field]: hasError,
          },
        };
      })
    );
  }, []);

  const hasErrors = useMemo(() => {
    return scoreRows.some(row => Object.values(row.errors).some(Boolean));
  }, [scoreRows]);

  const handleSave = async () => {
    if (isSaving) return;

    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      let saved = 0;

      for (const row of scoreRows) {
        const hasEnteredScore =
          row.score.test1 !== null ||
          row.score.groupWork !== null ||
          row.score.test2 !== null ||
          row.score.project !== null ||
          row.score.examScore !== null;

        if (row.score.id) {
          await updateScore(row.score.id, row.score);
          saved++;
        } else if (hasEnteredScore) {
          await addScore(row.score);
          saved++;
        }
      }

      await refreshData();

      toast({
        title: 'Scores Saved',
        description: `Successfully saved scores for ${saved} student${saved === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Could not save scores. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setScoreRows(prev =>
      prev.map(row => ({
        ...row,
        score: {
          ...row.score,
          test1: null,
          groupWork: null,
          test2: null,
          project: null,
          examScore: null,
        },
        calculated: calculateScores({
          ...row.score,
          test1: null,
          groupWork: null,
          test2: null,
          project: null,
          examScore: null,
        }),
        errors: {},
      }))
    );
  };

  const handlePrintReport = async () => {
    if (!classInfo || scoreRows.length === 0) return;
    
    setIsPrinting(true);
    
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let yPos = margin;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${classInfo.name} - ${decodedSubject} Score Report`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;

      // Table data
      const tableData = scoreRows.map((row, index) => [
        (index + 1).toString(),
        row.student.name.toUpperCase(),
        row.score.test1?.toString() ?? '-',
        row.score.groupWork?.toString() ?? '-',
        row.score.test2?.toString() ?? '-',
        row.score.project?.toString() ?? '-',
        row.calculated.subtotal.toString(),
        row.calculated.caScore.toFixed(1),
        row.score.examScore?.toString() ?? '-',
        row.calculated.examPercent.toFixed(1),
        row.calculated.overallTotal.toFixed(1),
        row.calculated.grade.toString(),
        row.calculated.remark
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[
          'S/N', 'Student Name', 'Test 1 (30)', 'Group (20)', 'Test 2 (30)', 'Project (20)',
          'Subtotal', 'Class Score (50%)', 'Exam (100)', 'Exam Score (50%)', 'Overall', 'Grade', 'Remark'
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 2,
          valign: 'middle',
          halign: 'center',
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { halign: 'left', cellWidth: 40 },
          6: { fillColor: [219, 234, 254] },
          7: { fillColor: [220, 252, 231] },
          9: { fillColor: [255, 237, 213] },
          10: { fillColor: [243, 232, 255], fontStyle: 'bold' },
          11: { fillColor: [254, 249, 195] },
          12: { halign: 'left', cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });

      // Grading scale legend
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 80;
      yPos = finalY + 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Grading Scale:', margin, yPos);
      
      yPos += 5;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      
      const scaleText = GRADE_SCALE.map(g => `${g.min}-${g.max}% = Grade ${g.grade} (${g.remark})`).join('  |  ');
      const lines = doc.splitTextToSize(scaleText, pageWidth - 2 * margin);
      doc.text(lines, margin, yPos);

      // Save
      doc.save(`${classInfo.name}_${decodedSubject}_Scores.pdf`);

      toast({
        title: 'Report Generated',
        description: `Score report for ${decodedSubject} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading || !classInfo || !classLevel) {
    return (
      <MainLayout>
        <div className="container py-8 text-center text-muted-foreground">
          Loading...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-purple-50/30">
        <div className="container py-4">
          {/* Header */}
          <div className="mb-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card rounded-xl px-4 py-3 shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/class/${classLevel}`)}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    {classInfo.name}
                  </h1>
                  <p className="text-xs text-muted-foreground">{decodedSubject}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{students.length} Students</span>
                </div>
                
                <Select>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={handlePrintReport}
                  disabled={isPrinting || scoreRows.length === 0}
                >
                  {isPrinting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {isPrinting ? 'Generating...' : 'Print Report'}
                </Button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mb-4">
            <Button
              size="sm"
              onClick={handleSave}
                disabled={hasErrors || isSaving}
              className="gap-2 bg-green-500 hover:bg-green-600 text-white"
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save All'}
            </Button>
          </div>

          {/* No Students Warning */}
          {students.length === 0 ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
              <p className="text-warning font-medium">
                No students in this class. Add students from the dashboard first.
              </p>
            </div>
          ) : (
            /* Score Entry Table */
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm animate-fade-in">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b border-r border-border px-2 py-2.5 text-left font-medium text-muted-foreground w-10">S/N</th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-left font-medium text-muted-foreground w-12">Photo</th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">Student Name</th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-16">
                      Test 1<br/><span className="text-[10px] font-normal">(30)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-16">
                      Group Work<br/><span className="text-[10px] font-normal">(20)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-16">
                      Test 2<br/><span className="text-[10px] font-normal">(30)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-16">
                      Project<br/><span className="text-[10px] font-normal">(20)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-blue-600 bg-blue-50/50 w-16">
                      Subtotal<br/><span className="text-[10px] font-normal">(100)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-green-600 bg-green-50/50 w-16">
                      Class Score<br/><span className="text-[10px] font-normal">(50%)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-16">
                      Exam<br/><span className="text-[10px] font-normal">(100)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-orange-600 bg-orange-50/50 w-16">
                      Exam Score<br/><span className="text-[10px] font-normal">(50%)</span>
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-purple-600 bg-purple-50/50 w-16">
                      Overall<br/>Total
                    </th>
                    <th className="border-b border-r border-border px-2 py-2.5 text-center font-medium text-yellow-600 bg-yellow-50/50 w-14">
                      Grade
                    </th>
                    <th className="border-b border-border px-2 py-2.5 text-center font-medium text-red-500 bg-red-50/50 w-14">
                      Remark
                    </th>
                    <th className="border-b border-border px-2 py-2.5 text-center font-medium text-muted-foreground w-14">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoreRows.map((row, index) => (
                    <tr key={row.student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="border-b border-r border-border px-2 py-2 text-center text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="border-b border-r border-border px-2 py-2">
                        {row.student.photo ? (
                          <img
                            src={row.student.photo}
                            alt={row.student.name}
                            className="h-7 w-7 rounded object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] text-white font-medium">
                            {row.student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-r border-border px-2 py-2 font-medium text-foreground">
                        {row.student.name.toUpperCase()}
                      </td>
                      {/* Test 1 */}
                      <td className={cn('border-b border-r border-border p-0.5', row.errors.test1 && 'bg-destructive/10')}>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          className="w-full h-7 text-center bg-transparent border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.score.test1 ?? ''}
                          onChange={e => handleScoreChange(row.student.id, 'test1', e.target.value, 30)}
                        />
                      </td>
                      {/* Group Work */}
                      <td className={cn('border-b border-r border-border p-0.5', row.errors.groupWork && 'bg-destructive/10')}>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="w-full h-7 text-center bg-transparent border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.score.groupWork ?? ''}
                          onChange={e => handleScoreChange(row.student.id, 'groupWork', e.target.value, 20)}
                        />
                      </td>
                      {/* Test 2 */}
                      <td className={cn('border-b border-r border-border p-0.5', row.errors.test2 && 'bg-destructive/10')}>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          className="w-full h-7 text-center bg-transparent border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.score.test2 ?? ''}
                          onChange={e => handleScoreChange(row.student.id, 'test2', e.target.value, 30)}
                        />
                      </td>
                      {/* Project */}
                      <td className={cn('border-b border-r border-border p-0.5', row.errors.project && 'bg-destructive/10')}>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="w-full h-7 text-center bg-transparent border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.score.project ?? ''}
                          onChange={e => handleScoreChange(row.student.id, 'project', e.target.value, 20)}
                        />
                      </td>
                      {/* Subtotal */}
                      <td className="border-b border-r border-border px-2 py-2 text-center font-medium text-blue-600 bg-blue-50/30">
                        {row.calculated.subtotal}
                      </td>
                      {/* Class Score (A - 50%) */}
                      <td className="border-b border-r border-border px-2 py-2 text-center font-medium text-green-600 bg-green-50/30">
                        {row.calculated.caScore.toFixed(1)}
                      </td>
                      {/* Exam */}
                      <td className={cn('border-b border-r border-border p-0.5', row.errors.examScore && 'bg-destructive/10')}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full h-7 text-center bg-transparent border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.score.examScore ?? ''}
                          onChange={e => handleScoreChange(row.student.id, 'examScore', e.target.value, 100)}
                        />
                      </td>
                      {/* Exam Score (B - 50%) */}
                      <td className="border-b border-r border-border px-2 py-2 text-center font-medium text-orange-600 bg-orange-50/30">
                        {row.calculated.examPercent.toFixed(1)}
                      </td>
                      {/* Overall Total */}
                      <td className="border-b border-r border-border px-2 py-2 text-center font-bold text-purple-600 bg-purple-50/30">
                        {row.calculated.overallTotal.toFixed(1)}
                      </td>
                      {/* Grade */}
                      <td className="border-b border-r border-border px-2 py-2 text-center font-bold text-yellow-600 bg-yellow-50/30">
                        {row.calculated.grade}
                      </td>
                      {/* Remark */}
                      <td className="border-b border-r border-border px-1 py-2 text-center text-[10px] text-red-500 bg-red-50/30">
                        {row.calculated.remark}
                      </td>
                      {/* Action */}
                      <td className="border-b border-border px-2 py-2 text-center">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <span className="text-muted-foreground">⋮</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 p-3 bg-card rounded-lg border border-border text-xs text-muted-foreground">
            <span className="font-medium">Subtotal:</span> Test 1 + Group Work + Test 2 + Project = 100 | 
            <span className="font-medium text-green-600 ml-2">A 50%:</span> 50% of Subtotal | 
            <span className="font-medium text-orange-600 ml-2">B 50%:</span> 50% of Exam | 
            <span className="font-medium text-purple-600 ml-2">Overall:</span> A (50%) + B (50%)
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
