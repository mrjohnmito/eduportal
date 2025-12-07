import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { ClassLevel } from '@/types/school';
import { Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ClassCardProps {
  classLevel: ClassLevel;
  name: string;
}

export function ClassCard({ classLevel, name }: ClassCardProps) {
  const { getStudentsByClass } = useSchool();
  const students = getStudentsByClass(classLevel);
  const studentCount = students.length;

  const colorStyles = {
    basic7: 'bg-basic7 hover:bg-basic7/90',
    basic8: 'bg-basic8 hover:bg-basic8/90',
    basic9: 'bg-basic9 hover:bg-basic9/90',
  };

  return (
    <Link to={`/class/${classLevel}`}>
      <Card className={`${colorStyles[classLevel]} text-white border-0 transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
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
