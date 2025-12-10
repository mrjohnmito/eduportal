import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { SUBJECTS } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen } from 'lucide-react';
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

// Generate consistent colors based on class name
function getClassColors(className: string) {
  const colorSets = [
    { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
    { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
    { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
    { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
    { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600' },
    { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-600', gradient: 'from-cyan-500 to-cyan-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
    { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-600', gradient: 'from-teal-500 to-teal-600' },
  ];
  
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colorSets[Math.abs(hash) % colorSets.length];
}

export default function ClassPortal() {
  const { classLevel } = useParams<{ classLevel: string }>();
  const navigate = useNavigate();
  const { getStudentsByClass, getScoresByClassAndSubject } = useSchool();
  const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
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
        .order('name');

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      // Find class by matching the classLevel (e.g., "basic7" matches "Basic 7")
      const foundClass = data.find(c => 
        c.name.toLowerCase().replace(/\s/g, '') === classLevel
      );

      if (!foundClass) {
        navigate('/dashboard');
        return;
      }

      setClassInfo({ id: foundClass.id, name: foundClass.name });
      setLoading(false);
    };

    fetchClass();
  }, [classLevel, navigate]);

  if (loading || !classInfo || !classLevel) {
    return (
      <MainLayout>
        <div className="container py-8 text-center text-muted-foreground">
          Loading...
        </div>
      </MainLayout>
    );
  }

  const students = getStudentsByClass(classLevel);
  const styles = getClassColors(classInfo.name);

  const getSubjectProgress = (subject: string) => {
    const scores = getScoresByClassAndSubject(classLevel, subject);
    if (students.length === 0) return 0;
    return Math.round((scores.length / students.length) * 100);
  };

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
              <BookOpen className="h-7 w-7 text-white" />
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
