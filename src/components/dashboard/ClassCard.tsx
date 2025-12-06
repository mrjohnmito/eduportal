import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { ClassLevel } from '@/types/school';
import { Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassCardProps {
  classLevel: ClassLevel;
  name: string;
  colorClass: string;
}

export function ClassCard({ classLevel, name, colorClass }: ClassCardProps) {
  const { getStudentsByClass } = useSchool();
  const [isHovered, setIsHovered] = useState(false);
  
  const students = getStudentsByClass(classLevel);
  const studentCount = students.length;

  const colorStyles = {
    basic7: {
      bg: 'bg-basic7-light',
      border: 'border-basic7/30',
      text: 'text-basic7',
      gradient: 'from-basic7 to-basic7/80',
      hover: 'hover:border-basic7',
      shadow: 'hover:shadow-basic7/20',
    },
    basic8: {
      bg: 'bg-basic8-light',
      border: 'border-basic8/30',
      text: 'text-basic8',
      gradient: 'from-basic8 to-basic8/80',
      hover: 'hover:border-basic8',
      shadow: 'hover:shadow-basic8/20',
    },
    basic9: {
      bg: 'bg-basic9-light',
      border: 'border-basic9/30',
      text: 'text-basic9',
      gradient: 'from-basic9 to-basic9/80',
      hover: 'hover:border-basic9',
      shadow: 'hover:shadow-basic9/20',
    },
  };

  const styles = colorStyles[classLevel];

  return (
    <Link
      to={`/class/${classLevel}`}
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300',
        'bg-card shadow-md hover:shadow-xl',
        styles.border,
        styles.hover,
        styles.shadow,
        isHovered && 'scale-[1.02]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background decoration */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 transition-transform duration-500',
          `bg-gradient-to-br ${styles.gradient}`,
          isHovered && 'scale-150'
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className={cn(
          'mb-4 inline-flex items-center justify-center rounded-lg p-3',
          styles.bg
        )}>
          <Users className={cn('h-6 w-6', styles.text)} />
        </div>

        <h3 className="mb-2 text-xl font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">Click to manage scores</p>

        {/* Student count badge */}
        <div className={cn(
          'absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
          styles.bg,
          styles.text
        )}>
          <span>{studentCount}</span>
          <span className="text-xs opacity-70">students</span>
        </div>

        {/* Arrow indicator */}
        <ChevronRight
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-transform duration-300',
            styles.text,
            isHovered && 'translate-x-1'
          )}
        />
      </div>
    </Link>
  );
}
