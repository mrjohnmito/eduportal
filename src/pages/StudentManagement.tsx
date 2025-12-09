import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types/school';
import { UserPlus, Pencil, Trash2, Upload, ChevronLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ClassItem {
  id: string;
  name: string;
}

export default function StudentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    isAdmin,
    refreshData,
  } = useSchool();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newIndexNumber, setNewIndexNumber] = useState('');
  const [newPhoto, setNewPhoto] = useState<string>('');
  
  // Bulk upload state
  const [bulkNames, setBulkNames] = useState('');
  const [bulkClass, setBulkClass] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Fetch classes from database
  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          const classId = data[0].name.toLowerCase().replace(/\s/g, '');
          setSelectedClass(classId);
        }
      }
    };
    fetchClasses();
  }, []);

  const filteredStudents = students.filter(s => s.classLevel === selectedClass);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getClassName = (classId: string) => {
    const classItem = classes.find(c => c.name.toLowerCase().replace(/\s/g, '') === classId);
    return classItem?.name || classId;
  };

  const handleAddStudent = async () => {
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter student name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addStudent({
        name: newName.trim(),
        classLevel: selectedClass as any,
        indexNumber: newIndexNumber.trim() || undefined,
        photo: newPhoto || undefined,
      });

      toast({
        title: 'Student Added',
        description: `${newName} has been added to ${getClassName(selectedClass)}.`,
      });

      setNewName('');
      setNewIndexNumber('');
      setNewPhoto('');
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add student.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkNames.trim() || !bulkClass) {
      toast({
        title: 'Error',
        description: 'Please enter student names and select a class.',
        variant: 'destructive',
      });
      return;
    }

    const names = bulkNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid names found.',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkUploading(true);

    try {
      let successCount = 0;
      for (const name of names) {
        await addStudent({
          name,
          classLevel: bulkClass as any,
        });
        successCount++;
      }

      toast({
        title: 'Bulk Upload Complete',
        description: `Successfully added ${successCount} students to ${getClassName(bulkClass)}.`,
      });

      setBulkNames('');
      setBulkClass('');
      setIsBulkDialogOpen(false);
      await refreshData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Some students could not be added.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    try {
      await updateStudent(editingStudent.id, {
        name: newName.trim(),
        indexNumber: newIndexNumber.trim() || undefined,
        photo: newPhoto || editingStudent.photo,
      });

      toast({
        title: 'Student Updated',
        description: `${newName} has been updated.`,
      });

      setNewName('');
      setNewIndexNumber('');
      setNewPhoto('');
      setEditingStudent(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update student.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
      try {
        await deleteStudent(student.id);
        toast({
          title: 'Student Deleted',
          description: `${student.name} has been removed.`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete student.',
          variant: 'destructive',
        });
      }
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setNewName(student.name);
    setNewIndexNumber(student.indexNumber || '');
    setNewPhoto(student.photo || '');
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to manage students.
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
        <div className="mb-6 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
              <p className="text-muted-foreground">Add, edit, and manage student records</p>
            </div>

            <div className="flex gap-2">
              {/* Bulk Upload Dialog */}
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Students</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-class">Select Class</Label>
                      <Select value={bulkClass} onValueChange={setBulkClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(classItem => {
                            const classId = classItem.name.toLowerCase().replace(/\s/g, '');
                            return (
                              <SelectItem key={classItem.id} value={classId}>
                                {classItem.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-names">Student Names (one per line)</Label>
                      <Textarea
                        id="bulk-names"
                        placeholder="John Doe&#10;Jane Smith&#10;Michael Brown"
                        value={bulkNames}
                        onChange={e => setBulkNames(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter each student name on a new line
                      </p>
                    </div>
                    <Button 
                      onClick={handleBulkUpload} 
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={isBulkUploading}
                    >
                      {isBulkUploading ? 'Uploading...' : `Upload ${bulkNames.split('\n').filter(n => n.trim()).length} Students`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add Single Student Dialog */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 gradient-primary text-primary-foreground">
                    <UserPlus className="h-4 w-4" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Student Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter full name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class">Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(classItem => {
                            const classId = classItem.name.toLowerCase().replace(/\s/g, '');
                            return (
                              <SelectItem key={classItem.id} value={classId}>
                                {classItem.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="index">Index Number (Optional)</Label>
                      <Input
                        id="index"
                        placeholder="Enter index number"
                        value={newIndexNumber}
                        onChange={e => setNewIndexNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photo">Photo (Optional)</Label>
                      <div className="flex items-center gap-4">
                        {newPhoto && (
                          <img
                            src={newPhoto}
                            alt="Preview"
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      </div>
                    </div>
                    <Button onClick={handleAddStudent} className="w-full gradient-primary text-primary-foreground">
                      Add Student
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Class Filter */}
        <div className="mb-6 flex flex-wrap gap-2 animate-fade-in">
          {classes.map(classItem => {
            const classId = classItem.name.toLowerCase().replace(/\s/g, '');
            const count = students.filter(s => s.classLevel === classId).length;
            return (
              <Button
                key={classItem.id}
                variant={selectedClass === classId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedClass(classId)}
                className={cn(
                  selectedClass === classId && 'bg-primary hover:bg-primary/90'
                )}
              >
                {classItem.name} ({count})
              </Button>
            );
          })}
        </div>

        {/* Students Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Index Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No students in this class yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      {student.photo ? (
                        <img
                          src={student.photo}
                          alt={student.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.indexNumber || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={editingStudent?.id === student.id} onOpenChange={(open) => !open && setEditingStudent(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(student)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Student</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Student Name</Label>
                                <Input
                                  id="edit-name"
                                  value={newName}
                                  onChange={e => setNewName(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-index">Index Number</Label>
                                <Input
                                  id="edit-index"
                                  value={newIndexNumber}
                                  onChange={e => setNewIndexNumber(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Photo</Label>
                                <div className="flex items-center gap-4">
                                  {(newPhoto || editingStudent?.photo) && (
                                    <img
                                      src={newPhoto || editingStudent?.photo}
                                      alt="Preview"
                                      className="h-16 w-16 rounded-full object-cover"
                                    />
                                  )}
                                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                                    <Upload className="h-4 w-4" />
                                    Change Photo
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handlePhotoUpload}
                                    />
                                  </label>
                                </div>
                              </div>
                              <Button onClick={handleUpdateStudent} className="w-full">
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
