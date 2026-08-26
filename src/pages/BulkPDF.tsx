import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';
import { calculateScores, calculatePositions, getPositionSuffix, calculateAggregate, getHeadteacherRemark, getClassTeacherRemark } from '@/lib/gradeUtils';
import { SubjectScore, CalculatedScore, SUBJECTS } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText, Sparkles, Users, GraduationCap, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
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

const normalizeClassKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

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

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve({ width: 100, height: 100 });
    }, 3000);
    img.onload = () => {
      clearTimeout(timeout);
      resolve({ width: img.width || 100, height: img.height || 100 });
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ width: 100, height: 100 });
    };
    img.src = dataUrl;
  });
}

// Pre-crop image on canvas to exact box dimensions with "cover" behavior
function preparePhotoForBox(dataUrl: string, targetW: number, targetH: number, grayscale = false, cornerRadius?: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => resolve(null), 5000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        // Use a reasonable pixel resolution (3x mm to px)
        const pxW = Math.round(targetW * 3);
        const pxH = Math.round(targetH * 3);
        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }

        // Calculate source crop for "cover" (center-crop)
        const imgAspect = img.width / img.height;
        const boxAspect = pxW / pxH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > boxAspect) {
          // Image is wider — crop sides
          sw = img.height * boxAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Image is taller — crop top/bottom
          sh = img.width / boxAspect;
          sy = (img.height - sh) / 2;
        }

        // Clip to rounded rect so corners match the photo box frame
        const radius = cornerRadius != null ? Math.round(cornerRadius * 3) : Math.round(Math.min(pxW, pxH) * 0.06);
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(pxW - radius, 0);
        ctx.quadraticCurveTo(pxW, 0, pxW, radius);
        ctx.lineTo(pxW, pxH - radius);
        ctx.quadraticCurveTo(pxW, pxH, pxW - radius, pxH);
        ctx.lineTo(radius, pxH);
        ctx.quadraticCurveTo(0, pxH, 0, pxH - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pxW, pxH);

        if (grayscale) {
          const imageData = ctx.getImageData(0, 0, pxW, pxH);
          const d = imageData.data;
          for (let i = 0; i < d.length; i += 4) {
            const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            d[i] = d[i + 1] = d[i + 2] = avg;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timeout); resolve(null); };
    img.src = dataUrl;
  });
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
  const navigate = useNavigate();
  const { students, scores, settings, user } = useSchool();
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
      if (!data) return;
      // If logged in as a teacher, restrict to assigned classes only
      const teacherId = user?.user_metadata?.teacher_id as string | undefined;
      if (teacherId) {
        const { data: assignments } = await supabase
          .from('teacher_class_assignments')
          .select('class_id')
          .eq('teacher_id', teacherId)
          .eq('school_id', selectedSchool.id);
        const allowed = new Set((assignments || []).map(a => a.class_id));
        setClasses(data.filter(c => allowed.has(c.id)));
      } else {
        setClasses(data);
      }
    };
    fetchClasses();
  }, [selectedSchool, user]);

  const generatePDF = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const selectedClassKey = normalizeClassKey(selectedClass);
      const classStudents = students.filter((s) => normalizeClassKey(s.classLevel) === selectedClassKey);
      if (classStudents.length === 0) {
        toast.error('No students found in this class');
        setGenerating(false);
        return;
      }

      // Fetch class teacher reports
      const { data: reports } = await fetchAllRows<any>(() =>
        supabase
          .from('class_teacher_reports')
          .select('*')
          .eq('school_id', selectedSchool?.id)
          .eq('term', settings.term)
          .eq('academic_year', settings.academicYear)
          .order('id')
      );

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

      // Calculate per-subject positions
      const subjectPositions = new Map<string, Map<string, number>>(); // subject -> (studentId -> position)
      const allSubjects = new Set<string>();
      studentCalcScores.forEach(scores => scores.forEach(s => allSubjects.add(s.subject)));
      
      for (const subject of allSubjects) {
        const subjectTotals: { studentId: string; total: number }[] = [];
        for (const student of classStudents) {
          const calc = studentCalcScores.get(student.id)?.find(s => s.subject === subject);
          subjectTotals.push({ studentId: student.id, total: calc?.overallTotal ?? 0 });
        }
        subjectPositions.set(subject, calculatePositions(subjectTotals));
      }

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

        // Load & pre-crop student photos
        let croppedColor: string | null = null;
        let croppedGray: string | null = null;
        if (student.photo) {
          const rawPhoto = await loadImage(student.photo);
          if (rawPhoto) {
            croppedColor = await preparePhotoForBox(rawPhoto, 30, 36, false, 1);
            croppedGray = await preparePhotoForBox(rawPhoto, 12, 15, true, 1);
          }
        }

        let y = 4;

        // ===== COLORED PHOTO (top-left) =====
        const photoBoxW = 32;
        const photoBoxH = 38;
        const photoBoxX = margin;
        const photoBoxY = y;
        drawRoundedRect(doc, photoBoxX, photoBoxY, photoBoxW, photoBoxH, 2, [240, 240, 240], [200, 200, 200]);
        if (croppedColor) {
          doc.addImage(croppedColor, 'PNG', photoBoxX + 1, photoBoxY + 1, photoBoxW - 2, photoBoxH - 2);
          // Redraw border on top to ensure clean edges
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.roundedRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 2, 2, 'S');
        } else {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text('No Photo', photoBoxX + photoBoxW / 2, photoBoxY + photoBoxH / 2, { align: 'center' });
        }

        // ===== HEADER =====
        const headerCenterX = pageW / 2;

        if (logoData) {
          doc.addImage(logoData, 'PNG', headerCenterX - 10, y, 20, 20);
          y += 24;
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

        // Academic Report Card title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...PRIMARY);
        doc.text('ACADEMIC REPORT CARD', headerCenterX, y + 4, { align: 'center' });
        y += 8;

        // Term / Year
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`${settings.term} — Academic Year: ${settings.academicYear}`, headerCenterX, y, { align: 'center' });
        y += 6;

        // ===== STUDENT INFO CARD =====
        const cardH = 28;

        // Push the student info card slightly lower so it stays clear of the photo box
        y += 10;

        // Shadow
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(margin + 0.5, y + 0.5, contentW, cardH, 3, 3, 'F');
        // Card
        drawRoundedRect(doc, margin, y, contentW, cardH, 3, [248, 249, 250], [220, 220, 220]);

        const cardY = y + 5;
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
        drawField('Promoted To', report?.promoted_to || 'N/A', col2X, 3);

        // Grayscale photo in info card (small)
        const infoPhotoW = 14;
        const infoPhotoH = 17;
        const infoPhotoX = margin + contentW - infoPhotoW - 5;
        const infoPhotoY = y + 6;
        drawRoundedRect(doc, infoPhotoX, infoPhotoY, infoPhotoW, infoPhotoH, 2, [235, 235, 235]);
        if (croppedGray) {
          doc.addImage(croppedGray, 'PNG', infoPhotoX + 1, infoPhotoY + 1, infoPhotoW - 2, infoPhotoH - 2);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.roundedRect(infoPhotoX, infoPhotoY, infoPhotoW, infoPhotoH, 2, 2, 'S');
        } else {
          doc.setFontSize(6);
          doc.setTextColor(150, 150, 150);
          doc.text('Photo', infoPhotoX + infoPhotoW / 2, infoPhotoY + infoPhotoH / 2, { align: 'center' });
        }

        y += cardH + 4;

        // ===== SCORES TABLE =====
        const tableHeaders = [
          'Subject',
          'Class\nScore (50%)',
          'Exam\nScore (50%)',
          'Overall\nTotal',
          'Position',
          'Grade',
          'Remark',
        ];

        const tableBody = calcScores.map(s => {
          const subjPos = subjectPositions.get(s.subject)?.get(student.id) || 0;
          const posStr = `${subjPos}${getPositionSuffix(subjPos)}`;
          return [
            s.subject,
            s.caScore.toFixed(1),
            s.examPercent.toFixed(1),
            s.overallTotal.toFixed(1),
            posStr,
            String(s.grade),
            s.remark,
          ];
        });

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
            0: { halign: 'left', fontStyle: 'bold', textColor: PRIMARY, cellWidth: 32 },
            1: { fillColor: [255, 251, 235] },
            2: { fillColor: [255, 251, 235] },
            3: { fillColor: [255, 237, 213] },
            4: { fillColor: [255, 237, 213] },
            5: { fillColor: [255, 237, 213] },
            6: { fillColor: [255, 237, 213] },
          },
          alternateRowStyles: {
            fillColor: [245, 248, 255],
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
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
        const ctRemark = getClassTeacherRemark(grandTotal);
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
        const htRemark = getHeadteacherRemark(grandTotal);
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

  const selectedClassKey = selectedClass ? normalizeClassKey(selectedClass) : '';
  const matchedStudents = selectedClass
    ? students.filter((s) => normalizeClassKey(s.classLevel) === selectedClassKey)
    : [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-primary-foreground/20 p-2.5">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Bulk Report Cards</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm">
            Generate beautifully formatted PDF report cards for an entire class in one click.
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border shadow-sm p-6 space-y-5"
        >
          {/* Class Selector */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Select Class
            </label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-11 rounded-lg border-2 border-muted focus:border-primary transition-colors">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Preview */}
          {selectedClass && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-lg bg-accent/50 border border-accent p-3"
            >
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {matchedStudents.length} student{matchedStudents.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-muted-foreground">
                  Reports will be generated for {selectedClass}
                </p>
              </div>
            </motion.div>
          )}

          {/* Progress */}
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center font-medium">{progress}% complete</p>
            </motion.div>
          )}

          {/* Generate Button */}
          <Button
            onClick={generatePDF}
            disabled={generating || !selectedClass}
            className="w-full h-12 rounded-lg text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md transition-all"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            {generating ? 'Generating...' : 'Generate Report Cards'}
          </Button>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default BulkPDF;
