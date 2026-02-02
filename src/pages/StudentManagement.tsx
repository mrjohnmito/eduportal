import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types/school';
import { UserPlus, Pencil, Trash2, Upload, ChevronLeft, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface BulkStudent {
  name: string;
  classLevel: string;
  indexNumber?: string;
  isValid: boolean;
  error?: string;
}

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
  } = useSchool();

  const { selectedSchool } = useSelectedSchool();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Bulk upload state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<BulkStudent[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkClass, setBulkClass] = useState<string>('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newIndexNumber, setNewIndexNumber] = useState('');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [newAttendance, setNewAttendance] = useState<string>('');

  // Helper to convert class name to class_level format
  const toClassLevel = (name: string) => name.toLowerCase().replace(/\s+/g, '');

  // Fetch classes from database filtered by school_id
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool) return;

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', selectedSchool.id)
        .order('name');
      
      if (!error && data) {
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(toClassLevel(data[0].name));
        }
      }
    };
    fetchClasses();
  }, [selectedSchool?.id]);

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
    const classItem = classes.find(c => toClassLevel(c.name) === classId);
    return classItem?.name || classId;
  };

  // Bulk upload handlers
  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        // Skip header row and parse students
        const parsedStudents: BulkStudent[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = String(row[0] || '').trim();
          const indexNumber = String(row[1] || '').trim();

          if (!name) continue;

          parsedStudents.push({
            name,
            classLevel: bulkClass || selectedClass,
            indexNumber: indexNumber || undefined,
            isValid: name.length > 0 && name.length <= 100,
            error: name.length > 100 ? 'Name too long (max 100 chars)' : undefined,
          });
        }

        if (parsedStudents.length === 0) {
          toast({
            title: 'No Students Found',
            description: 'The file appears to be empty or has no valid data.',
            variant: 'destructive',
          });
          return;
        }

        setBulkStudents(parsedStudents);
        toast({
          title: 'File Parsed',
          description: `Found ${parsedStudents.length} students ready to import.`,
        });
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error',
          description: 'Failed to parse the file. Please check the format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    const validStudents = bulkStudents.filter(s => s.isValid);
    if (validStudents.length === 0) {
      toast({
        title: 'No Valid Students',
        description: 'Please fix the errors before importing.',
        variant: 'destructive',
      });
      return;
    }

    if (!bulkClass) {
      toast({
        title: 'Select Class',
        description: 'Please select a class for the students.',
        variant: 'destructive',
      });
      return;
    }

    setBulkUploading(true);
    let successCount = 0;

    for (const student of validStudents) {
      try {
        await addStudent({
          name: student.name,
          classLevel: bulkClass,
          indexNumber: student.indexNumber,
          attendanceDays: 0,
        });
        successCount++;
      } catch (error) {
        console.error('Error adding student:', student.name, error);
      }
    }

    setBulkUploading(false);
    setIsBulkDialogOpen(false);
    setBulkStudents([]);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }

    toast({
      title: 'Import Complete',
      description: `Successfully added ${successCount} of ${validStudents.length} students.`,
    });
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Student Name', 'Index Number (Optional)'],
      ['John Doe', 'STU001'],
      ['Jane Smith', 'STU002'],
      ['Example Student', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_upload_template.xlsx');
  };

  const clearBulkUpload = () => {
    setBulkStudents([]);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  const handleAddStudent = () => {
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter student name.',
        variant: 'destructive',
      });
      return;
    }

    addStudent({
      name: newName.trim(),
      classLevel: selectedClass,
      indexNumber: newIndexNumber.trim() || undefined,
      photo: newPhoto || undefined,
      attendanceDays: newAttendance ? parseInt(newAttendance) : 0,
    });

    toast({
      title: 'Student Added',
      description: `${newName} has been added to ${getClassName(selectedClass)}.`,
    });

    setNewName('');
    setNewIndexNumber('');
    setNewPhoto('');
    setNewAttendance('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateStudent = () => {
    if (!editingStudent) return;

    updateStudent(editingStudent.id, {
      name: newName.trim(),
      indexNumber: newIndexNumber.trim() || undefined,
      photo: newPhoto || editingStudent.photo,
      attendanceDays: newAttendance ? parseInt(newAttendance) : editingStudent.attendanceDays,
    });

    toast({
      title: 'Student Updated',
      description: `${newName} has been updated.`,
    });

    setNewName('');
    setNewIndexNumber('');
    setNewPhoto('');
    setNewAttendance('');
    setEditingStudent(null);
  };

  const handleDeleteStudent = (student: Student) => {
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
      deleteStudent(student.id);
      toast({
        title: 'Student Deleted',
        description: `${student.name} has been removed.`,
      });
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setNewName(student.name);
    setNewIndexNumber(student.indexNumber || '');
    setNewPhoto(student.photo || '');
    setNewAttendance(student.attendanceDays?.toString() || '0');
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
              <Dialog open={isBulkDialogOpen} onOpenChange={(open) => {
                setIsBulkDialogOpen(open);
                if (!open) clearBulkUpload();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Students</DialogTitle>
                    <DialogDescription>
                      Upload an Excel or CSV file with student names. Download the template to see the required format.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Class Selection */}
                    <div className="space-y-2">
                      <Label>Select Class for Import</Label>
                      <Select value={bulkClass} onValueChange={setBulkClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(cls => (
                            <SelectItem key={cls.id} value={toClassLevel(cls.name)}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label>Upload File</Label>
                      <div className="flex gap-2">
                        <input
                          ref={bulkFileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleBulkFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => bulkFileInputRef.current?.click()}
                          className="gap-2 flex-1"
                        >
                          <Upload className="h-4 w-4" />
                          Choose File (.xlsx, .csv)
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={downloadTemplate}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Template
                        </Button>
                      </div>
                    </div>

                    {/* Preview Table */}
                    {bulkStudents.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Preview ({bulkStudents.length} students)</Label>
                          <Button variant="ghost" size="sm" onClick={clearBulkUpload}>
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Index</TableHead>
                                <TableHead className="w-12">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bulkStudents.map((student, index) => (
                                <TableRow key={index} className={!student.isValid ? 'bg-destructive/5' : ''}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell className="font-medium">{student.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{student.indexNumber || '—'}</TableCell>
                                  <TableCell>
                                    {student.isValid ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <div className="flex items-center gap-1" title={student.error}>
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {bulkStudents.some(s => !s.isValid) && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Some students have validation errors and won't be imported.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Import Button */}
                    <Button
                      onClick={handleBulkImport}
                      disabled={bulkStudents.length === 0 || !bulkClass || bulkUploading}
                      className="w-full gradient-primary text-primary-foreground"
                    >
                      {bulkUploading ? 'Importing...' : `Import ${bulkStudents.filter(s => s.isValid).length} Students`}
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
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={toClassLevel(cls.name)}>
                            {cls.name}
                          </SelectItem>
                        ))}
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
                    <Label htmlFor="attendance">Days Attended (Optional)</Label>
                    <Input
                      id="attendance"
                      type="number"
                      placeholder="Enter attendance days"
                      value={newAttendance}
                      onChange={e => setNewAttendance(e.target.value)}
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
          {classes.map(cls => {
            const classKey = toClassLevel(cls.name);
            return (
              <Button
                key={cls.id}
                variant={selectedClass === classKey ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedClass(classKey)}
                className={cn(
                  selectedClass === classKey && 'bg-primary hover:bg-primary/90'
                )}
              >
                {cls.name} ({students.filter(s => s.classLevel === classKey).length})
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
                                <Label htmlFor="edit-attendance">Days Attended</Label>
                                <Input
                                  id="edit-attendance"
                                  type="number"
                                  value={newAttendance}
                                  onChange={e => setNewAttendance(e.target.value)}
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
