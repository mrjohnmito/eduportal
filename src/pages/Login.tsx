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
import { motion } from 'framer-motion';

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
      const enteredEmail = adminEmail.trim().toLowerCase();
      const enteredPassword = adminPassword;

      // First, check if credentials match the school's admin credentials
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('admin_email, admin_password_hash')
        .eq('id', selectedSchool.id)
        .single();

      if (schoolError) throw schoolError;

      const schoolAdminEmail = schoolData?.admin_email?.trim().toLowerCase();

      // If the email matches this school's admin email, the password MUST match
      if (schoolAdminEmail && schoolAdminEmail === enteredEmail) {
        if (!schoolData?.admin_password_hash) {
          toast({
            title: 'Login Failed',
            description: 'No admin password is set for this school. Contact the Super Admin.',
            variant: 'destructive',
          });
          return;
        }

        let storedPassword = '';
        try {
          storedPassword = atob(schoolData.admin_password_hash);
        } catch {
          storedPassword = '';
        }

        if (storedPassword === enteredPassword) {
          sessionStorage.setItem('adminSession', JSON.stringify({
            schoolId: selectedSchool.id,
            email: adminEmail,
            isAdmin: true,
            timestamp: Date.now(),
          }));

          await login(adminEmail, adminPassword, true);

          toast({
            title: 'Welcome, Admin!',
            description: 'You have successfully logged in.',
          });
          navigate('/dashboard');
          return;
        }

        toast({
          title: 'Invalid Password',
          description: 'The admin password is incorrect for this school.',
          variant: 'destructive',
        });
        return;
      }

      // Email does not match this school's admin email — try Supabase Auth (e.g. super admin)
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
          description: 'Invalid credentials for this school.',
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 overflow-hidden">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div 
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {selectedSchool.logoUrl ? (
              <img
                src={selectedSchool.logoUrl}
                alt={selectedSchool.name}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <GraduationCap className="h-8 w-8 text-primary" />
            )}
          </motion.div>
          <motion.h1 
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {selectedSchool.name}
          </motion.h1>
          <motion.p 
            className="text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            School Management System
          </motion.p>
        </motion.div>

        {/* Subscription Warning */}
        {!canLogin && (
          <motion.div 
            className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 text-destructive">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <AlertTriangle className="h-5 w-5" />
              </motion.div>
              <span className="font-medium">
                {!isSubscriptionActive ? 'Subscription Inactive' : 'Subscription Expired'}
              </span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              Please contact your administrator to renew the subscription.
            </p>
          </motion.div>
        )}

        {/* Subscription Info */}
        {canLogin && remainingDays !== null && remainingDays <= 30 && (
          <motion.div 
            className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4"
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 text-amber-600">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Subscription Expiring Soon</span>
            </div>
            <p className="text-sm text-amber-600/80 mt-1">
              {remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining until expiry.
            </p>
          </motion.div>
        )}

        <motion.div 
          className="rounded-xl border border-border bg-card p-6 shadow-lg"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.2,
            ease: "easeOut"
          }}
        >
          <Tabs defaultValue="teacher" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
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
            </motion.div>

            <TabsContent value="teacher">
              <motion.form 
                onSubmit={handleTeacherLogin} 
                className="space-y-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your access code provided by the admin
                  </p>
                </div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                </motion.div>
              </motion.form>
            </TabsContent>

            <TabsContent value="admin">
              <motion.form 
                onSubmit={handleAdminLogin} 
                className="space-y-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Login with your admin credentials
                  </p>
                </div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
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
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                </motion.div>
              </motion.form>
            </TabsContent>
          </Tabs>

          <motion.div 
            className="mt-4 pt-4 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="w-full gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Change School
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.p 
          className="text-center text-sm text-muted-foreground mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          "{settings.motto}"
        </motion.p>
      </motion.div>
    </div>
  );
}