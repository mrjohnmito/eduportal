import { useState, useEffect } from 'react';
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
import { SUBJECTS } from '@/types/school';
import { calculateScores, getPositionSuffix, getTotalScoreRemark, calculateAggregate, calculatePositions } from '@/lib/gradeUtils';
import { ChevronLeft, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface ClassItem {
  id: string;
  name: string;
}

interface ClassTeacherReportData {
  student_id: string;
  attendance: number;
  interest: string;
  conduct: string;
  class_teacher_remark: string;
}

// Helper to convert class name to class_level format
const toClassLevel = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export default function BulkPDF() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { students, scores, settings, isAdmin } = useSchool();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setClasses(data);
      }
    };
    fetchClasses();
  }, []);

  const generateExcel = () => {
    if (!selectedClass) return;

    const classStudents = students.filter(s => s.classLevel === selectedClass);
    const classScores = scores.filter(s => s.classLevel === selectedClass);

    // Prepare data for Excel with simplified columns
    const data = classStudents.map(student => {
      const studentScores = classScores
        .filter(s => s.studentId === student.id)
        .map(s => calculateScores(s));

      const totalScore = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);

      const row: Record<string, string | number> = {
        'Student Name': student.name,
        'Index Number': student.indexNumber || '',
      };

      // Simplified columns: A (50%), B (50%), Overall, Grade, Remark
      studentScores.forEach(score => {
        row[`${score.subject} A(50%)`] = score.caScore.toFixed(1);
        row[`${score.subject} B(50%)`] = score.examPercent.toFixed(1);
        row[`${score.subject} Overall`] = score.overallTotal.toFixed(1);
        row[`${score.subject} Grade`] = score.grade;
        row[`${score.subject} Remark`] = score.remark;
      });

      row['Total Score'] = totalScore.toFixed(1);

      return row;
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, classes.find(c => toClassLevel(c.name) === selectedClass)?.name || 'Scores');

    // Download
    XLSX.writeFile(wb, `${selectedClass}_scores_${settings.term}_${settings.academicYear}.xlsx`);

    toast({
      title: 'Excel Downloaded',
      description: 'Score sheet has been exported successfully.',
    });
  };

  const generateReportCards = async () => {
    if (!selectedClass) return;

    setIsGenerating(true);

    try {
      const classStudents = students.filter(s => s.classLevel === selectedClass);
      const classScores = scores.filter(s => s.classLevel === selectedClass);
      const className = classes.find(c => toClassLevel(c.name) === selectedClass)?.name || selectedClass;

      if (classStudents.length === 0) {
        toast({
          title: 'No Students',
          description: 'No students found in this class.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Fetch class teacher reports for all students in this class
      const studentIds = classStudents.map(s => s.id);
      const { data: teacherReports } = await supabase
        .from('class_teacher_reports')
        .select('*')
        .in('student_id', studentIds)
        .eq('term', settings.term)
        .eq('academic_year', settings.academicYear);

      const reportsMap = new Map<string, ClassTeacherReportData>();
      teacherReports?.forEach(report => {
        reportsMap.set(report.student_id, {
          student_id: report.student_id,
          attendance: report.attendance || 0,
          interest: report.interest || '',
          conduct: report.conduct || '',
          class_teacher_remark: report.class_teacher_remark || '',
        });
      });

      // Calculate positions for all students
      const studentTotals = classStudents.map(student => {
        const studentScores = classScores
          .filter(s => s.studentId === student.id)
          .map(s => calculateScores(s));
        const total = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);
        return { studentId: student.id, total };
      });

      const positions = calculatePositions(studentTotals);
      const totalStudents = classStudents.length;

      // Create PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      classStudents.forEach((student, studentIndex) => {
        if (studentIndex > 0) {
          doc.addPage();
        }

        let yPos = margin;
        const teacherReport = reportsMap.get(student.id);

        // Header Section
        doc.setFillColor(34, 139, 34); // Green header
        doc.rect(0, 0, pageWidth, 35, 'F');

        // School Logo (left side)
        if (settings.schoolLogo) {
          try {
            doc.addImage(settings.schoolLogo, 'PNG', 10, 5, 25, 25);
          } catch {
            doc.setFillColor(255, 255, 255);
            doc.circle(22, 17, 10, 'F');
          }
        } else {
          doc.setFillColor(255, 255, 255);
          doc.circle(22, 17, 10, 'F');
        }

        // Student Photo (right side)
        if (student.photo) {
          try {
            doc.addImage(student.photo, 'PNG', pageWidth - 35, 5, 25, 25);
          } catch {
            // No fallback needed
          }
        }

        // School Name and Details (center)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.schoolName, pageWidth / 2, 12, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Motto: "${settings.motto}"`, pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(8);
        doc.text(`Email: ${settings.email}`, pageWidth / 2, 24, { align: 'center' });
        doc.text(`Tel: ${settings.contacts.join(' / ')}`, pageWidth / 2, 29, { align: 'center' });

        yPos = 45;

        // Report Card Title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TERMINAL REPORT CARD', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Student Info Section
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'S');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const infoY = yPos + 7;
        
        doc.text(`Name: ${student.name}`, margin + 5, infoY);
        doc.text(`Class: ${className}`, margin + 5, infoY + 8);
        doc.text(`Index No: ${student.indexNumber || 'N/A'}`, margin + 5, infoY + 16);

        const position = positions.get(student.id) || 0;
        const attendance = teacherReport?.attendance || student.attendanceDays || 0;
        doc.text(`Academic Year: ${settings.academicYear}`, pageWidth / 2, infoY);
        doc.text(`Term: ${settings.term}`, pageWidth / 2, infoY + 8);
        doc.text(`Attendance: ${attendance} of ${settings.totalSchoolDays || 64} days`, pageWidth / 2, infoY + 16);

        yPos += 30;

        // Scores Table - Simplified with A(50%), B(50%), Overall, Grade, Remark
        const studentScores = classScores
          .filter(s => s.studentId === student.id)
          .map(s => calculateScores(s));

        const tableData = SUBJECTS.map(subject => {
          const score = studentScores.find(s => s.subject === subject);
          if (score) {
            return [
              subject,
              score.caScore.toFixed(1),
              score.examPercent.toFixed(1),
              score.overallTotal.toFixed(1),
              score.grade.toString(),
              score.remark
            ];
          }
          return [subject, '-', '-', '-', '-', '-'];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Subject', 'A (50%)', 'B (50%)', 'Overall\n(100)', 'Grade', 'Remark']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            valign: 'middle',
            halign: 'center',
          },
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 40 },
            1: { cellWidth: 22 },
            2: { cellWidth: 22 },
            3: { cellWidth: 22 },
            4: { cellWidth: 18 },
            5: { halign: 'left', cellWidth: 36 },
          },
          margin: { left: margin, right: margin },
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 80;
        yPos = finalY + 5;

        // Summary Section
        const totalScore = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);
        const { aggregate, subjects: aggregateSubjects } = calculateAggregate(studentScores);
        const overallRemark = getTotalScoreRemark(totalScore);

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 20, 'S');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Score: ${totalScore.toFixed(1)} / ${SUBJECTS.length * 100}`, margin + 5, yPos + 7);
        doc.text(`Aggregate: ${aggregate}`, margin + 5, yPos + 14);
        
        doc.text(`Class Position: ${position}${getPositionSuffix(position)} / ${totalStudents}`, pageWidth / 2, yPos + 7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Aggregate Subjects: ${aggregateSubjects.slice(0, 3).join(', ')}...`, pageWidth / 2, yPos + 14);

        yPos += 25;

        // Interest and Conduct (from Class Teacher Report)
        if (teacherReport?.interest || teacherReport?.conduct) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`Interest: `, margin, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(teacherReport?.interest || 'N/A', margin + 18, yPos);
          
          doc.setFont('helvetica', 'bold');
          doc.text(`Conduct: `, pageWidth / 2, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(teacherReport?.conduct || 'N/A', pageWidth / 2 + 18, yPos);
          yPos += 8;
        }

        // Remarks Section
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Class Teacher's Remark:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        const classTeacherRemark = teacherReport?.class_teacher_remark || overallRemark;
        doc.text(classTeacherRemark.substring(0, 60), margin + 42, yPos);

        yPos += 8;

        doc.setFont('helvetica', 'bold');
        doc.text("Headmaster's Remark:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text('Keep up the good work. Promoted to the next class.', margin + 40, yPos);

        yPos += 15;

        // Signature Section
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, yPos, margin + 50, yPos);
        doc.line(pageWidth - margin - 50, yPos, pageWidth - margin, yPos);

        doc.setFontSize(8);
        doc.text('Class Teacher Signature', margin, yPos + 5);
        doc.text('Date: ____/____/____', margin, yPos + 10);

        doc.text("Headmaster's Signature", pageWidth - margin - 50, yPos + 5);
        doc.text('Date: ____/____/____', pageWidth - margin - 50, yPos + 10);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      });

      // Save PDF
      doc.save(`${className}_Report_Cards_${settings.term}_${settings.academicYear}.pdf`);

      toast({
        title: 'Report Cards Generated!',
        description: `Successfully generated ${classStudents.length} report cards.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Generation Failed',
        description: 'An error occurred while generating the report cards.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
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
              <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => {
                    const classLevel = toClassLevel(cls.name);
                    return (
                      <SelectItem key={cls.id} value={classLevel}>
                        {cls.name} ({students.filter(s => s.classLevel === classLevel).length} students)
                      </SelectItem>
                    );
                  })}
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
                disabled={!selectedClass || isGenerating}
                className="w-full gap-2 gradient-primary text-primary-foreground"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Download Report Cards (PDF)
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What's included:</p>
              <ul className="space-y-1">
                <li>• A (50%) - Continuous Assessment</li>
                <li>• B (50%) - Exam Score</li>
                <li>• Overall Total, Grade & Remark</li>
                <li>• Attendance, Interest & Conduct</li>
                <li>• Class positions & Aggregate</li>
                <li>• Teacher & Headmaster remarks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}