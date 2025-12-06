import { Link } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, UserPlus } from 'lucide-react';

export function QuickActions() {
  const { isAdmin } = useSchool();

  return (
    <div className="flex flex-wrap gap-3">
      {isAdmin && (
        <>
          <Link to="/students">
            <Button className="gap-2 gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all">
              <UserPlus className="h-4 w-4" />
              Manage Students
            </Button>
          </Link>
          <Link to="/bulk-pdf">
            <Button variant="secondary" className="gap-2 shadow-md hover:shadow-lg transition-all">
              <FileText className="h-4 w-4" />
              Bulk PDF
            </Button>
          </Link>
          <Link to="/clear-data">
            <Button
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
