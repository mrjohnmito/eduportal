import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { UserPlus, FileDown, Trash2, Settings, Zap, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickActions() {
  const { isAdmin } = useSchool();

  if (!isAdmin) {
    return null;
  }

  const actions = [
    {
      to: '/students',
      icon: UserPlus,
      label: 'Manage Students',
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'hover:shadow-blue-500/30',
    },
    {
      to: '/teachers',
      icon: Users,
      label: 'Manage Teachers',
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'hover:shadow-cyan-500/30',
    },
    {
      to: '/classes',
      icon: GraduationCap,
      label: 'Manage Classes',
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'hover:shadow-amber-500/30',
    },
    {
      to: '/bulk-pdf',
      icon: FileDown,
      label: 'Bulk PDF',
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'hover:shadow-emerald-500/30',
    },
    {
      to: '/clear-data',
      icon: Trash2,
      label: 'Clear Data',
      gradient: 'from-rose-500 to-red-600',
      shadow: 'hover:shadow-rose-500/30',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Settings',
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'hover:shadow-violet-500/30',
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
        <Zap className="h-4 w-4" />
        Quick Actions
      </div>
      {actions.map(({ to, icon: Icon, label, gradient, shadow }) => (
        <Link key={to} to={to}>
          <Button 
            className={cn(
              'gap-2 bg-gradient-to-r text-white border-0 shadow-lg transition-all duration-300',
              'hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl',
              gradient,
              shadow
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        </Link>
      ))}
    </div>
  );
}