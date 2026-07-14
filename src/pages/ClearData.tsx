import { useEffect, useState } from 'react';
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
import { CLASS_LEVELS, ClassLevel, SUBJECTS } from '@/types/school';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react';
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

interface ClassOption {
  id: string;
  name: string;
  classKey: string;
}

export default function ClearData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearSubjectData, isAdmin } = useSchool();
  const { selectedSchool } = useSelectedSchool();

  const [selectedClass, setSelectedClass] = useState<ClassLevel | ''>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([...SUBJECTS]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool?.id) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      setLoadingClasses(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', selectedSchool.id)
        .order('name');

      if (!error && data) {
        const formattedClasses = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          classKey: item.name.toLowerCase().replace(/\s/g, ''),
        }));
        setClasses(formattedClasses);
      } else {
        setClasses([]);
      }
      setLoadingClasses(false);
    };

    fetchClasses();
  }, [selectedSchool?.id]);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSubject('');
      return;
    }

    const loadSubjectsForClass = async () => {
      if (!selectedSchool?.id) {
        setSubjects([...SUBJECTS]);
        setSelectedSubject('');
        return;
      }

      const selectedClassName = classes.find((c) => c.classKey === selectedClass)?.name;
      if (!selectedClassName) {
        setSubjects([...SUBJECTS]);
        setSelectedSubject('');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('scores' as any)
          .select('subject')
          .eq('school_id', selectedSchool.id)
          .eq('class_level', selectedClass);

        if (error) throw error;

        const uniqueSubjects = Array.from(new Set((data || []).map((item: any) => item.subject).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        setSubjects(uniqueSubjects.length > 0 ? uniqueSubjects : [...SUBJECTS]);
      } catch (error) {
        console.error('Error loading subjects for class:', error);
        setSubjects([...SUBJECTS]);
      }

      setSelectedSubject('');
    };

    loadSubjectsForClass();
  }, [selectedClass, selectedSchool?.id, classes]);

  const handleClear = () => {
    if (!selectedClass || !selectedSubject) return;

    clearSubjectData(selectedClass, selectedSubject);
    toast({
      title: 'Data Cleared',
      description: `All ${selectedSubject} scores for ${classes.find(c => c.classKey === selectedClass)?.name || selectedClass} have been deleted.`,
    });
    setShowConfirm(false);
    setSelectedClass('');
    setSelectedSubject('');
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to clear data.
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

          <h1 className="text-2xl font-bold text-foreground">Clear Data</h1>
          <p className="text-muted-foreground">Remove scores for a specific class and subject</p>
        </div>

        {/* Clear Form */}
        <div className="max-w-md">
          <div className="rounded-xl border border-destructive/30 bg-card p-6 shadow-sm animate-fade-in space-y-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">This action cannot be undone!</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Class</label>
              <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingClasses ? 'Loading classes...' : 'Choose a class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.length > 0 ? classes.map(classItem => (
                    <SelectItem key={classItem.id} value={classItem.classKey}>
                      {classItem.name}
                    </SelectItem>
                  )) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {loadingClasses ? 'Loading classes...' : 'No classes found'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedClass ? 'Choose a subject' : 'Select a class first'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedClass || !selectedSubject}
              variant="destructive"
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Data Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to delete all <strong>{selectedSubject}</strong> scores for{' '}
                <strong>{classes.find(c => c.classKey === selectedClass)?.name || selectedClass}</strong>.
                <br /><br />
                This action cannot be undone. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
