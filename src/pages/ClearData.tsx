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
import { CLASS_LEVELS, ClassLevel } from '@/types/school';
import { useSchoolSubjects } from '@/hooks/useSchoolSubjects';
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

export default function ClearData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearSubjectData, isAdmin } = useSchool();

  const [selectedClass, setSelectedClass] = useState<ClassLevel | ''>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    if (!selectedClass || !selectedSubject) return;

    clearSubjectData(selectedClass, selectedSubject);
    toast({
      title: 'Data Cleared',
      description: `All ${selectedSubject} scores for ${CLASS_LEVELS.find(c => c.id === selectedClass)?.name} have been deleted.`,
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
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(subject => (
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
                <strong>{CLASS_LEVELS.find(c => c.id === selectedClass)?.name}</strong>.
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
