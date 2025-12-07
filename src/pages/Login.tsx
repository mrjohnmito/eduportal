import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Eye, EyeOff, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login } = useSchool();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'Account Exists',
              description: 'This email is already registered. Please login instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign Up Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Add admin role for the new user
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: 'admin'
            });

          if (roleError) {
            console.error('Error adding admin role:', roleError);
          }

          toast({
            title: 'Account Created!',
            description: 'You can now login with your credentials.',
          });
          
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        // Login flow
        const success = await login(email, password);
        
        if (success) {
          toast({
            title: 'Welcome, Admin!',
            description: 'You have successfully logged in.',
          });
          navigate('/');
        } else {
          toast({
            title: 'Login Failed',
            description: 'Invalid credentials or you do not have admin access.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="container flex min-h-[calc(100vh-12rem)] items-center justify-center py-8">
        <div className="w-full max-w-md animate-scale-in">
          <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-lg">
                {isSignUp ? (
                  <UserPlus className="h-8 w-8 text-primary-foreground" />
                ) : (
                  <Lock className="h-8 w-8 text-primary-foreground" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {isSignUp ? 'Create Admin Account' : 'Admin Login'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSignUp 
                  ? 'Set up your admin account to manage the school'
                  : 'Enter your credentials to access admin features'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing in...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>

            {/* Toggle Sign Up / Login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                }}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"}
              </button>
            </div>

            {/* Hint */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Teachers can access score entry without logging in
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
