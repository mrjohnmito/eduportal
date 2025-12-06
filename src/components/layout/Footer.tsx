import { useSchool } from '@/contexts/SchoolContext';
import { Mail, Phone } from 'lucide-react';

export function Footer() {
  const { settings } = useSchool();

  return (
    <footer className="border-t border-border/40 bg-card/50 py-6">
      <div className="container">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-foreground">
            Motto: <span className="text-primary">{settings.motto}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <a
              href={`mailto:${settings.email}`}
              className="flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              {settings.email}
            </a>
            <span className="hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {settings.contacts.join(' / ')}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {settings.schoolName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
