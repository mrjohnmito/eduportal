import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, LogIn, User, Key, Shield, ArrowLeft, AlertTriangle, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const accessCodeSchema = z.string().min(4, 'Access code must be at least 4 characters');

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, login } = useSchool();
  const { selectedSchool, clearSelectedSchool } = useSelectedSchool();

  useDocumentTitle('Login');

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Teacher login state
  const [teacherAccessCode, setTeacherAccessCode] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Redirect if no school selected
  useEffect(() => {
    if (!selectedSchool) {
      navigate('/');
    }
  }, [selectedSchool, navigate]);

  if (!selectedSchool) {
    return null;
  }

  // Check subscription status
  const isSubscriptionActive = selectedSchool.subscriptionStatus;
  const isSubscriptionExpired = selectedSchool.subscriptionExpiry 
    ? new Date(selectedSchool.subscriptionExpiry) < new Date() 
    : false;
  const canLogin = isSubscriptionActive && !isSubscriptionExpired;

  const getRemainingDays = () => {
    if (!selectedSchool.subscriptionExpiry) return null;
    const expiry = new Date(selectedSchool.subscriptionExpiry);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canLogin) {
      toast({
        title: 'Subscription Issue',
        description: 'This school\'s subscription is inactive or expired.',
        variant: 'destructive',
      });
      return;
    }

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
      // First, check if credentials match the school's admin credentials
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('admin_email, admin_password_hash')
        .eq('id', selectedSchool.id)
        .single();

      if (schoolError) throw schoolError;

      // Check if the email matches the school's admin email
      if (schoolData?.admin_email && 
          schoolData.admin_email.toLowerCase() === adminEmail.toLowerCase() &&
          schoolData.admin_password_hash) {
        
        // Decode the stored password (base64) and compare
        try {
          const storedPassword = atob(schoolData.admin_password_hash);
          
          if (storedPassword === adminPassword) {
            // Credentials match - set admin session in sessionStorage
            sessionStorage.setItem('adminSession', JSON.stringify({
              schoolId: selectedSchool.id,
              email: adminEmail,
              isAdmin: true,
              timestamp: Date.now(),
            }));
            
            // Trigger login in context
            await login(adminEmail, adminPassword, true);
            
            toast({
              title: 'Welcome, Admin!',
              description: 'You have successfully logged in.',
            });
            navigate('/dashboard');
            return;
          }
        } catch {
          // Password decode failed, continue to Supabase Auth
        }
      }

      // Fallback to Supabase Auth for super admins or other auth users
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

    if (!canLogin) {
      toast({
        title: 'Subscription Issue',
        description: 'This school\'s subscription is inactive or expired.',
        variant: 'destructive',
      });
      return;
    }

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
        .eq('school_id', selectedSchool.id)
        .maybeSingle();

      if (error) throw error;

      if (teacher) {
        // Store teacher as JSON object for ClassTeacherReport
        sessionStorage.setItem('teacher', JSON.stringify(teacher));
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
          description: 'The access code you entered is not valid for this school.',
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

  const handleBack = () => {
    clearSelectedSchool();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            {selectedSchool.logoUrl ? (
              <img
                src={selectedSchool.logoUrl}
                alt={selectedSchool.name}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <GraduationCap className="h-8 w-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{selectedSchool.name}</h1>
          <p className="text-muted-foreground mt-1">School Management System</p>
        </div>

        {/* Subscription Warning */}
        {!canLogin && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {!isSubscriptionActive ? 'Subscription Inactive' : 'Subscription Expired'}
              </span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              Please contact your administrator to renew the subscription.
            </p>
          </div>
        )}

        {/* Subscription Info */}
        {canLogin && remainingDays !== null && remainingDays <= 30 && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-600">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Subscription Expiring Soon</span>
            </div>
            <p className="text-sm text-amber-600/80 mt-1">
              {remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining until expiry.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg animate-fade-in [animation-delay:100ms]">
          <Tabs defaultValue="teacher" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="teacher" className="gap-2" disabled={!canLogin}>
                <User className="h-4 w-4" />
                Teacher
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2" disabled={!canLogin}>
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
                      disabled={!canLogin}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={teacherLoading || !canLogin}
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
                    disabled={!canLogin}
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
                    disabled={!canLogin}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={adminLoading || !canLogin}
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

          <div className="mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              className="w-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Change School
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in [animation-delay:200ms]">
          "{settings.motto}"
        </p>
      </div>
    </div>
  );
}