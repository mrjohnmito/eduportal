import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ClassCardProps {
  classLevel: string;
  name: string;
}

// Generate a consistent color based on class name
function getClassColor(className: string): string {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-fuchsia-500 to-fuchsia-600',
    'from-lime-500 to-lime-600',
    'from-orange-500 to-orange-600',
    'from-teal-500 to-teal-600',
  ];
  
  // Simple hash based on string
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function ClassCard({ classLevel, name }: ClassCardProps) {
  const { getStudentsByClass } = useSchool();
  const students = getStudentsByClass(classLevel as any);
  const studentCount = students.length;

  const gradientColor = getClassColor(name);

  return (
    <Link to={`/class/${classLevel}`}>
      <Card className={`bg-gradient-to-br ${gradientColor} text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{name}</h3>
                <p className="text-white/80 text-sm">Click to manage scores</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xl font-bold">{studentCount}</span>
                <p className="text-xs text-white/80">students</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
