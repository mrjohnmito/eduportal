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
      const margin = 12;

      // Modern color palette
      const primary = [22, 78, 153] as [number, number, number]; // Deep blue
      const primaryLight = [37, 99, 186] as [number, number, number];
      const accent = [16, 185, 129] as [number, number, number]; // Emerald green
      const warmGray = [248, 249, 250] as [number, number, number];
      const borderGray = [226, 232, 240] as [number, number, number];
      const textDark = [30, 41, 59] as [number, number, number];
      const textMuted = [100, 116, 139] as [number, number, number];

      classStudents.forEach((student, studentIndex) => {
        if (studentIndex > 0) {
          doc.addPage();
        }

        let yPos = 0;
        const teacherReport = reportsMap.get(student.id);
        const contentWidth = pageWidth - 2 * margin;

        // ============ TOP ACCENT BAR ============
        doc.setFillColor(...primary);
        doc.rect(0, 0, pageWidth, 4, 'F');
        // Gradient effect - lighter strip
        doc.setFillColor(...primaryLight);
        doc.rect(0, 3.5, pageWidth, 0.5, 'F');

        yPos = 10;

        // ============ SCHOOL LOGO (centered) ============
        const logoSize = 22;
        const logoX = pageWidth / 2 - logoSize / 2;
        if (settings.schoolLogo) {
          try {
            doc.addImage(settings.schoolLogo, 'PNG', logoX, yPos, logoSize, logoSize);
          } catch {
            // Draw placeholder circle
            doc.setFillColor(200, 210, 225);
            doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2, 'F');
          }
        } else {
          doc.setFillColor(200, 210, 225);
          doc.circle(pageWidth / 2, yPos + logoSize / 2, logoSize / 2, 'F');
        }

        yPos += logoSize + 4;

        // ============ SCHOOL NAME ============
        doc.setTextColor(...primary);
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });

        yPos += 5;
        // Motto in italic
        doc.setFontSize(9);
        doc.setFont('times', 'italic');
        doc.setTextColor(...textMuted);
        doc.text(`"${settings.motto}"`, pageWidth / 2, yPos, { align: 'center' });

        yPos += 4;
        // Contact info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        const contactLine = [settings.email, ...settings.contacts].filter(Boolean).join('  |  ');
        doc.text(contactLine, pageWidth / 2, yPos, { align: 'center' });

        yPos += 6;

        // ============ ACADEMIC REPORT CARD BANNER ============
        const bannerH = 9;
        const bannerW = 90;
        const bannerX = (pageWidth - bannerW) / 2;
        // Rounded rectangle banner with gradient fill
        doc.setFillColor(...primary);
        doc.roundedRect(bannerX, yPos, bannerW, bannerH, 2, 2, 'F');
        // Lighter overlay on bottom half for gradient effect
        doc.setFillColor(...primaryLight);
        doc.rect(bannerX, yPos + bannerH / 2, bannerW, bannerH / 2, 'F');
        // Re-round the bottom
        doc.setFillColor(...primary);
        doc.roundedRect(bannerX, yPos, bannerW, bannerH, 2, 2, 'S');
        // Refill properly
        doc.setFillColor(...primary);
        doc.roundedRect(bannerX, yPos, bannerW, bannerH, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ACADEMIC REPORT CARD', pageWidth / 2, yPos + 6.5, { align: 'center' });

        yPos += bannerH + 4;
        // Term & Year
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textDark);
        doc.text(`${settings.term}  •  ${settings.academicYear}`, pageWidth / 2, yPos, { align: 'center' });

        yPos += 7;

        // ============ STUDENT INFO CARD ============
        const position = positions.get(student.id) || 0;
        const attendance = teacherReport?.attendance || student.attendanceDays || 0;
        const studentScores = classScores
          .filter(s => s.studentId === student.id)
          .map(s => calculateScores(s));
        const { aggregate } = calculateAggregate(studentScores);

        const infoCardH = 32;
        // Card shadow (subtle offset rectangle)
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(margin + 1, yPos + 1, contentWidth, infoCardH, 3, 3, 'F');
        // Card background
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos, contentWidth, infoCardH, 3, 3, 'F');
        // Card border
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPos, contentWidth, infoCardH, 3, 3, 'S');

        // Student photo area (right side)
        const photoW = 22;
        const photoH = 26;
        const photoX = pageWidth - margin - photoW - 4;
        const photoY = yPos + 3;
        doc.setDrawColor(...primary);
        doc.setLineWidth(0.5);
        doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'S');
        if (student.photo) {
          try {
            doc.addImage(student.photo, 'PNG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
          } catch {
            doc.setFontSize(6);
            doc.setTextColor(...textMuted);
            doc.text('Photo', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
          }
        } else {
          doc.setFontSize(6);
          doc.setTextColor(...textMuted);
          doc.text('Photo', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
        }

        // Info grid (left side, 2 columns)
        const leftCol = margin + 5;
        const midCol = margin + contentWidth * 0.38;
        let infoY = yPos + 7;
        doc.setFontSize(8);

        const drawInfoPair = (label: string, value: string, x: number, y: number) => {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...textMuted);
          doc.text(label, x, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...textDark);
          doc.text(value, x + doc.getTextWidth(label) + 2, y);
        };

        drawInfoPair('Name: ', student.name, leftCol, infoY);
        drawInfoPair('Class: ', className, midCol, infoY);

        infoY += 6;
        drawInfoPair('Serial: ', student.indexNumber || 'N/A', leftCol, infoY);
        drawInfoPair('Attendance: ', `${attendance} / ${settings.totalSchoolDays || 64}`, midCol, infoY);

        infoY += 6;
        // Position badge
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.text('Position: ', leftCol, infoY);
        const posText = `${position}${getPositionSuffix(position)} / ${totalStudents}`;
        const posBadgeW = doc.getTextWidth(posText) + 6;
        const posBadgeX = leftCol + doc.getTextWidth('Position: ');
        doc.setFillColor(254, 243, 199); // amber-100
        doc.roundedRect(posBadgeX - 1, infoY - 3.5, posBadgeW, 5, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14); // amber-800
        doc.text(posText, posBadgeX + 2, infoY);

        drawInfoPair('Aggregate: ', aggregate.toString(), midCol, infoY);

        infoY += 6;
        drawInfoPair('Interest: ', teacherReport?.interest || 'N/A', leftCol, infoY);
        drawInfoPair('Conduct: ', teacherReport?.conduct || 'N/A', midCol, infoY);

        yPos += infoCardH + 5;

        // ============ SCORES TABLE (Modern) ============
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
          head: [['Subject', 'Class Score (50%)', 'Exam Score (50%)', 'Overall', 'Grade', 'Remark']],
          body: tableData,
          theme: 'plain',
          styles: {
            fontSize: 7.5,
            cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
            valign: 'middle',
            halign: 'center',
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [...primary] as [number, number, number],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 34, fontStyle: 'bold' },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 },
            3: { cellWidth: 22 },
            4: { cellWidth: 18 },
            5: { halign: 'left', cellWidth: 36 },
          },
          margin: { left: margin, right: margin },
          alternateRowStyles: {
            fillColor: [245, 248, 255],
          },
          didParseCell: function (data) {
            if (data.section === 'body') {
              // Subject column - blue bold text, no fill
              if (data.column.index === 0) {
                data.cell.styles.textColor = [...primary] as [number, number, number];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = undefined as any;
              }
              // Grade column - color-coded badges
              if (data.column.index === 4) {
                const gradeVal = parseInt(data.cell.raw as string);
                if (!isNaN(gradeVal)) {
                  if (gradeVal >= 1 && gradeVal <= 3) {
                    data.cell.styles.textColor = [5, 122, 85]; // green-700
                    data.cell.styles.fillColor = [209, 250, 229]; // green-100
                  } else if (gradeVal >= 4 && gradeVal <= 6) {
                    data.cell.styles.textColor = [146, 64, 14]; // amber-800
                    data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                  } else if (gradeVal >= 7 && gradeVal <= 9) {
                    data.cell.styles.textColor = [185, 28, 28]; // red-700
                    data.cell.styles.fillColor = [254, 226, 226]; // red-100
                  }
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
          },
        });

        // Get final Y position after table
        const finalY = (doc as any).lastAutoTable.finalY || yPos + 80;
        yPos = finalY + 5;

        // ============ GRAND TOTAL & AGGREGATE BAR ============
        const totalScore = studentScores.reduce((sum, s) => sum + s.overallTotal, 0);
        const maxScore = SUBJECTS.length * 100;
        const subjectsWithScores = studentScores.filter(s => s.overallTotal > 0).length;

        const summaryH = 11;
        // Gradient-style summary bar
        doc.setFillColor(...primary);
        doc.roundedRect(margin, yPos, contentWidth, summaryH, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grand Total: ${totalScore.toFixed(1)} / ${maxScore}`, margin + 6, yPos + 7.5);

        // Aggregate pill badge
        const aggText = `Aggregate: ${aggregate}`;
        const aggW = doc.getTextWidth(aggText) + 10;
        const aggX = pageWidth - margin - aggW - 4;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(aggX, yPos + 2, aggW, 7, 3, 3, 'F');
        doc.setTextColor(...primary);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(aggText, aggX + aggW / 2, yPos + 6.5, { align: 'center' });

        doc.setFontSize(6);
        doc.setTextColor(200, 220, 255);
        doc.setFont('helvetica', 'normal');
        doc.text(`(Best ${Math.min(6, subjectsWithScores)} subjects)`, aggX - 3, yPos + 7, { align: 'right' });

        yPos += summaryH + 6;

        // ============ REMARKS SECTION (side by side cards) ============
        const remarkBoxWidth = (contentWidth - 6) / 2;
        const remarkBoxHeight = 32;

        // --- Class Teacher Remark Card ---
        // Shadow
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(margin + 0.5, yPos + 0.5, remarkBoxWidth, remarkBoxHeight, 2, 2, 'F');
        // Card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos, remarkBoxWidth, remarkBoxHeight, 2, 2, 'F');
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPos, remarkBoxWidth, remarkBoxHeight, 2, 2, 'S');
        // Blue left accent border
        doc.setFillColor(...primary);
        doc.roundedRect(margin, yPos, 2.5, remarkBoxHeight, 1, 1, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text("Class Teacher's Remark", margin + 6, yPos + 6);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...textDark);
        const classTeacherRemark = teacherReport?.class_teacher_remark || getTotalScoreRemark(totalScore);
        const remarkLines = doc.splitTextToSize(`"${classTeacherRemark}"`, remarkBoxWidth - 12);
        doc.text(remarkLines, margin + 6, yPos + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...textMuted);
        doc.text('Signature & Date: ____________________', margin + 6, yPos + remarkBoxHeight - 3);

        // --- Headteacher Remark Card ---
        const headX = margin + remarkBoxWidth + 6;
        // Shadow
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(headX + 0.5, yPos + 0.5, remarkBoxWidth, remarkBoxHeight, 2, 2, 'F');
        // Card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(headX, yPos, remarkBoxWidth, remarkBoxHeight, 2, 2, 'F');
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.3);
        doc.roundedRect(headX, yPos, remarkBoxWidth, remarkBoxHeight, 2, 2, 'S');
        // Green left accent border
        doc.setFillColor(...accent);
        doc.roundedRect(headX, yPos, 2.5, remarkBoxHeight, 1, 1, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text("Headteacher's Remark", headX + 6, yPos + 6);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...textDark);
        const headRemarkLines = doc.splitTextToSize('"Keep up the good work."', remarkBoxWidth - 12);
        doc.text(headRemarkLines, headX + 6, yPos + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...textMuted);
        doc.text('Signature & Date: ____________________', headX + 6, yPos + remarkBoxHeight - 3);

        yPos += remarkBoxHeight + 4;

        // ============ NEXT TERM INFO ============
        if (settings.nextTermBegins) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...textMuted);
          doc.text(`Next Term Begins: ${settings.nextTermBegins}`, pageWidth / 2, yPos + 2, { align: 'center' });
          yPos += 6;
        }

        // ============ FOOTER ============
        // Accent line
        doc.setDrawColor(...primary);
        doc.setLineWidth(0.4);
        doc.line(margin + 30, pageHeight - 14, pageWidth - margin - 30, pageHeight - 14);

        // School contacts
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.text(contactLine, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Generated timestamp
        doc.setFontSize(6);
        doc.setTextColor(180, 180, 190);
        const now = new Date();
        doc.text(`Generated on ${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
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
