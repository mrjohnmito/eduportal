import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { GraduationCap, LogIn, Key, Shield, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { School } from '@/types/school';

function mapSchool(s: any): School {
  return {
    id: s.id,
    name: s.name,
    logoUrl: s.logo_url || undefined,
    schoolCode: s.school_code,
    subscriptionStatus: s.subscription_status,
    subscriptionExpiry: s.subscription_expiry || undefined,
    themeColor: s.theme_color || undefined,
    createdAt: s.created_at,
    isLocked: s.is_locked || false,
    activatedAt: s.activated_at || undefined,
  };
}

function schoolAccessError(school: School): string | null {
  if (school.isLocked) return 'This school has been locked by the administrator.';
  if (!school.subscriptionStatus) return "This school's subscription is inactive.";
  if (school.subscriptionExpiry && new Date(`${school.subscriptionExpiry}T23:59:59`) < new Date()) {
    return "This school's subscription has expired.";
  }
  return null;
}

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useSchool();
  const { setSelectedSchool } = useSelectedSchool();

  useDocumentTitle('Sign in');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);

  const enterSchool = async (schoolId: string): Promise<School | null> => {
    const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
    if (!data) return null;
    const school = mapSchool(data);
    const err = schoolAccessError(school);
    if (err) {
      toast({ title: 'Access Denied', description: err, variant: 'destructive' });
      return null;
    }
    setSelectedSchool(school);
    return school;
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: 'Missing details', description: 'Enter your email and password.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // 1) Try platform (super admin) account first
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authData?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .eq('role', 'super_admin')
          .maybeSingle();

        if (roleData) {
          toast({ title: 'Welcome, Super Admin!', description: 'Opening your dashboard.' });
          navigate('/super-admin');
          return;
        }
        await supabase.auth.signOut();
      }

      // 2) Try school admin credentials (resolved by email across all schools)
      const { data: verifyData } = await supabase.functions.invoke('verify-school-admin', {
        body: { email: email.trim().toLowerCase(), password },
      });

      if (verifyData?.valid && verifyData?.schoolId) {
        const school = await enterSchool(verifyData.schoolId);
        if (!school) return;

        sessionStorage.setItem('adminSession', JSON.stringify({
          schoolId: school.id,
          email: email.trim(),
          isAdmin: true,
          timestamp: Date.now(),
        }));
        await login(email.trim(), password, true);
        toast({ title: `Welcome, Admin!`, description: `Signed in to ${school.name}.` });
        navigate('/dashboard');
        return;
      }

      toast({ title: 'Login Failed', description: 'Invalid email or password.', variant: 'destructive' });
    } catch {
      toast({ title: 'Login Failed', description: 'An error occurred during login.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim().length < 4) {
      toast({ title: 'Invalid Access Code', description: 'Enter your full access code.', variant: 'destructive' });
      return;
    }
    setTeacherLoading(true);
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name, school_id')
        .eq('access_code', accessCode.trim())
        .maybeSingle();

      if (!teacher || !teacher.school_id) {
        toast({ title: 'Invalid Access Code', description: 'No teacher found with that code.', variant: 'destructive' });
        return;
      }

      const school = await enterSchool(teacher.school_id);
      if (!school) return;

      sessionStorage.setItem('teacher', JSON.stringify({ id: teacher.id, name: teacher.name }));
      sessionStorage.setItem('teacherId', teacher.id);
      sessionStorage.setItem('teacherName', teacher.name);
      toast({ title: `Welcome, ${teacher.name}!`, description: `Signed in to ${school.name}.` });
      navigate('/dashboard');
    } catch {
      toast({ title: 'Login Failed', description: 'Could not verify your access code.', variant: 'destructive' });
    } finally {
      setTeacherLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden gradient-mesh">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob h-80 w-80 bg-primary/40" style={{ top: '-4rem', left: '-4rem' }} />
        <div className="blob h-80 w-80 bg-secondary/40" style={{ bottom: '-5rem', right: '-4rem', animationDelay: '4s' }} />
        <div className="blob h-64 w-64 bg-accent/30" style={{ top: '35%', right: '25%', animationDelay: '8s' }} />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Edu Portal</h1>
          <p className="text-muted-foreground mt-1">Sign in — we'll take you to the right dashboard</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-card/60 backdrop-blur-xl p-6 shadow-2xl shadow-primary/10 ring-1 ring-white/10">
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="credentials" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-2">
                <Key className="h-4 w-4" />
                Teacher
              </TabsTrigger>
            </TabsList>

            <TabsContent value="credentials">
              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Super admins and school admins use the same form.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full gap-2 gradient-primary text-primary-foreground">
                  {loading ? 'Signing in...' : (<><LogIn className="h-4 w-4" />Sign In</>)}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="teacher">
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Enter the access code provided by your school admin.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accessCode"
                      type="password"
                      placeholder="Enter access code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="pl-10"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={teacherLoading} className="w-full gap-2 gradient-primary text-primary-foreground">
                  {teacherLoading ? 'Verifying...' : (<><LogIn className="h-4 w-4" />Enter Dashboard</>)}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 border-t pt-4 text-center">
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate('/schools')}>
              <Building2 className="h-4 w-4" />
              Browse schools / activate with school code
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}