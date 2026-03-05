import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateScores, calculatePositions, getPositionSuffix, calculateAggregate, getTotalScoreRemark } from '@/lib/gradeUtils';
import { SubjectScore, CalculatedScore, SUBJECTS } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassOption {
  id: string;
  name: string;
}

const PRIMARY: [number, number, number] = [22, 78, 153];
const PRIMARY_LIGHT: [number, number, number] = [59, 130, 246];
const EMERALD: [number, number, number] = [16, 185, 129];

async function loadImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function makeGrayscale(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        d[i] = d[i + 1] = d[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: [number, number, number], stroke?: [number, number, number]) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, r, r, stroke ? 'FD' : 'F');
}

const BulkPDF: React.FC = () => {
  const { students, scores, settings } = useSchool();
  const { selectedSchool } = useSelectedSchool();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!selectedSchool) return;
    const fetchClasses = async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', selectedSchool.id)
        .order('name');
      if (data) setClasses(data);
    };
    fetchClasses();
  }, [selectedSchool]);

  const generatePDF = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const classStudents = students.filter(s => s.classLevel === selectedClass);
      if (classStudents.length === 0) {
        toast.error('No students found in this class');
        setGenerating(false);
        return;
      }

      // Fetch class teacher reports
      const { data: reports } = await supabase
        .from('class_teacher_reports')
        .select('*')
        .eq('school_id', selectedSchool?.id)
        .eq('term', settings.term)
        .eq('academic_year', settings.academicYear);

      const reportMap = new Map<string, any>();
      reports?.forEach(r => reportMap.set(r.student_id, r));

      // Calculate all scores and positions
      const studentCalcScores = new Map<string, CalculatedScore[]>();
      const studentTotals: { studentId: string; total: number }[] = [];

      for (const student of classStudents) {
        const studentScores = scores.filter(s => s.studentId === student.id);
        const calculated = studentScores.map(s => calculateScores(s));
        studentCalcScores.set(student.id, calculated);
        const total = calculated.reduce((sum, c) => sum + c.overallTotal, 0);
        studentTotals.push({ studentId: student.id, total });
      }

      const positions = calculatePositions(studentTotals);
      const totalStudents = classStudents.length;

      // Load school logo
      let logoData: string | null = null;
      if (settings.schoolLogo) {
        logoData = await loadImage(settings.schoolLogo);
      }

      const doc = new jsPDF('p', 'mm', 'A4');
      const pageW = 210;
      const margin = 12;
      const contentW = pageW - margin * 2;

      for (let idx = 0; idx < classStudents.length; idx++) {
        const student = classStudents[idx];
        if (idx > 0) doc.addPage();
        setProgress(Math.round(((idx + 1) / classStudents.length) * 100));

        const calcScores = studentCalcScores.get(student.id) || [];
        const position = positions.get(student.id) || 0;
        const report = reportMap.get(student.id);
        const grandTotal = studentTotals.find(t => t.studentId === student.id)?.total || 0;
        const aggregate = calcScores.length > 0 ? calculateAggregate(calcScores) : { aggregate: 0, subjects: [] };

        // Load student photos
        let colorPhoto: string | null = null;
        let grayPhoto: string | null = null;
        if (student.photo) {
          colorPhoto = await loadImage(student.photo);
          if (colorPhoto) {
            grayPhoto = await makeGrayscale(colorPhoto);
          }
        }

        let y = 0;

        // ===== ACCENT BAR =====
        doc.setFillColor(...PRIMARY);
        doc.rect(0, 0, pageW, 4, 'F');
        y = 6;

        // ===== COLORED PHOTO (top-left) =====
        const photoBoxW = 32;
        const photoBoxH = 38;
        const photoBoxX = margin;
        const photoBoxY = y;
        drawRoundedRect(doc, photoBoxX, photoBoxY, photoBoxW, photoBoxH, 2, [240, 240, 240], [200, 200, 200]);
        if (colorPhoto) {
          doc.addImage(colorPhoto, 'JPEG', photoBoxX + 1, photoBoxY + 1, photoBoxW - 2, photoBoxH - 2);
        } else {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text('No Photo', photoBoxX + photoBoxW / 2, photoBoxY + photoBoxH / 2, { align: 'center' });
        }

        // ===== HEADER =====
        const headerCenterX = pageW / 2;

        if (logoData) {
          doc.addImage(logoData, 'PNG', headerCenterX - 10, y, 20, 20);
          y += 22;
        } else {
          y += 4;
        }

        // School name
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...PRIMARY);
        doc.text(settings.schoolName.toUpperCase(), headerCenterX, y, { align: 'center' });
        y += 5;

        // Motto
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`"${settings.motto}"`, headerCenterX, y, { align: 'center' });
        y += 4;

        // Contacts
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        const contactLine = [settings.email, ...settings.contacts].filter(Boolean).join(' | ');
        doc.text(contactLine, headerCenterX, y, { align: 'center' });
        y += 6;

        // Banner
        const bannerH = 8;
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(margin + 20, y, contentW - 40, bannerH, 3, 3, 'F');
        doc.setFillColor(...PRIMARY_LIGHT);
        doc.roundedRect(margin + 22, y + 0.5, contentW - 44, bannerH - 1, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('ACADEMIC REPORT CARD', headerCenterX, y + bannerH / 2 + 1, { align: 'center' });
        y += bannerH + 3;

        // Term / Year
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`${settings.term} — Academic Year: ${settings.academicYear}`, headerCenterX, y, { align: 'center' });
        y += 6;

        // ===== STUDENT INFO CARD =====
        const cardH = 36;
        // Shadow
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(margin + 0.5, y + 0.5, contentW, cardH, 3, 3, 'F');
        // Card
        drawRoundedRect(doc, margin, y, contentW, cardH, 3, [248, 249, 250], [220, 220, 220]);

        const cardY = y + 4;
        const col1X = margin + 5;
        const col2X = margin + contentW / 2 + 5;
        const lineH = 5.5;

        doc.setFontSize(7.5);

        const drawField = (label: string, value: string, x: number, row: number) => {
          const fy = cardY + row * lineH;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text(`${label}:`, x, fy);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(value, x + doc.getTextWidth(`${label}: `) + 1, fy);
        };

        drawField('Name', student.name, col1X, 0);
        drawField('Class', selectedClass, col1X, 1);
        drawField('Index No.', student.indexNumber || 'N/A', col1X, 2);

        // Position with badge
        const posText = `${position}${getPositionSuffix(position)} out of ${totalStudents}`;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('Position:', col1X, cardY + 3 * lineH);
        const posLabelW = doc.getTextWidth('Position: ') + 1;
        const posBadgeX = col1X + posLabelW;
        const posBadgeW = doc.getTextWidth(posText) + 4;
        doc.setFillColor(255, 237, 179);
        doc.roundedRect(posBadgeX, cardY + 3 * lineH - 3, posBadgeW, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(120, 80, 0);
        doc.text(posText, posBadgeX + 2, cardY + 3 * lineH);
        doc.setFontSize(7.5);

        drawField('Conduct', report?.conduct || 'N/A', col2X, 0);
        drawField('Interest', report?.interest || 'N/A', col2X, 1);
        drawField('Next Term Begins', settings.nextTermBegins || 'TBA', col2X, 2);

        // Grayscale photo in info card (small)
        const infoPhotoW = 14;
        const infoPhotoH = 17;
        const infoPhotoX = margin + contentW - infoPhotoW - 5;
        const infoPhotoY = y + 6;
        drawRoundedRect(doc, infoPhotoX, infoPhotoY, infoPhotoW, infoPhotoH, 2, [235, 235, 235]);
        if (grayPhoto) {
          doc.addImage(grayPhoto, 'JPEG', infoPhotoX + 1, infoPhotoY + 1, infoPhotoW - 2, infoPhotoH - 2);
        } else {
          doc.setFontSize(6);
          doc.setTextColor(150, 150, 150);
          doc.text('Photo', infoPhotoX + infoPhotoW / 2, infoPhotoY + infoPhotoH / 2, { align: 'center' });
        }

        y += cardH + 4;

        // ===== SCORES TABLE =====
        const tableHeaders = [
          'Subject',
          'Test 1\n(20)',
          'Group\nWork (20)',
          'Test 2\n(20)',
          'Project\n(20)',
          'Sub\nTotal',
          'Class\nScore (50%)',
          'Exam\nScore (50%)',
          'Overall\nTotal',
          'Grade',
          'Remark',
        ];

        const tableBody = calcScores.map(s => [
          s.subject,
          String(s.test1 ?? 0),
          String(s.groupWork ?? 0),
          String(s.test2 ?? 0),
          String(s.project ?? 0),
          String(s.subtotal),
          s.caScore.toFixed(1),
          s.examPercent.toFixed(1),
          s.overallTotal.toFixed(1),
          String(s.grade),
          s.remark,
        ]);

        autoTable(doc, {
          startY: y,
          head: [tableHeaders],
          body: tableBody,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 6.5,
            cellPadding: 1.5,
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
            valign: 'middle',
            halign: 'center',
          },
          headStyles: {
            fillColor: PRIMARY,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6,
            halign: 'center',
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', textColor: PRIMARY, cellWidth: 28 },
            5: { fillColor: [255, 251, 235] },
            6: { fillColor: [255, 251, 235] },
            7: { fillColor: [255, 251, 235] },
            8: { fillColor: [255, 237, 213] },
            9: { fillColor: [255, 237, 213] },
            10: { fillColor: [255, 237, 213] },
          },
          alternateRowStyles: {
            fillColor: [245, 248, 255],
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 9) {
              const grade = parseInt(data.cell.text[0]);
              if (grade >= 1 && grade <= 3) {
                data.cell.styles.textColor = [22, 163, 74];
                data.cell.styles.fontStyle = 'bold';
              } else if (grade >= 4 && grade <= 6) {
                data.cell.styles.textColor = [180, 120, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (grade >= 7) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 4;

        // ===== GRAND TOTAL & AGGREGATE BAR =====
        const summaryH = 10;
        // Gradient simulation
        doc.setFillColor(30, 64, 120);
        doc.roundedRect(margin, y, contentW, summaryH, 2, 2, 'F');
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(margin + 0.3, y + 0.3, contentW - 0.6, summaryH - 0.6, 1.8, 1.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`Grand Total: ${grandTotal.toFixed(1)}`, margin + 8, y + summaryH / 2 + 1);

        // Total score remark
        const totalRemark = getTotalScoreRemark(grandTotal);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text(totalRemark, margin + contentW / 2, y + summaryH / 2 + 1, { align: 'center' });

        // Aggregate badge
        const aggText = `Aggregate: ${aggregate.aggregate}`;
        const aggW = doc.getTextWidth(aggText) + 8;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + contentW - aggW - 6, y + 2, aggW, summaryH - 4, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PRIMARY);
        doc.text(aggText, margin + contentW - aggW / 2 - 6, y + summaryH / 2 + 1, { align: 'center' });

        y += summaryH + 4;

        // ===== ATTENDANCE =====
        const attendH = 7;
        drawRoundedRect(doc, margin, y, contentW, attendH, 2, [248, 249, 250], [220, 220, 220]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const attendDays = report?.attendance ?? student.attendanceDays ?? 0;
        const totalDays = settings.totalSchoolDays || 64;
        doc.text(`Attendance: ${attendDays} out of ${totalDays} school days`, margin + 5, y + attendH / 2 + 1);
        y += attendH + 4;

        // ===== REMARKS =====
        const remarkW = (contentW - 4) / 2;
        const remarkH = 24;

        // Class Teacher Remark
        drawRoundedRect(doc, margin, y, remarkW, remarkH, 2, [248, 249, 250], [220, 220, 220]);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...PRIMARY);
        doc.text("Class Teacher's Remark", margin + 6, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        const ctRemark = report?.class_teacher_remark || 'N/A';
        const ctLines = doc.splitTextToSize(ctRemark, remarkW - 12);
        doc.text(ctLines, margin + 6, y + 10);
        doc.setDrawColor(150, 150, 150);
        doc.line(margin + 6, y + remarkH - 5, margin + remarkW - 6, y + remarkH - 5);
        doc.setFontSize(6);
        doc.setTextColor(130, 130, 130);
        doc.text('Signature', margin + 6, y + remarkH - 2);

        // Headteacher Remark
        const htX = margin + remarkW + 4;
        drawRoundedRect(doc, htX, y, remarkW, remarkH, 2, [248, 249, 250], [220, 220, 220]);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...EMERALD);
        doc.text("Headteacher's Remark", htX + 6, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        const htRemark = totalRemark;
        const htLines = doc.splitTextToSize(htRemark, remarkW - 12);
        doc.text(htLines, htX + 6, y + 10);
        doc.setDrawColor(150, 150, 150);
        doc.line(htX + 6, y + remarkH - 5, htX + remarkW - 6, y + remarkH - 5);
        doc.setFontSize(6);
        doc.setTextColor(130, 130, 130);
        doc.text('Signature', htX + 6, y + remarkH - 2);

        y += remarkH + 4;

        // ===== FOOTER =====
        doc.setDrawColor(...PRIMARY_LIGHT);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + contentW, y);
        y += 3;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(contactLine, headerCenterX, y, { align: 'center' });
        y += 3;
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, headerCenterX, y, { align: 'center' });
      }

      const className = classes.find(c => c.name === selectedClass)?.name || selectedClass;
      doc.save(`${settings.schoolName}_${className}_Report_Cards.pdf`);
      toast.success(`Generated report cards for ${classStudents.length} students`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Error generating PDF');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Bulk Report Card PDF
        </h1>

        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Select Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}

          <Button onClick={generatePDF} disabled={generating || !selectedClass} className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Report Cards'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default BulkPDF;
