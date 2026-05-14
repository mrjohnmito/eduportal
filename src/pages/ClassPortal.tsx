import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { useSchoolSubjects } from '@/hooks/useSchoolSubjects';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookOpen, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const subjectIcons: Record<string, string> = {
  'Mathematics': '📐',
  'English Language': '📝',
  'Science': '🔬',
  'Social Studies': '🌍',
  'RME': '📖',
  'Career Technology': '💼',
  'French': 'FR',
  'Dangme': '👤',
  'ICT': '💻',
  'Creative Art': '🎨',
};

// Vibrant background colors for subject cards
const subjectColors: Record<string, string> = {
  'Mathematics': 'from-blue-500 to-blue-600',
  'Science': 'from-green-500 to-green-600',
  'RME': 'from-purple-500 to-purple-600',
  'Social Studies': 'from-orange-400 to-orange-500',
  'Career Technology': 'from-teal-500 to-teal-600',
  'French': 'from-cyan-600 to-cyan-700',
  'Dangme': 'from-orange-500 to-orange-600',
  'ICT': 'from-cyan-500 to-cyan-600',
  'Creative Art': 'from-pink-500 to-pink-600',
  'English Language': 'from-indigo-500 to-indigo-600',
};

export default function ClassPortal() {
  const { classLevel } = useParams<{ classLevel: string }>();
  const navigate = useNavigate();
  const { getStudentsByClass, getScoresByClassAndSubject } = useSchool();
  const { selectedSchool } = useSelectedSchool();
  const [classInfo, setClassInfo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { subjects } = useSchoolSubjects();

  useEffect(() => {
    const fetchClass = async () => {
      if (!classLevel || !selectedSchool) {
        navigate('/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

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
  }, [classLevel, navigate, selectedSchool]);

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

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-purple-50/30">
        <div className="container py-6">
          {/* Header */}
          <div className="mb-6 animate-fade-in flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {classInfo.name}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{students.length} Students</span>
              </div>
            </div>
          </div>

          {/* No Students Warning */}
          {students.length === 0 && (
            <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 animate-fade-in">
              <p className="text-warning font-medium text-sm">
                No students registered in this class yet. 
                <Link to="/students" className="ml-1 underline hover:no-underline">
                  Add students first
                </Link>
              </p>
            </div>
          )}

          {/* Subjects Header */}
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Subjects</h2>
          </div>

          {/* Subjects Grid - Colorful Cards */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {subjects.map((subject, index) => {
              const gradient = subjectColors[subject] || 'from-gray-500 to-gray-600';
              const icon = subjectIcons[subject] || '📚';
              const isTextIcon = icon.length <= 2 && !icon.match(/[\u{1F300}-\u{1F9FF}]/u);
              
              return (
                <Link
                  key={subject}
                  to={`/class/${classLevel}/subject/${encodeURIComponent(subject)}`}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl p-4 h-32 transition-all duration-300',
                    `bg-gradient-to-br ${gradient}`,
                    'hover:scale-[1.03] hover:shadow-xl animate-fade-in cursor-pointer'
                  )}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* Decorative circle in top-right */}
                  <div className="absolute top-2 right-2 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    {isTextIcon ? (
                      <span className="text-white font-bold text-sm">{icon}</span>
                    ) : (
                      <span className="text-lg">{icon}</span>
                    )}
                  </div>

                  {/* Background decoration */}
                  <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
                  
                  {/* Subject name at bottom */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-medium text-white text-sm leading-tight">
                      {subject}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
