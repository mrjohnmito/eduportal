import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronLeft, 
  Upload, 
  Save, 
  GraduationCap, 
  Plus, 
  X, 
  User, 
  Key, 
  Copy, 
  Check,
  Edit2,
  Trash2,
  Settings as SettingsIcon,
  Users,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Teacher {
  id: string;
  name: string;
  access_code: string;
  created_at: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface TeacherAssignment {
  teacher_id: string;
  class_id: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, updateSettings, isAdmin } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  // School settings state
  const [schoolName, setSchoolName] = useState('');
  const [motto, setMotto] = useState('');
  const [email, setEmail] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [contacts, setContacts] = useState('');
  const [logo, setLogo] = useState('');
  const [totalSchoolDays, setTotalSchoolDays] = useState('64');
  const [nextTermBegins, setNextTermBegins] = useState('');
  
  // Interest and Conduct options
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [conductOptions, setConductOptions] = useState<string[]>([]);

  // Sync local state with fetched settings when they change
  useEffect(() => {
    setSchoolName(settings.schoolName || '');
    setMotto(settings.motto || '');
    setEmail(settings.email || '');
    setAcademicYear(settings.academicYear || '');
    setTerm(settings.term || '');
    setContacts(settings.contacts?.join(', ') || '');
    setLogo(settings.schoolLogo || '');
    setTotalSchoolDays(settings.totalSchoolDays?.toString() || '64');
    setNextTermBegins(settings.nextTermBegins || '');
    setInterestOptions(settings.interestOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']);
    setConductOptions(settings.conductOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']);
  }, [settings]);
  const [newInterest, setNewInterest] = useState('');
  const [newConduct, setNewConduct] = useState('');

  // Teacher management state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Teacher form state
  const [teacherName, setTeacherName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [savingTeacher, setSavingTeacher] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const addInterestOption = () => {
    if (newInterest.trim() && !interestOptions.includes(newInterest.trim())) {
      setInterestOptions([...interestOptions, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterestOption = (option: string) => {
    setInterestOptions(interestOptions.filter(o => o !== option));
  };

  const addConductOption = () => {
    if (newConduct.trim() && !conductOptions.includes(newConduct.trim())) {
      setConductOptions([...conductOptions, newConduct.trim()]);
      setNewConduct('');
    }
  };

  const removeConductOption = (option: string) => {
    setConductOptions(conductOptions.filter(o => o !== option));
  };

  const handleSaveSettings = () => {
    updateSettings({
      schoolName,
      motto,
      email,
      academicYear,
      term,
      contacts: contacts.split(',').map(c => c.trim()).filter(Boolean),
      schoolLogo: logo || undefined,
      totalSchoolDays: totalSchoolDays ? parseInt(totalSchoolDays) : 64,
      nextTermBegins: nextTermBegins || undefined,
      interestOptions,
      conductOptions,
    });

    toast({
      title: 'Settings Saved',
      description: 'School settings have been updated successfully.',
    });
  };

  // Teacher management functions
  const fetchTeacherData = async () => {
    if (!selectedSchool) {
      setTeacherLoading(false);
      return;
    }

    const { data: teachersData } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', selectedSchool.id)
      .order('name');

    setTeachers(teachersData || []);

    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', selectedSchool.id)
      .order('name');

    setClasses(classesData || []);

    const { data: assignmentsData } = await supabase
      .from('teacher_class_assignments')
      .select('teacher_id, class_id')
      .eq('school_id', selectedSchool.id);

    setAssignments(assignmentsData || []);
    setTeacherLoading(false);
  };

  useEffect(() => {
    fetchTeacherData();
  }, [selectedSchool]);

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
  };

  const handleOpenTeacherDialog = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherName(teacher.name);
      setAccessCode(teacher.access_code);
      const teacherAssignments = assignments
        .filter(a => a.teacher_id === teacher.id)
        .map(a => a.class_id);
      setSelectedClasses(teacherAssignments);
    } else {
      setEditingTeacher(null);
      setTeacherName('');
      setAccessCode('');
      setSelectedClasses([]);
      generateAccessCode();
    }
    setTeacherDialogOpen(true);
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSaveTeacher = async () => {
    if (!teacherName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter the teacher name.',
        variant: 'destructive',
      });
      return;
    }

    if (!accessCode.trim() || accessCode.length < 4) {
      toast({
        title: 'Invalid Access Code',
        description: 'Access code must be at least 4 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSavingTeacher(true);

    try {
      let teacherId = editingTeacher?.id;

      if (editingTeacher) {
        const { error } = await supabase
          .from('teachers')
          .update({ name: teacherName.trim(), access_code: accessCode.trim() })
          .eq('id', editingTeacher.id);

        if (error) throw error;
      } else {
        if (!selectedSchool) {
          toast({
            title: 'Error',
            description: 'No school selected.',
            variant: 'destructive',
          });
          setSavingTeacher(false);
          return;
        }

        const { data, error } = await supabase
          .from('teachers')
          .insert({ name: teacherName.trim(), access_code: accessCode.trim(), school_id: selectedSchool.id })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Duplicate Access Code',
              description: 'This access code is already in use. Please generate a new one.',
              variant: 'destructive',
            });
            setSavingTeacher(false);
            return;
          }
          throw error;
        }
        teacherId = data.id;
      }

      // Update class assignments
      if (teacherId) {
        await supabase
          .from('teacher_class_assignments')
          .delete()
          .eq('teacher_id', teacherId);

        if (selectedClasses.length > 0 && selectedSchool) {
          const assignmentsToInsert = selectedClasses.map(classId => ({
            teacher_id: teacherId,
            class_id: classId,
            school_id: selectedSchool.id,
          }));

          await supabase
            .from('teacher_class_assignments')
            .insert(assignmentsToInsert);
        }
      }

      toast({
        title: editingTeacher ? 'Teacher Updated' : 'Teacher Created',
        description: editingTeacher
          ? `${teacherName} has been updated successfully.`
          : `${teacherName} has been added with access code: ${accessCode}`,
      });

      setTeacherDialogOpen(false);
      fetchTeacherData();
    } catch (error) {
      console.error('Error saving teacher:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the teacher.',
        variant: 'destructive',
      });
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTeacher) return;

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', deleteTeacher.id);

      if (error) throw error;

      toast({
        title: 'Teacher Deleted',
        description: `${deleteTeacher.name} has been removed.`,
      });

      setDeleteTeacher(null);
      fetchTeacherData();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the teacher.',
        variant: 'destructive',
      });
    }
  };

  const copyAccessCode = (teacher: Teacher) => {
    navigator.clipboard.writeText(teacher.access_code);
    setCopiedId(teacher.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied!',
      description: `Access code for ${teacher.name} copied to clipboard.`,
    });
  };

  const getAssignedClasses = (teacherId: string) => {
    const teacherAssignments = assignments.filter(a => a.teacher_id === teacherId);
    return classes
      .filter(c => teacherAssignments.some(a => a.class_id === c.id))
      .map(c => c.name);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to access settings.
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

          <h1 className="text-2xl font-bold text-foreground">School Settings</h1>
          <p className="text-muted-foreground">Configure school information, teachers, and reports</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              Teachers
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <div className="max-w-2xl">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in space-y-6">
                {/* Logo */}
                <div className="space-y-3">
                  <Label>School Logo</Label>
                  <div className="flex items-center gap-6">
                    {logo ? (
                      <img
                        src={logo}
                        alt="School Logo"
                        className="h-20 w-20 rounded-xl object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                        <GraduationCap className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload className="h-4 w-4" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </div>
                </div>

                {/* School Name */}
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                  />
                </div>

                {/* Motto */}
                <div className="space-y-2">
                  <Label htmlFor="motto">School Motto</Label>
                  <Input
                    id="motto"
                    value={motto}
                    onChange={e => setMotto(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Academic Year & Term */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input
                      id="academicYear"
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      placeholder="e.g., 2024/2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term">Term</Label>
                    <Input
                      id="term"
                      value={term}
                      onChange={e => setTerm(e.target.value)}
                      placeholder="e.g., First Term"
                    />
                  </div>
                </div>

                {/* Total School Days */}
                <div className="space-y-2">
                  <Label htmlFor="totalSchoolDays">Total School Days for Term</Label>
                  <Input
                    id="totalSchoolDays"
                    type="number"
                    value={totalSchoolDays}
                    onChange={e => setTotalSchoolDays(e.target.value)}
                    placeholder="e.g., 64"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the total number of days students are expected to attend school for the term
                  </p>
                </div>

                {/* Next Term Begins */}
                <div className="space-y-2">
                  <Label htmlFor="nextTermBegins">Next Term Begins</Label>
                  <Input
                    id="nextTermBegins"
                    value={nextTermBegins}
                    onChange={e => setNextTermBegins(e.target.value)}
                    placeholder="e.g., January 7, 2026"
                  />
                  <p className="text-xs text-muted-foreground">
                    This date will appear on the report cards
                  </p>
                </div>

                {/* Contact Numbers */}
                <div className="space-y-2">
                  <Label htmlFor="contacts">Contact Numbers (comma separated)</Label>
                  <Input
                    id="contacts"
                    value={contacts}
                    onChange={e => setContacts(e.target.value)}
                    placeholder="e.g., 0557387992, 0545231646"
                  />
                </div>

                {/* Interest Options */}
                <div className="space-y-3">
                  <Label>Interest Options (for Class Teacher Reports)</Label>
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map((option) => (
                      <Badge key={option} variant="secondary" className="gap-1 pr-1">
                        {option}
                        <button
                          type="button"
                          onClick={() => removeInterestOption(option)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={e => setNewInterest(e.target.value)}
                      placeholder="Add new interest option"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterestOption())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addInterestOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Conduct Options */}
                <div className="space-y-3">
                  <Label>Conduct Options (for Class Teacher Reports)</Label>
                  <div className="flex flex-wrap gap-2">
                    {conductOptions.map((option) => (
                      <Badge key={option} variant="secondary" className="gap-1 pr-1">
                        {option}
                        <button
                          type="button"
                          onClick={() => removeConductOption(option)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newConduct}
                      onChange={e => setNewConduct(e.target.value)}
                      placeholder="Add new conduct option"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addConductOption())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addConductOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="w-full gap-2 gradient-primary text-primary-foreground"
                >
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Teacher Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Add teachers and assign them to classes. Each teacher gets a unique access code.
                  </p>
                </div>
                <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenTeacherDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="teacherName">Teacher Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="teacherName"
                            placeholder="e.g., Mr. John Mensah"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accessCode">Access Code</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="accessCode"
                              placeholder="Access code"
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                              className="pl-10 font-mono"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateAccessCode}
                          >
                            Generate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Teacher will use this code to login and access their assigned classes
                        </p>
                      </div>

                      {/* Class Assignments */}
                      <div className="space-y-3">
                        <Label>Assign Classes</Label>
                        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-background">
                          {classes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No classes available</p>
                          ) : (
                            classes.map((cls) => (
                              <div key={cls.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`class-${cls.id}`}
                                  checked={selectedClasses.includes(cls.id)}
                                  onCheckedChange={() => handleClassToggle(cls.id)}
                                />
                                <label
                                  htmlFor={`class-${cls.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {cls.name}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Teacher can only access Class Teacher Reports for assigned classes
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveTeacher}
                        disabled={savingTeacher}
                        className="w-full"
                      >
                        {savingTeacher ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Teachers Table */}
              <div className="rounded-xl border border-border bg-card shadow-sm">
                {teacherLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading teachers...</div>
                ) : teachers.length === 0 ? (
                  <div className="p-8 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-1">No Teachers Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add teachers to give them access to the Class Teacher Report system.
                    </p>
                    <Button onClick={() => handleOpenTeacherDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Teacher
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Access Code</TableHead>
                        <TableHead>Assigned Classes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium">{teacher.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                {teacher.access_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyAccessCode(teacher)}
                              >
                                {copiedId === teacher.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getAssignedClasses(teacher.id).length > 0 ? (
                                getAssignedClasses(teacher.id).map((cls) => (
                                  <Badge key={cls} variant="outline" className="text-xs">
                                    {cls}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">None assigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenTeacherDialog(teacher)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTeacher(teacher)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Teacher Confirmation */}
        <AlertDialog open={!!deleteTeacher} onOpenChange={() => setDeleteTeacher(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteTeacher?.name}</strong>? This will also remove all their class assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeacher}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
