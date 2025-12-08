import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, LogIn, User, Key, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const accessCodeSchema = z.string().min(4, 'Access code must be at least 4 characters');

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, login } = useSchool();

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Teacher login state
  const [teacherAccessCode, setTeacherAccessCode] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(adminEmail);
      passwordSchema.parse(adminPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setAdminLoading(true);

    try {
      const success = await login(adminEmail, adminPassword);

      if (success) {
        toast({
          title: 'Welcome, Admin!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid credentials or you do not have admin privileges.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Login Failed',
        description: 'An error occurred during login.',
        variant: 'destructive',
      });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      accessCodeSchema.parse(teacherAccessCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setTeacherLoading(true);

    try {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('access_code', teacherAccessCode)
        .maybeSingle();

      if (error) throw error;

      if (teacher) {
        sessionStorage.setItem('teacherId', teacher.id);
        sessionStorage.setItem('teacherName', teacher.name);

        toast({
          title: `Welcome, ${teacher.name}!`,
          description: 'You can now enter student scores.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Invalid Access Code',
          description: 'The access code you entered is not valid.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Login Failed',
        description: 'An error occurred while verifying your access code.',
        variant: 'destructive',
      });
    } finally {
      setTeacherLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{settings.schoolName}</h1>
          <p className="text-muted-foreground mt-1">School Management System</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg animate-fade-in [animation-delay:100ms]">
          <Tabs defaultValue="teacher" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="teacher" className="gap-2">
                <User className="h-4 w-4" />
                Teacher
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teacher">
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your access code provided by the admin
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accessCode"
                      type="password"
                      placeholder="Enter access code"
                      value={teacherAccessCode}
                      onChange={(e) => setTeacherAccessCode(e.target.value)}
                      className="pl-10"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={teacherLoading}
                  className="w-full gap-2 gradient-primary text-primary-foreground"
                >
                  {teacherLoading ? 'Verifying...' : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Enter Dashboard
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Login with your admin credentials
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@school.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full gap-2 gradient-primary text-primary-foreground"
                >
                  {adminLoading ? 'Logging in...' : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Admin Login
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in [animation-delay:200ms]">
          "{settings.motto}"
        </p>
      </div>
    </div>
  );
}