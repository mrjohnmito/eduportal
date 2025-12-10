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
    'bg-emerald-500 hover:bg-emerald-600',
    'bg-blue-500 hover:bg-blue-600',
    'bg-purple-500 hover:bg-purple-600',
    'bg-amber-500 hover:bg-amber-600',
    'bg-rose-500 hover:bg-rose-600',
    'bg-cyan-500 hover:bg-cyan-600',
    'bg-indigo-500 hover:bg-indigo-600',
    'bg-teal-500 hover:bg-teal-600',
    'bg-orange-500 hover:bg-orange-600',
    'bg-pink-500 hover:bg-pink-600',
  ];
  
  // Generate a hash from the class name
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function ClassCard({ classLevel, name }: ClassCardProps) {
  const { getStudentsByClass } = useSchool();
  const students = getStudentsByClass(classLevel);
  const studentCount = students.length;

  const colorClass = getClassColor(name);

  return (
    <Link to={`/class/${classLevel}`}>
      <Card className={`${colorClass} text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
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
