import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { SubjectScore, Student } from '@/types/school';
import { calculateScores, validateScore } from '@/lib/gradeUtils';
import { CalculatedScore } from '@/types/school';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ScoreRow {
  student: Student;
  score: SubjectScore;
  calculated: CalculatedScore;
  errors: Record<string, boolean>;
}

// Generate consistent colors based on class name
function getClassGradient(className: string): string {
  const gradients = [
    'from-emerald-500 to-emerald-600',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return gradients[Math.abs(hash) % gradients.length];
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
  } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);

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
    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before saving.',
        variant: 'destructive',
      });
      return;
    }

    let saved = 0;
    for (const row of scoreRows) {
      if (row.score.id) {
        updateScore(row.score.id, row.score);
      } else if (
        row.score.test1 !== null ||
        row.score.groupWork !== null ||
        row.score.test2 !== null ||
        row.score.project !== null ||
        row.score.examScore !== null
      ) {
        addScore(row.score);
      }
      saved++;
    }

    toast({
      title: 'Scores Saved',
      description: `Successfully saved scores for ${saved} students.`,
    });
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

  if (loading || !classInfo || !classLevel) {
    return (
      <MainLayout>
        <div className="container py-8 text-center text-muted-foreground">
          Loading...
        </div>
      </MainLayout>
    );
  }

  const gradient = getClassGradient(classInfo.name);

  return (
    <MainLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate(`/class/${classLevel}`)}
            className="mb-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {classInfo.name}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {decodedSubject}
              </h1>
              <p className="text-sm text-muted-foreground">
                {classInfo.name} • {students.length} students
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={hasErrors}
                className={cn('gap-2 text-white', `bg-gradient-to-r ${gradient}`)}
              >
                <Save className="h-4 w-4" />
                Save Scores
              </Button>
            </div>
          </div>
        </div>

        {/* No Students Warning */}
        {students.length === 0 ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
            <p className="text-warning font-medium">
              No students in this class. Add students from the dashboard first.
            </p>
          </div>
        ) : (
          /* Excel-Style Table */
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm animate-fade-in">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="excel-cell excel-header text-left px-3 min-w-[50px]">#</th>
                  <th className="excel-cell excel-header text-left px-3 min-w-[180px]">Student Name</th>
                  <th className="excel-cell excel-header min-w-[70px]">Test 1<br/><span className="text-xs font-normal text-muted-foreground">(30)</span></th>
                  <th className="excel-cell excel-header min-w-[70px]">Group<br/><span className="text-xs font-normal text-muted-foreground">(20)</span></th>
                  <th className="excel-cell excel-header min-w-[70px]">Test 2<br/><span className="text-xs font-normal text-muted-foreground">(30)</span></th>
                  <th className="excel-cell excel-header min-w-[70px]">Project<br/><span className="text-xs font-normal text-muted-foreground">(20)</span></th>
                  <th className="excel-cell excel-header min-w-[70px] bg-muted/80">Subtotal<br/><span className="text-xs font-normal text-muted-foreground">(100)</span></th>
                  <th className="excel-cell excel-header min-w-[60px] bg-primary/10">A<br/><span className="text-xs font-normal text-muted-foreground">(50%)</span></th>
                  <th className="excel-cell excel-header min-w-[70px]">Exam<br/><span className="text-xs font-normal text-muted-foreground">(100)</span></th>
                  <th className="excel-cell excel-header min-w-[60px] bg-primary/10">B<br/><span className="text-xs font-normal text-muted-foreground">(50%)</span></th>
                  <th className="excel-cell excel-header min-w-[70px] bg-accent/20">Total</th>
                  <th className="excel-cell excel-header min-w-[60px]">Grade</th>
                  <th className="excel-cell excel-header min-w-[100px] border-r-0">Remark</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row, index) => (
                  <tr key={row.student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="excel-cell px-3 text-center text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="excel-cell px-3 font-medium">
                      <div className="flex items-center gap-2">
                        {row.student.photo ? (
                          <img
                            src={row.student.photo}
                            alt={row.student.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {row.student.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{row.student.name}</span>
                      </div>
                    </td>
                    {/* Test 1 */}
                    <td className={cn('excel-cell', row.errors.test1 && 'excel-cell-error')}>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        className="excel-input"
                        value={row.score.test1 ?? ''}
                        onChange={e => handleScoreChange(row.student.id, 'test1', e.target.value, 30)}
                      />
                    </td>
                    {/* Group Work */}
                    <td className={cn('excel-cell', row.errors.groupWork && 'excel-cell-error')}>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        className="excel-input"
                        value={row.score.groupWork ?? ''}
                        onChange={e => handleScoreChange(row.student.id, 'groupWork', e.target.value, 20)}
                      />
                    </td>
                    {/* Test 2 */}
                    <td className={cn('excel-cell', row.errors.test2 && 'excel-cell-error')}>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        className="excel-input"
                        value={row.score.test2 ?? ''}
                        onChange={e => handleScoreChange(row.student.id, 'test2', e.target.value, 30)}
                      />
                    </td>
                    {/* Project */}
                    <td className={cn('excel-cell', row.errors.project && 'excel-cell-error')}>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        className="excel-input"
                        value={row.score.project ?? ''}
                        onChange={e => handleScoreChange(row.student.id, 'project', e.target.value, 20)}
                      />
                    </td>
                    {/* Subtotal */}
                    <td className="excel-cell bg-muted/30 text-center font-medium">
                      {row.calculated.subtotal}
                    </td>
                    {/* A (50%) */}
                    <td className="excel-cell bg-primary/5 text-center font-medium text-primary">
                      {row.calculated.caScore.toFixed(1)}
                    </td>
                    {/* Exam */}
                    <td className={cn('excel-cell', row.errors.examScore && 'excel-cell-error')}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="excel-input"
                        value={row.score.examScore ?? ''}
                        onChange={e => handleScoreChange(row.student.id, 'examScore', e.target.value, 100)}
                      />
                    </td>
                    {/* B (50%) */}
                    <td className="excel-cell bg-primary/5 text-center font-medium text-primary">
                      {row.calculated.examPercent.toFixed(1)}
                    </td>
                    {/* Total */}
                    <td className="excel-cell bg-accent/10 text-center font-bold text-accent">
                      {row.calculated.overallTotal.toFixed(1)}
                    </td>
                    {/* Grade */}
                    <td className="excel-cell text-center">
                      <span className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                        row.calculated.grade <= 3 && 'bg-success/20 text-success',
                        row.calculated.grade >= 4 && row.calculated.grade <= 6 && 'bg-warning/20 text-warning',
                        row.calculated.grade >= 7 && 'bg-destructive/20 text-destructive'
                      )}>
                        {row.calculated.grade}
                      </span>
                    </td>
                    {/* Remark */}
                    <td className="excel-cell border-r-0 px-3 text-xs">
                      <span className={cn(
                        row.calculated.grade <= 3 && 'text-success',
                        row.calculated.grade >= 4 && row.calculated.grade <= 6 && 'text-warning',
                        row.calculated.grade >= 7 && 'text-destructive'
                      )}>
                        {row.calculated.remark}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-success/20" />
            Grade 1-3: Excellent to Good
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-warning/20" />
            Grade 4-6: Average Range
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-destructive/20" />
            Grade 7-9: Needs Improvement
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
