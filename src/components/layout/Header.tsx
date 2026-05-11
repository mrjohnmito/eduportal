import { useState, useEffect } from 'react';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, GraduationCap, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface AdminMessage {
  id: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Header() {
  const { settings, isAdmin, logout, subscriptionDaysRemaining, subscriptionExpiry } = useSchool();
  const { selectedSchool, clearSelectedSchool } = useSelectedSchool();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem('teacherId');
    sessionStorage.removeItem('teacherName');
    clearSelectedSchool();
    navigate('/');
  };

  // Fetch messages and subscribe to realtime
  useEffect(() => {
    if (!isAdmin || !selectedSchool) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('created_at', { ascending: false });
      if (data) {
        setMessages(data);
        setUnreadCount(data.filter((m: AdminMessage) => !m.is_read).length);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('admin-messages-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_messages',
        filter: `school_id=eq.${selectedSchool.id}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, selectedSchool?.id]);

  const markAsRead = async (id: string) => {
    await supabase.from('admin_messages').update({ is_read: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const openInbox = () => {
    setInboxOpen(true);
  };

  const logoUrl = selectedSchool?.logoUrl || settings.schoolLogo;
  const schoolName = selectedSchool?.name || settings.schoolName;

  return (
    <>
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
            {/* Subscription indicator for admins */}
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

            {/* Inbox for admins */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="relative gap-2"
                onClick={openInbox}
              >
                <Mail className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                    {unreadCount}
                  </span>
                )}
                <span className="hidden sm:inline">Inbox</span>
              </Button>
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

      {/* Inbox Dialog */}
      <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Messages
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {unreadCount} new
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3 pr-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                      msg.is_read
                        ? 'bg-card border-border'
                        : 'bg-primary/5 border-primary/30 shadow-sm'
                    }`}
                    onClick={() => !msg.is_read && markAsRead(msg.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-semibold ${msg.is_read ? 'text-foreground' : 'text-primary'}`}>
                        {msg.subject}
                      </h4>
                      {!msg.is_read && (
                        <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
