import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
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

interface ClassItem {
  id: string;
  name: string;
  created_at: string;
}

interface SchoolInfo {
  id: string;
  name: string;
}

export default function ClassManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin, students } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteClass, setDeleteClass] = useState<ClassItem | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [targetSchool, setTargetSchool] = useState<SchoolInfo | null>(null);

  // Form state
  const [classNumber, setClassNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Get school ID from URL params (for super admin) or from context (for regular admin)
  const schoolIdFromParams = searchParams.get('school');

  useEffect(() => {
    checkAccessAndFetchData();
  }, [schoolIdFromParams, selectedSchool]);

  const checkAccessAndFetchData = async () => {
    setLoading(true);

    // Check if user is super admin
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (roleData) {
        setIsSuperAdmin(true);
        
        // If super admin and school ID is provided in URL
        if (schoolIdFromParams) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('id, name')
            .eq('id', schoolIdFromParams)
            .maybeSingle();

          if (schoolData) {
            setTargetSchool({ id: schoolData.id, name: schoolData.name });
            await fetchClasses(schoolData.id);
            return;
          }
        }
      }
    }

    // Fall back to regular admin behavior
    if (selectedSchool) {
      setTargetSchool({ id: selectedSchool.id, name: selectedSchool.name });
      await fetchClasses(selectedSchool.id);
    } else {
      setLoading(false);
    }
  };

  const fetchClasses = async (schoolId: string) => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');

    if (error) {
      console.error('Error fetching classes:', error);
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (classItem?: ClassItem) => {
    if (classItem) {
      setEditingClass(classItem);
      // Extract suffix from "Basic XYZ" (digits + optional letter)
      const match = classItem.name.match(/^Basic\s+(.+)$/i);
      setClassNumber(match ? match[1] : '');
    } else {
      setEditingClass(null);
      setClassNumber('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const raw = classNumber.trim().toUpperCase();
    if (!/^\d{1,2}[A-Z]?$/.test(raw)) {
      toast({
        title: 'Invalid Class',
        description: 'Enter a number (1-12) optionally followed by a letter, e.g. 1, 1A, 2B.',
        variant: 'destructive',
      });
      return;
    }
    const numPart = parseInt(raw);
    if (numPart < 1 || numPart > 12) {
      toast({
        title: 'Invalid Class Number',
        description: 'Number portion must be between 1 and 12.',
        variant: 'destructive',
      });
      return;
    }

    if (!targetSchool) {
      toast({
        title: 'Error',
        description: 'No school selected.',
        variant: 'destructive',
      });
      return;
    }

    const className = `Basic ${raw}`;
    setSaving(true);

    try {
      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update({ name: className })
          .eq('id', editingClass.id);

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Class Exists',
              description: `${className} already exists.`,
              variant: 'destructive',
            });
            setSaving(false);
            return;
          }
          throw error;
        }

        toast({
          title: 'Class Updated',
          description: `Class has been renamed to ${className}.`,
        });
      } else {
        // Create new class with school_id
        const { error } = await supabase
          .from('classes')
          .insert({ name: className, school_id: targetSchool.id });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Class Exists',
              description: `${className} already exists.`,
              variant: 'destructive',
            });
            setSaving(false);
            return;
          }
          throw error;
        }

        toast({
          title: 'Class Created',
          description: `${className} has been added.`,
        });
      }

      setDialogOpen(false);
      if (targetSchool) {
        fetchClasses(targetSchool.id);
      }
    } catch (error) {
      console.error('Error saving class:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the class.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteClass) return;

    // Check if class has students (only for regular admins with student data)
    if (!isSuperAdmin) {
      const classStudents = students.filter(s => 
        s.classLevel.toLowerCase().replace(/\s/g, '') === deleteClass.name.toLowerCase().replace(/\s/g, '')
      );

      if (classStudents.length > 0) {
        toast({
          title: 'Cannot Delete',
          description: `${deleteClass.name} has ${classStudents.length} students. Please remove them first.`,
          variant: 'destructive',
        });
        setDeleteClass(null);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deleteClass.id)
        .eq('school_id', targetSchool?.id || selectedSchool?.id || '');

      if (error) throw error;

      toast({
        title: 'Class Deleted',
        description: `${deleteClass.name} has been removed.`,
      });

      setDeleteClass(null);
      if (targetSchool) {
        fetchClasses(targetSchool.id);
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the class.',
        variant: 'destructive',
      });
    }
  };

  const getStudentCount = (className: string) => {
    if (isSuperAdmin) return null; // Super admin doesn't have student context
    // Convert "Basic 7" to "basic7" format to match classLevel
    const classId = className.toLowerCase().replace(/\s/g, '');
    return students.filter(s => s.classLevel === classId).length;
  };

  const handleBack = () => {
    if (isSuperAdmin && schoolIdFromParams) {
      navigate('/super-admin');
    } else {
      navigate('/dashboard');
    }
  };

  // Access check
  if (!isAdmin && !isSuperAdmin && !loading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to manage classes.
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
            onClick={handleBack}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {isSuperAdmin && schoolIdFromParams ? 'Back to Super Admin Dashboard' : 'Back to Dashboard'}
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Class Management</h1>
              <p className="text-muted-foreground">
                {targetSchool ? `Manage classes for ${targetSchool.name}` : 'Add and manage school classes'}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingClass ? 'Edit Class' : 'Add New Class'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="classNumber">Class</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-medium">Basic</span>
                      <Input
                        id="classNumber"
                        type="text"
                        maxLength={3}
                        placeholder="e.g. 1A"
                        value={classNumber}
                        onChange={(e) => setClassNumber(e.target.value.toUpperCase())}
                        className="w-28"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Number 1-12, optionally followed by a letter (e.g. 1, 1A, 2B)
                    </p>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Classes Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-1">No Classes Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add classes to organize your students.
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Class
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  {!isSuperAdmin && <TableHead>Students</TableHead>}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        {classItem.name}
                      </div>
                    </TableCell>
                    {!isSuperAdmin && (
                      <TableCell>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-sm">
                          {getStudentCount(classItem.name)} students
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {new Date(classItem.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(classItem)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteClass(classItem)}
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
        <AlertDialog open={!!deleteClass} onOpenChange={() => setDeleteClass(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Class?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteClass?.name}? This action cannot be undone.
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
