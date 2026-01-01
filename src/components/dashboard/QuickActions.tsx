import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UserPlus, 
  FileDown, 
  Trash2, 
  Settings, 
  Users, 
  GraduationCap, 
  FileText,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  bgColor: string;
  iconBg: string;
}

export function QuickActions() {
  const { isAdmin } = useSchool();
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const teacherData = sessionStorage.getItem('teacher');
    setIsTeacher(!!teacherData);
  }, []);

  const adminActions: ActionItem[] = [
    {
      to: '/bulk-pdf',
      icon: FileDown,
      label: 'Bulk PDF Export',
      description: 'Export all report cards',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconBg: 'bg-blue-500',
    },
    {
      to: '/clear-data',
      icon: Trash2,
      label: 'Clear Data',
      description: 'Remove scores by class/subject',
      bgColor: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
      iconBg: 'bg-rose-500',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'School Settings',
      description: 'Update school info & logo',
      bgColor: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
      iconBg: 'bg-violet-500',
    },
    {
      to: '/bulk-pdf',
      icon: FileSpreadsheet,
      label: 'Class Report',
      description: 'Export class score sheet',
      bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
      iconBg: 'bg-pink-500',
    },
    {
      to: '/students',
      icon: UserPlus,
      label: 'Manage Students',
      description: 'Add students to classes',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
      iconBg: 'bg-emerald-500',
    },
    {
      to: '/class-teacher-report',
      icon: FileText,
      label: 'Class Teacher Report',
      description: 'Add attendance & conduct',
      bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
      iconBg: 'bg-teal-500',
    },
    {
      to: '/clear-data',
      icon: Trash2,
      label: 'Reset Class Scores',
      description: 'Clear all scores for a class',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      iconBg: 'bg-orange-500',
    },
  ];

  const teacherActions: ActionItem[] = [
    {
      to: '/class-teacher-report',
      icon: FileText,
      label: 'Class Teacher Report',
      description: 'Add attendance & conduct',
      bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
      iconBg: 'bg-teal-500',
    },
  ];

  const actions = isAdmin ? adminActions : isTeacher ? teacherActions : [];

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {actions.map(({ to, icon: Icon, label, description, bgColor, iconBg }, index) => (
          <Link key={`${to}-${index}`} to={to}>
            <Card 
              className={cn(
                'border transition-all duration-300 cursor-pointer',
                'hover:scale-[1.02] hover:shadow-md',
                bgColor
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', iconBg)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{label}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {!isAdmin && (
        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Some features require admin login
        </p>
      )}
    </div>
  );
}
