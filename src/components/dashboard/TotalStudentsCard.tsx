import { useState } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { Users, Download, ChevronDown } from 'lucide-react';
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
        'group relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300',
        'bg-card shadow-md',
        isHovered
          ? 'border-destructive shadow-xl shadow-destructive/10'
          : 'border-border/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background decoration */}
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary to-secondary opacity-10 transition-transform duration-500',
          isHovered && 'scale-150'
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 p-3">
          <Users className="h-6 w-6 text-primary" />
        </div>

        <h3 className="mb-2 text-xl font-semibold text-foreground">Total Students</h3>
        <p className="text-3xl font-bold text-primary">{totalStudents}</p>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
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
