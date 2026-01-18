import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, GraduationCap, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const { settings, isAdmin, logout, subscriptionDaysRemaining, subscriptionExpiry } = useSchool();
  const { selectedSchool, clearSelectedSchool } = useSelectedSchool();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem('teacherId');
    sessionStorage.removeItem('teacherName');
    clearSelectedSchool();
    navigate('/');
  };

  // Use selected school branding if available
  const logoUrl = selectedSchool?.logoUrl || settings.schoolLogo;
  const schoolName = selectedSchool?.name || settings.schoolName;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 transition-transform hover:scale-105">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="School Logo"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-foreground leading-tight">
              {schoolName}
            </h1>
            <p className="text-xs text-muted-foreground">J.H.S - {settings.motto}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Subscription indicator for admins - always visible */}
          {isAdmin && subscriptionDaysRemaining !== null && (
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              subscriptionDaysRemaining <= 0
                ? 'bg-destructive/10 text-destructive'
                : subscriptionDaysRemaining <= 7 
                  ? 'bg-destructive/10 text-destructive' 
                  : subscriptionDaysRemaining <= 30
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              <Calendar className="h-3.5 w-3.5" />
              {subscriptionDaysRemaining <= 0 ? 'Expired' : `${subscriptionDaysRemaining} days left`}
            </div>
          )}

          {isAdmin && (
            <>
              <Link to="/settings">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          )}
          {!isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
