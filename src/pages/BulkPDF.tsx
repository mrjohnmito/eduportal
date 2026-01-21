import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
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
  const { selectedSchool } = useSelectedSchool();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!selectedSchool) return;
    
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', selectedSchool.id)
        .order('name');
      
      if (!error && data) {
        setClasses(data);
      }
    };
    fetchClasses();
  }, [selectedSchool]);

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
      const margin = 10;

      classStudents.forEach((student, studentIndex) => {
        if (studentIndex > 0) {
          doc.addPage();
        }

        let yPos = margin;
        const teacherReport = reportsMap.get(student.id);

        // ============ HEADER SECTION ============
        // Student Photo placeholder (top left)
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.rect(margin, yPos, 25, 30);
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('Student Photo', margin + 12.5, yPos + 16, { align: 'center' });

        // Try to add student photo if available
        if (student.photo) {
          try {
            doc.addImage(student.photo, 'PNG', margin, yPos, 25, 30);
          } catch {
            // Keep placeholder
          }
        }

        // School Logo (center)
        const logoX = pageWidth / 2 - 12;
        if (settings.schoolLogo) {
          try {
            doc.addImage(settings.schoolLogo, 'PNG', logoX, yPos, 24, 24);
          } catch {
            doc.setFillColor(200, 200, 200);
            doc.circle(pageWidth / 2, yPos + 12, 10, 'F');
          }
        } else {
          doc.setFillColor(200, 200, 200);
          doc.circle(pageWidth / 2, yPos + 12, 10, 'F');
        }

        // School Name and Info (center below logo)
        yPos += 28;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 6;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Academic Report Card', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${settings.term} - ${settings.academicYear}`, pageWidth / 2, yPos, { align: 'center' });

        yPos += 15;

        // ============ STUDENT INFO SECTION ============
        const position = positions.get(student.id) || 0;
        const attendance = teacherReport?.attendance || student.attendanceDays || 0;
        const studentScores = classScores
          .filter(s => s.studentId === student.id)
          .map(s => calculateScores(s));
        const { aggregate, subjects: aggregateSubjects } = calculateAggregate(studentScores);

        // Draw info box
        doc.setFillColor(240, 248, 255);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 28, 'F');
        doc.setDrawColor(100, 149, 237);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 28, 'S');

        const infoY = yPos + 6;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Row 1
        doc.setFont('helvetica', 'bold');
        doc.text('Student Name:', margin + 3, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.name, margin + 28, infoY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Class:', margin + 85, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(className, margin + 96, infoY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Serial No:', margin + 140, infoY);
        doc.setFont('helvetica', 'normal');
        doc.text(student.indexNumber || 'N/A', margin + 160, infoY);

        // Row 2
        const infoY2 = infoY + 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Position:', margin + 3, infoY2);
        doc.setFont('helvetica', 'normal');
        doc.text(`${position}${getPositionSuffix(position)} out of ${totalStudents}`, margin + 22, infoY2);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Aggregate:', margin + 85, infoY2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(59, 130, 246);
        doc.text(aggregate.toString(), margin + 107, infoY2);
        doc.setTextColor(0, 0, 0);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance:', margin + 140, infoY2);
        doc.setFont('helvetica', 'normal');
        doc.text(`${attendance} / ${settings.totalSchoolDays || 64}`, margin + 164, infoY2);

        // Row 3
        const infoY3 = infoY2 + 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Interest:', margin + 3, infoY3);
        doc.setFont('helvetica', 'normal');
        doc.text(teacherReport?.interest || 'N/A', margin + 20, infoY3);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Conduct:', margin + 85, infoY3);
        doc.setFont('helvetica', 'normal');
        doc.text(teacherReport?.conduct || 'N/A', margin + 103, infoY3);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Next Term Begins:', margin + 140, infoY3);
        doc.setFont('helvetica', 'normal');
        doc.text('January 7, 2026', margin + 173, infoY3);

        yPos += 34;

        // ============ SCORES TABLE ============
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
          return [subject, '', '', 'No scores recorded', '', ''];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Subject', 'Class Score (50%)', 'Exam Score (50%)', 'Overall', 'Grade', 'Remark']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            valign: 'middle',
            halign: 'center',
          },
          headStyles: {
            fillColor: [100, 149, 237],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 35, fillColor: [100, 149, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
            1: { cellWidth: 28, fillColor: [255, 255, 224] },
            2: { cellWidth: 28, fillColor: [255, 255, 224] },
            3: { cellWidth: 22, fillColor: [255, 228, 196] },
            4: { cellWidth: 18, fillColor: [255, 228, 196] },
            5: { halign: 'left', cellWidth: 35 },
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255],
          },
          margin: { left: margin, right: margin },
          didParseCell: function (data) {
            // Color the subject column consistently
            if (data.column.index === 0 && data.section === 'body') {
              data.cell.styles.fillColor = [100, 149, 237];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
            // Highlight Overall and Grade columns
            if ((data.column.index === 3 || data.column.index === 4) && data.section === 'body') {
              data.cell.styles.fillColor = [255, 228, 196];
            }
            // Highlight Class Score and Exam Score columns
            if ((data.column.index === 1 || data.column.index === 2) && data.section === 'body') {
              data.cell.styles.fillColor = [255, 255, 224];
            }
          },
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 80;
        yPos = finalY + 8;

        // ============ SUMMARY SECTION ============
        const totalScore = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);
        const maxScore = SUBJECTS.length * 100;
        const subjectsWithScores = studentScores.filter(s => s.overallTotal > 0).length;

        // Light Blue Summary Banner
        doc.setFillColor(173, 216, 230);
        doc.setDrawColor(100, 149, 237);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 14, 3, 3, 'FD');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Grand Total: ${totalScore.toFixed(1)} / ${maxScore}`, margin + 25, yPos + 9);
        doc.text(`Aggregate: ${aggregate}`, pageWidth / 2 + 20, yPos + 9);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`(Best ${Math.min(6, subjectsWithScores)} subjects)`, pageWidth - margin - 35, yPos + 9);

        yPos += 20;

        // ============ REMARKS SECTION ============
        // Class Teacher's Remark Box
        doc.setFillColor(255, 235, 205);
        doc.roundedRect(margin, yPos, 90, 35, 3, 3, 'F');
        doc.setDrawColor(255, 165, 0);
        doc.roundedRect(margin, yPos, 90, 35, 3, 3, 'S');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("Class Teacher's Remark:", margin + 5, yPos + 7);
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const classTeacherRemark = teacherReport?.class_teacher_remark || getTotalScoreRemark(totalScore);
        const remarkLines = doc.splitTextToSize(`"${classTeacherRemark}"`, 80);
        doc.text(remarkLines, margin + 5, yPos + 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Signature & Date', margin + 5, yPos + 32);

        // Headteacher's Remark Box
        doc.setFillColor(224, 255, 224);
        doc.roundedRect(pageWidth - margin - 90, yPos, 90, 35, 3, 3, 'F');
        doc.setDrawColor(34, 139, 34);
        doc.roundedRect(pageWidth - margin - 90, yPos, 90, 35, 3, 3, 'S');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Headteacher's Remark:", pageWidth - margin - 85, yPos + 7);
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const headRemarkLines = doc.splitTextToSize('"There is the need for extra motivation to sit up."', 80);
        doc.text(headRemarkLines, pageWidth - margin - 85, yPos + 15);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Signature & Date', pageWidth - margin - 85, yPos + 32);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
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
            onClick={() => navigate('/dashboard')}
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
                <li>• Student Photo & Serial Number</li>
                <li>• Class Score (50%) & Exam Score (50%)</li>
                <li>• Overall Total, Grade & Remark</li>
                <li>• Position, Aggregate & Attendance</li>
                <li>• Interest & Conduct</li>
                <li>• Teacher & Headteacher remarks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
