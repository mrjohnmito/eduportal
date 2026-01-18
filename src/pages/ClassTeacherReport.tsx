import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Save, Users, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClassItem {
  id: string;
  name: string;
}

interface StudentItem {
  id: string;
  name: string;
  classLevel: string;
}

interface ClassTeacherReportData {
  id?: string;
  student_id: string;
  teacher_id: string;
  term: string;
  academic_year: string;
  attendance: number;
  interest: string;
  conduct: string;
  class_teacher_remark: string;
}

// Helper to convert class name to class_level format
const toClassLevel = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export default function ClassTeacherReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, students } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  const [loggedInTeacher, setLoggedInTeacher] = useState<{ id: string; name: string } | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [attendance, setAttendance] = useState<string>('0');
  const [interest, setInterest] = useState<string>('');
  const [conduct, setConduct] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [existingReportId, setExistingReportId] = useState<string | null>(null);

  // Check if teacher is logged in via access code
  useEffect(() => {
    const teacherData = sessionStorage.getItem('teacher');
    if (teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        setLoggedInTeacher(teacher);
        fetchAssignedClasses(teacher.id);
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAssignedClasses = async (teacherId: string) => {
    try {
      // Get assigned class IDs
      const { data: assignments, error: assignError } = await supabase
        .from('teacher_class_assignments')
        .select('class_id')
        .eq('teacher_id', teacherId);

      if (assignError) throw assignError;

      if (assignments && assignments.length > 0) {
        const classIds = assignments.map(a => a.class_id);

        // Get class details
        const { data: classesData, error: classError } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds)
          .order('name');

        if (classError) throw classError;

        setAssignedClasses(classesData || []);
      }
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingReport = async (studentId: string) => {
    if (!loggedInTeacher) return;

    try {
      const { data, error } = await supabase
        .from('class_teacher_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('term', settings.term)
        .eq('academic_year', settings.academicYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingReportId(data.id);
        setAttendance(data.attendance?.toString() || '0');
        setInterest(data.interest || '');
        setConduct(data.conduct || '');
        setRemark(data.class_teacher_remark || '');
      } else {
        setExistingReportId(null);
        setAttendance('0');
        setInterest('');
        setConduct('');
        setRemark('');
      }
    } catch (error) {
      console.error('Error fetching existing report:', error);
    }
  };

  const handleStudentSelect = (student: StudentItem) => {
    setSelectedStudent(student);
    fetchExistingReport(student.id);
  };

  const handleSave = async () => {
    if (!selectedStudent || !loggedInTeacher) return;

    const attendanceNum = parseInt(attendance) || 0;
    const maxDays = settings.totalSchoolDays || 64;

    if (attendanceNum > maxDays) {
      toast({
        title: 'Invalid Attendance',
        description: `Attendance cannot exceed ${maxDays} days.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const reportData: Omit<ClassTeacherReportData, 'id'> & { school_id?: string } = {
        student_id: selectedStudent.id,
        teacher_id: loggedInTeacher.id,
        term: settings.term,
        academic_year: settings.academicYear,
        attendance: attendanceNum,
        interest: interest,
        conduct: conduct,
        class_teacher_remark: remark,
        school_id: selectedSchool?.id,
      };

      if (existingReportId) {
        // Update existing report
        const { error } = await supabase
          .from('class_teacher_reports')
          .update(reportData)
          .eq('id', existingReportId);

        if (error) throw error;
      } else {
        // Insert new report
        const { data, error } = await supabase
          .from('class_teacher_reports')
          .insert(reportData)
          .select()
          .single();

        if (error) throw error;
        setExistingReportId(data.id);
      }

      toast({
        title: 'Report Saved',
        description: `Report for ${selectedStudent.name} has been saved.`,
      });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Error',
        description: 'Failed to save report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const classStudents = selectedClass
    ? students.filter(s => s.classLevel === selectedClass)
    : [];

  if (!loggedInTeacher) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              This page is only accessible to class teachers.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please login with your teacher access code to access this page.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
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

          <h1 className="text-2xl font-bold text-foreground">Class Teacher Report</h1>
          <p className="text-muted-foreground">
            Fill in attendance, interest, and conduct for your students
          </p>
          <p className="text-sm text-primary mt-1">Logged in as: {loggedInTeacher.name}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Class & Student Selection */}
          <div className="lg:col-span-1 space-y-4">
            {/* Class Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No classes assigned. Please contact admin.
                  </p>
                ) : (
                  <Select value={selectedClass} onValueChange={(v) => {
                    setSelectedClass(v);
                    setSelectedStudent(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedClasses.map(cls => (
                        <SelectItem key={cls.id} value={toClassLevel(cls.name)}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Student List */}
            {selectedClass && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Students ({classStudents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {classStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students in this class</p>
                    ) : (
                      classStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedStudent?.id === student.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {student.name}
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Report Form */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Report for {selectedStudent.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Attendance */}
                  <div className="space-y-2">
                    <Label htmlFor="attendance">
                      Attendance (out of {settings.totalSchoolDays || 64} days)
                    </Label>
                    <Input
                      id="attendance"
                      type="number"
                      min="0"
                      max={settings.totalSchoolDays || 64}
                      value={attendance}
                      onChange={(e) => setAttendance(e.target.value)}
                      placeholder="Enter days attended"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: {settings.totalSchoolDays || 64} days
                    </p>
                  </div>

                  {/* Interest */}
                  <div className="space-y-2">
                    <Label>Interest</Label>
                    <Select value={interest} onValueChange={setInterest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interest level" />
                      </SelectTrigger>
                      <SelectContent>
                        {(settings.interestOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']).map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conduct */}
                  <div className="space-y-2">
                    <Label>Conduct</Label>
                    <Select value={conduct} onValueChange={setConduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select conduct level" />
                      </SelectTrigger>
                      <SelectContent>
                        {(settings.conductOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']).map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class Teacher Remark */}
                  <div className="space-y-2">
                    <Label htmlFor="remark">Class Teacher's Remark (Optional)</Label>
                    <Textarea
                      id="remark"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Enter additional remarks..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : existingReportId ? 'Update Report' : 'Save Report'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Select a Student</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a class and then select a student to fill their report
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}