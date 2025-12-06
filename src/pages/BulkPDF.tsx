import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CLASS_LEVELS, ClassLevel } from '@/types/school';
import { calculateScores, getPositionSuffix, getTotalScoreRemark, calculateAggregate } from '@/lib/gradeUtils';
import { ChevronLeft, FileText, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BulkPDF() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { students, scores, settings, isAdmin } = useSchool();

  const [selectedClass, setSelectedClass] = useState<ClassLevel | ''>('');

  const generateExcel = () => {
    if (!selectedClass) return;

    const classStudents = students.filter(s => s.classLevel === selectedClass);
    const classScores = scores.filter(s => s.classLevel === selectedClass);

    // Prepare data for Excel
    const data = classStudents.map(student => {
      const studentScores = classScores
        .filter(s => s.studentId === student.id)
        .map(s => calculateScores(s));

      const totalScore = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);

      const row: Record<string, string | number> = {
        'Student Name': student.name,
        'Index Number': student.indexNumber || '',
      };

      studentScores.forEach(score => {
        row[`${score.subject} (Total)`] = score.overallTotal.toFixed(1);
        row[`${score.subject} (Grade)`] = score.grade;
      });

      row['Total Score'] = totalScore.toFixed(1);

      return row;
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, CLASS_LEVELS.find(c => c.id === selectedClass)?.name || 'Scores');

    // Download
    XLSX.writeFile(wb, `${selectedClass}_scores_${settings.term}_${settings.academicYear}.xlsx`);

    toast({
      title: 'Excel Downloaded',
      description: 'Score sheet has been exported successfully.',
    });
  };

  const generateReportCards = () => {
    if (!selectedClass) return;

    toast({
      title: 'Generating Report Cards',
      description: 'PDF generation will be implemented with jsPDF integration.',
    });

    // Note: Full PDF generation with jsPDF/autotable would go here
    // For now, we'll show a placeholder message
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to generate reports.
            </p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Go to Login
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl font-bold text-foreground">Bulk PDF & Export</h1>
          <p className="text-muted-foreground">Generate report cards and export data</p>
        </div>

        {/* Export Options */}
        <div className="max-w-md">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Class</label>
              <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name} ({students.filter(s => s.classLevel === level.id).length} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Button
                onClick={generateExcel}
                disabled={!selectedClass}
                variant="outline"
                className="w-full gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download as Excel
              </Button>

              <Button
                onClick={generateReportCards}
                disabled={!selectedClass}
                className="w-full gap-2 gradient-primary text-primary-foreground"
              >
                <FileText className="h-4 w-4" />
                Download Report Cards (PDF)
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What's included:</p>
              <ul className="space-y-1">
                <li>• All subject scores and grades</li>
                <li>• Auto-calculated aggregates</li>
                <li>• Class positions</li>
                <li>• Teacher & Headmaster remarks</li>
                <li>• School logo and information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
