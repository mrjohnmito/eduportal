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
import { CLASS_LEVELS, ClassLevel, SUBJECTS } from '@/types/school';
import { calculateScores, getPositionSuffix, getTotalScoreRemark, calculateAggregate, calculatePositions } from '@/lib/gradeUtils';
import { ChevronLeft, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BulkPDF() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { students, scores, settings, isAdmin } = useSchool();

  const [selectedClass, setSelectedClass] = useState<ClassLevel | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const generateReportCards = async () => {
    if (!selectedClass) return;

    setIsGenerating(true);

    try {
      const classStudents = students.filter(s => s.classLevel === selectedClass);
      const classScores = scores.filter(s => s.classLevel === selectedClass);
      const className = CLASS_LEVELS.find(c => c.id === selectedClass)?.name || selectedClass;

      if (classStudents.length === 0) {
        toast({
          title: 'No Students',
          description: 'No students found in this class.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

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

        // Header Section
        doc.setFillColor(34, 139, 34); // Green header
        doc.rect(0, 0, pageWidth, 35, 'F');

        // School Logo (left side)
        if (settings.schoolLogo) {
          try {
            doc.addImage(settings.schoolLogo, 'PNG', 10, 5, 25, 25);
          } catch {
            // Fallback to placeholder
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
        doc.text(`Academic Year: ${settings.academicYear}`, pageWidth / 2, infoY);
        doc.text(`Term: ${settings.term}`, pageWidth / 2, infoY + 8);
        doc.text(`Position: ${position}${getPositionSuffix(position)} out of ${totalStudents}`, pageWidth / 2, infoY + 16);

        yPos += 30;

        // Scores Table
        const studentScores = classScores
          .filter(s => s.studentId === student.id)
          .map(s => calculateScores(s));

        // Create table data with all subjects
        const tableData = SUBJECTS.map(subject => {
          const score = studentScores.find(s => s.subject === subject);
          if (score) {
            return [
              subject,
              score.test1?.toString() || '-',
              score.groupWork?.toString() || '-',
              score.test2?.toString() || '-',
              score.project?.toString() || '-',
              score.subtotal.toFixed(0),
              score.examScore?.toString() || '-',
              score.overallTotal.toFixed(1),
              score.grade.toString(),
              score.remark
            ];
          }
          return [subject, '-', '-', '-', '-', '-', '-', '-', '-', '-'];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Subject', 'Test 1\n(30)', 'G.Work\n(20)', 'Test 2\n(30)', 'Project\n(20)', 'CA\nTotal', 'Exam\n(100)', 'Total\n(100)', 'Grade', 'Remark']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            valign: 'middle',
            halign: 'center',
          },
          headStyles: {
            fillColor: [34, 139, 34],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7,
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 28 },
            1: { cellWidth: 12 },
            2: { cellWidth: 12 },
            3: { cellWidth: 12 },
            4: { cellWidth: 14 },
            5: { cellWidth: 12 },
            6: { cellWidth: 12 },
            7: { cellWidth: 14 },
            8: { cellWidth: 12 },
            9: { halign: 'left', cellWidth: 22 },
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

        // Remarks Section
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("Class Teacher's Remark:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(overallRemark, margin + 42, yPos);

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
