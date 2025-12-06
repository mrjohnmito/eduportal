import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, GraduationCap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const { settings, isAdmin, logout } = useSchool();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          {settings.schoolLogo ? (
            <img
              src={settings.schoolLogo}
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
              {settings.schoolName}
            </h1>
            <p className="text-xs text-muted-foreground">J.H.S - {settings.motto}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
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
            <Link to="/login">
              <Button variant="default" size="sm" className="gap-2 gradient-primary text-primary-foreground">
                Admin Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
