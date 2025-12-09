import { Link, useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { SUBJECTS, CLASS_LEVELS, ClassLevel } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function ClassPortal() {
  const { classLevel } = useParams<{ classLevel: ClassLevel }>();
  const navigate = useNavigate();
  const { getStudentsByClass, getScoresByClassAndSubject } = useSchool();

  if (!classLevel || !CLASS_LEVELS.find(c => c.id === classLevel)) {
    navigate('/');
    return null;
  }

  const classInfo = CLASS_LEVELS.find(c => c.id === classLevel)!;
  const students = getStudentsByClass(classLevel);

  const getSubjectProgress = (subject: string) => {
    const scores = getScoresByClassAndSubject(classLevel, subject);
    if (students.length === 0) return 0;
    return Math.round((scores.length / students.length) * 100);
  };

  const colorStyles = {
    basic7: {
      bg: 'bg-basic7-light',
      border: 'border-basic7/30',
      text: 'text-basic7',
      gradient: 'from-basic7 to-basic7/80',
    },
    basic8: {
      bg: 'bg-basic8-light',
      border: 'border-basic8/30',
      text: 'text-basic8',
      gradient: 'from-basic8 to-basic8/80',
    },
    basic9: {
      bg: 'bg-basic9-light',
      border: 'border-basic9/30',
      text: 'text-basic9',
      gradient: 'from-basic9 to-basic9/80',
    },
  };

  const styles = colorStyles[classLevel];

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
                to={`/class/${classLevel}/subject/${encodeURIComponent(subject)}`}
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
