import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { ClassLevel } from '@/types/school';
import { Users, ArrowRight, Sparkles } from 'lucide-react';
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
      gradient: 'from-blue-500 via-blue-600 to-indigo-700',
      glow: 'group-hover:shadow-blue-500/40',
      iconBg: 'bg-white/20',
      accent: 'bg-blue-400',
      ring: 'ring-blue-400/30',
    },
    basic8: {
      gradient: 'from-emerald-500 via-green-600 to-teal-700',
      glow: 'group-hover:shadow-emerald-500/40',
      iconBg: 'bg-white/20',
      accent: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
    },
    basic9: {
      gradient: 'from-amber-500 via-orange-500 to-red-600',
      glow: 'group-hover:shadow-amber-500/40',
      iconBg: 'bg-white/20',
      accent: 'bg-amber-400',
      ring: 'ring-amber-400/30',
    },
  };

  const styles = colorStyles[classLevel];

  return (
    <Link
      to={`/class/${classLevel}`}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6 transition-all duration-500',
        'bg-gradient-to-br shadow-lg hover:shadow-2xl',
        styles.gradient,
        styles.glow,
        isHovered && 'scale-[1.03] -translate-y-1'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-30">
        <div className={cn(
          'absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/20 blur-2xl transition-all duration-700',
          isHovered && 'scale-150 opacity-40'
        )} />
        <div className={cn(
          'absolute -left-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-xl transition-all duration-700 delay-100',
          isHovered && 'scale-150 opacity-30'
        )} />
      </div>
      
      {/* Floating particles effect */}
      <div className={cn(
        'absolute top-4 right-4 transition-all duration-500',
        isHovered ? 'opacity-100 rotate-12' : 'opacity-0 rotate-0'
      )}>
        <Sparkles className="h-5 w-5 text-white/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className={cn(
          'mb-5 inline-flex items-center justify-center rounded-xl p-3.5 backdrop-blur-sm ring-1',
          styles.iconBg,
          styles.ring
        )}>
          <Users className="h-7 w-7 text-white" />
        </div>

        <h3 className="mb-1 text-2xl font-bold text-white tracking-tight">{name}</h3>
        <p className="text-sm text-white/70 font-medium">Click to manage scores</p>

        {/* Student count badge */}
        <div className={cn(
          'absolute bottom-0 right-0 flex items-center gap-2 rounded-xl px-4 py-2',
          'bg-white/20 backdrop-blur-sm ring-1 ring-white/30'
        )}>
          <span className="text-xl font-bold text-white">{studentCount}</span>
          <span className="text-xs text-white/80 font-medium">students</span>
        </div>

        {/* Arrow indicator */}
        <div className={cn(
          'absolute right-4 top-6 flex h-8 w-8 items-center justify-center rounded-full',
          'bg-white/20 backdrop-blur-sm transition-all duration-300',
          isHovered && 'translate-x-1 bg-white/30'
        )}>
          <ArrowRight className="h-4 w-4 text-white" />
        </div>
      </div>
    </Link>
  );
}
