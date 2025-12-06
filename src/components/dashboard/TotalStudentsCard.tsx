import { useState } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { Users, Download, ChevronDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CLASS_LEVELS } from '@/types/school';

export function TotalStudentsCard() {
  const { students, isAdmin, getStudentsByClass } = useSchool();
  const [isHovered, setIsHovered] = useState(false);

  const totalStudents = students.length;

  const handleExportClass = (classLevel: string) => {
    const classStudents = getStudentsByClass(classLevel as 'basic7' | 'basic8' | 'basic9');
    const csv = [
      ['Name', 'Index Number', 'Class'],
      ...classStudents.map(s => [s.name, s.indexNumber || '', classLevel]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classLevel}_students.csv`;
    a.click();
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6 transition-all duration-500',
        'bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700 shadow-lg',
        isHovered && 'scale-[1.03] -translate-y-1 shadow-2xl shadow-purple-500/40'
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

      {/* Trending icon */}
      <div className={cn(
        'absolute top-4 right-4 transition-all duration-500',
        isHovered ? 'opacity-100 rotate-12' : 'opacity-0 rotate-0'
      )}>
        <TrendingUp className="h-5 w-5 text-white/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-white/20 p-3.5 backdrop-blur-sm ring-1 ring-purple-400/30">
          <Users className="h-7 w-7 text-white" />
        </div>

        <h3 className="mb-1 text-lg font-semibold text-white/90">Total Students</h3>
        <p className="text-4xl font-bold text-white tracking-tight">{totalStudents}</p>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 gap-2 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <Download className="h-4 w-4" />
                Export List
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {CLASS_LEVELS.map(level => (
                <DropdownMenuItem
                  key={level.id}
                  onClick={() => handleExportClass(level.id)}
                >
                  {level.name} Students
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
