import { useSchool } from '@/contexts/SchoolContext';
import { Users } from 'lucide-react';

export function TotalStudentsCard() {
  const { students } = useSchool();
  const totalStudents = students.length;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card shadow-sm">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Total Students:</span>
      <span className="font-bold text-foreground">{totalStudents}</span>
    </div>
  );
}
