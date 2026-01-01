import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ClassCardProps {
  classLevel: string;
  name: string;
}

// Generate gradient colors based on class name
function getClassGradient(className: string): { gradient: string; shadow: string } {
  const gradients = [
    { gradient: 'from-blue-500 via-blue-600 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { gradient: 'from-emerald-500 via-teal-500 to-cyan-600', shadow: 'shadow-emerald-500/30' },
    { gradient: 'from-purple-500 via-fuchsia-500 to-pink-600', shadow: 'shadow-purple-500/30' },
    { gradient: 'from-amber-500 via-orange-500 to-red-500', shadow: 'shadow-amber-500/30' },
    { gradient: 'from-rose-500 via-pink-500 to-fuchsia-600', shadow: 'shadow-rose-500/30' },
    { gradient: 'from-cyan-500 via-blue-500 to-indigo-600', shadow: 'shadow-cyan-500/30' },
    { gradient: 'from-indigo-500 via-purple-500 to-pink-600', shadow: 'shadow-indigo-500/30' },
    { gradient: 'from-teal-500 via-emerald-500 to-green-600', shadow: 'shadow-teal-500/30' },
    { gradient: 'from-orange-500 via-red-500 to-rose-600', shadow: 'shadow-orange-500/30' },
    { gradient: 'from-pink-500 via-rose-500 to-red-600', shadow: 'shadow-pink-500/30' },
  ];
  
  // Generate a hash from the class name
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return gradients[Math.abs(hash) % gradients.length];
}

// Extract number from class name (e.g., "Basic 7" -> "7")
function getClassNumber(name: string): string {
  const match = name.match(/\d+/);
  return match ? match[0] : name.charAt(0);
}

export function ClassCard({ classLevel, name }: ClassCardProps) {
  const { getStudentsByClass } = useSchool();
  const students = getStudentsByClass(classLevel);
  const studentCount = students.length;

  const { gradient, shadow } = getClassGradient(name);
  const classNumber = getClassNumber(name);

  return (
    <Link to={`/class/${classLevel}`}>
      <Card 
        className={`bg-gradient-to-r ${gradient} text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-xl ${shadow} overflow-hidden`}
      >
        <CardContent className="p-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Large class number */}
              <div className="flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl text-3xl font-bold">
                {classNumber}
              </div>
              <div>
                <h3 className="text-lg font-bold">{name}</h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium">
                {studentCount} students
              </div>
              <ChevronRight className="h-5 w-5 text-white/80" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
