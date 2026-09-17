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
  Plus,
  Edit2,
  Trash2,
  User,
  Key,
  Copy,
  Check,
} from 'lucide-react';
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

export default function TeacherManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useSchool();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { selectedSchool } = useSelectedSchool();

  const fetchData = async () => {
    if (!selectedSchool) {
      setLoading(false);
      return;
    }

    // Fetch teachers filtered by school_id
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', selectedSchool.id)
      .order('name');

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
    } else {
      setTeachers(teachersData || []);
    }

    // Fetch classes filtered by school_id
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', selectedSchool.id)
      .order('name');

    if (classesError) {
      console.error('Error fetching classes:', classesError);
    } else {
      setClasses(classesData || []);
    }

    // Fetch assignments filtered by school_id
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('teacher_class_assignments')
      .select('teacher_id, class_id')
      .eq('school_id', selectedSchool.id);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
    } else {
      setAssignments(assignmentsData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
  };

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setName(teacher.name);
      setAccessCode(teacher.access_code);
      // Get assigned classes for this teacher
      const teacherAssignments = assignments
        .filter(a => a.teacher_id === teacher.id)
        .map(a => a.class_id);
      setSelectedClasses(teacherAssignments);
    } else {
      setEditingTeacher(null);
      setName('');
      setAccessCode('');
      setSelectedClasses([]);
      generateAccessCode();
    }
    setDialogOpen(true);
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
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

    setSaving(true);

    try {
      let teacherId = editingTeacher?.id;

      if (editingTeacher) {
        // Update existing teacher
        const { error } = await supabase
          .from('teachers')
          .update({ name: name.trim(), access_code: accessCode.trim() })
          .eq('id', editingTeacher.id);

        if (error) throw error;
      } else {
        // Create new teacher with school_id
        if (!selectedSchool) {
          toast({
            title: 'Error',
            description: 'No school selected.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        const { data, error } = await supabase
          .from('teachers')
          .insert({ name: name.trim(), access_code: accessCode.trim(), school_id: selectedSchool.id })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Duplicate Access Code',
              description: 'This access code is already in use. Please generate a new one.',
              variant: 'destructive',
            });
            setSaving(false);
            return;
          }
          throw error;
        }
        teacherId = data.id;
      }

      // Update class assignments
      if (teacherId) {
        // Delete existing assignments
        const { error: deleteAssignmentsError } = await supabase
          .from('teacher_class_assignments')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('school_id', selectedSchool?.id || '');

        if (deleteAssignmentsError) throw deleteAssignmentsError;

        // Insert new assignments with school_id
        if (selectedClasses.length > 0 && selectedSchool) {
          const assignmentsToInsert = selectedClasses.map(classId => ({
            teacher_id: teacherId,
            class_id: classId,
            school_id: selectedSchool.id,
          }));

          const { error: assignError } = await supabase
            .from('teacher_class_assignments')
            .insert(assignmentsToInsert);

          if (assignError) throw assignError;
        }
      }

      toast({
        title: editingTeacher ? 'Teacher Updated' : 'Teacher Created',
        description: editingTeacher
          ? `${name} has been updated successfully.`
          : `${name} has been added with access code: ${accessCode}`,
      });

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving teacher:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the teacher.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTeacher) return;

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', deleteTeacher.id)
        .eq('school_id', selectedSchool?.id || '');

      if (error) throw error;

      toast({
        title: 'Teacher Deleted',
        description: `${deleteTeacher.name} has been removed.`,
      });

      setDeleteTeacher(null);
      fetchData();
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
              Please login as admin to manage teachers.
            </p>
            <Button onClick={() => navigate('/')} className="mt-4">
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Teacher Management</h1>
              <p className="text-muted-foreground">Create and manage teacher access codes and class assignments</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                      Teacher will use this code to access the dashboard
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
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading teachers...</div>
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-1">No Teachers Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add teachers to give them access to the score entry system.
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
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
                  <TableHead>Created</TableHead>
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
                          getAssignedClasses(teacher.id).map((className) => (
                            <span
                              key={className}
                              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {className}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No classes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(teacher.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(teacher)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
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

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTeacher} onOpenChange={() => setDeleteTeacher(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTeacher?.name}? They will no longer
                be able to access the dashboard with their access code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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