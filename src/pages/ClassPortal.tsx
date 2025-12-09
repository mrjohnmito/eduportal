import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { SUBJECTS } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const subjectIcons: Record<string, string> = {
  'Mathematics': '📐',
  'English Language': '📝',
  'Science': '🔬',
  'Social Studies': '🌍',
  'RME': '🙏',
  'Career Technology': '💼',
  'French': '🇫🇷',
  'Dangme': '🗣️',
  'ICT': '💻',
  'Creative Art': '🎨',
};

interface ClassItem {
  id: string;
  name: string;
}

export default function ClassPortal() {
  const { classLevel } = useParams<{ classLevel: string }>();
  const navigate = useNavigate();
  const { getStudentsByClass, getScoresByClassAndSubject } = useSchool();
  const [classInfo, setClassInfo] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClass = async () => {
      if (!classLevel) {
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classLevel)
        .single();

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      setClassInfo(data);
      setLoading(false);
    };

    fetchClass();
  }, [classLevel, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!classInfo) {
    return null;
  }

  const students = getStudentsByClass(classLevel!);

  const getSubjectProgress = (subject: string) => {
    const scores = getScoresByClassAndSubject(classLevel!, subject);
    if (students.length === 0) return 0;
    return Math.round((scores.length / students.length) * 100);
  };

  // Generate dynamic color based on class name
  const getClassColor = (name: string) => {
    const colors = [
      { gradient: 'from-basic7 to-basic7/80', border: 'border-basic7/30' },
      { gradient: 'from-basic8 to-basic8/80', border: 'border-basic8/30' },
      { gradient: 'from-basic9 to-basic9/80', border: 'border-basic9/30' },
      { gradient: 'from-purple-500 to-purple-400', border: 'border-purple-500/30' },
      { gradient: 'from-pink-500 to-pink-400', border: 'border-pink-500/30' },
      { gradient: 'from-indigo-500 to-indigo-400', border: 'border-indigo-500/30' },
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const styles = getClassColor(classInfo.name);

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

          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl',
              `bg-gradient-to-br ${styles.gradient}`
            )}>
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {classInfo.name} Portal
              </h1>
              <p className="text-muted-foreground">
                {students.length} students enrolled • Select a subject to enter scores
              </p>
            </div>
          </div>
        </div>

        {/* No Students Warning */}
        {students.length === 0 && (
          <div className="mb-8 rounded-xl border border-warning/30 bg-warning/10 p-6 animate-fade-in">
            <p className="text-warning font-medium">
              No students registered in this class yet. 
              <Link to="/students" className="ml-1 underline hover:no-underline">
                Add students first
              </Link>
            </p>
          </div>
        )}

        {/* Subjects Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SUBJECTS.map((subject, index) => {
            const progress = getSubjectProgress(subject);
            return (
              <Link
                key={subject}
                to={`/class/${classInfo.id}/subject/${encodeURIComponent(subject)}`}
                className={cn(
                  'group relative overflow-hidden rounded-xl border-2 p-5 transition-all duration-300',
                  'bg-card shadow-sm hover:shadow-lg',
                  styles.border,
                  'hover:scale-[1.02] animate-fade-in'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Background decoration */}
                <div className={cn(
                  'absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 transition-transform duration-500',
                  `bg-gradient-to-br ${styles.gradient}`,
                  'group-hover:scale-150'
                )} />

                {/* Content */}
                <div className="relative z-10">
                  <span className="text-2xl mb-2 block">{subjectIcons[subject] || '📚'}</span>
                  <h3 className="font-medium text-foreground text-sm leading-tight mb-2">
                    {subject}
                  </h3>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        `bg-gradient-to-r ${styles.gradient}`
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress}% complete
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
