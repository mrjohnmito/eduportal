import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Key, ArrowRight, ArrowLeft, AlertTriangle, Lock } from 'lucide-react';
import { z } from 'zod';
import { School } from '@/types/school';
import { motion } from 'framer-motion';

const codeSchema = z.string().min(1, 'School code is required');

export default function SchoolCodeVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { shortId } = useParams<{ shortId?: string }>();
  const { toast } = useToast();
  const { selectedSchool, setSelectedSchool, clearSelectedSchool } = useSelectedSchool();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Handle direct link with school ID in URL (full ID or short ID)
  useEffect(() => {
    const schoolId = searchParams.get('school');
    const schoolIdPrefix = shortId; // Short ID from /t/:shortId route
    
    if ((schoolId || schoolIdPrefix) && !selectedSchool) {
      // Fetch school data from URL parameter
      const fetchSchool = async () => {
        try {
          let query = supabase.from('schools').select('*');
          
          if (schoolId) {
            // Full ID lookup
            query = query.eq('id', schoolId);
          } else if (schoolIdPrefix) {
            // Short ID prefix lookup - find schools where ID starts with the prefix
            query = query.ilike('id', `${schoolIdPrefix}%`);
          }

          const { data, error } = await query.single();

          if (error || !data) {
            toast({
              title: 'School Not Found',
              description: 'The school link may be invalid or expired.',
              variant: 'destructive',
            });
            navigate('/');
            return;
          }

          const school: School = {
            id: data.id,
            name: data.name,
            logoUrl: data.logo_url || undefined,
            schoolCode: data.school_code,
            subscriptionStatus: data.subscription_status,
            subscriptionExpiry: data.subscription_expiry || undefined,
            themeColor: data.theme_color || undefined,
            createdAt: data.created_at,
            isLocked: data.is_locked || false,
          };

          setSelectedSchool(school);
        } catch (error) {
          console.error('Error fetching school:', error);
          navigate('/');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchSchool();
    } else if (!selectedSchool) {
      navigate('/');
    } else {
      setInitialLoading(false);
    }
  }, [searchParams, shortId, selectedSchool, setSelectedSchool, navigate, toast]);

  // Show loading while fetching school from URL
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedSchool) {
    return null;
  }

  // Check if school is locked
  if (selectedSchool.isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-destructive/10 mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{selectedSchool.name}</h1>
            <p className="text-destructive mt-1">This school has been locked</p>
          </div>

          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">
              Access to this school has been restricted by the administrator.
              Please contact support for assistance.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                clearSelectedSchool();
                navigate('/');
              }}
              className="mt-4 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Schools
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      codeSchema.parse(code);
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

    setLoading(true);

    try {
      if (code.trim().toUpperCase() === selectedSchool.schoolCode.toUpperCase()) {
        // Check subscription status
        if (!selectedSchool.subscriptionStatus) {
          toast({
            title: 'Subscription Inactive',
            description: 'This school\'s subscription is inactive. Please contact the administrator.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Check subscription expiry
        if (selectedSchool.subscriptionExpiry) {
          const expiryDate = new Date(selectedSchool.subscriptionExpiry);
          if (expiryDate < new Date()) {
            toast({
              title: 'Subscription Expired',
              description: 'This school\'s subscription has expired. Please contact the administrator.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        // Mark school as activated globally (one-time, all devices skip code from now on)
        if (!selectedSchool.activatedAt) {
          const { data: activateData, error: activateError } = await supabase.functions.invoke('activate-school', {
            body: { schoolId: selectedSchool.id, code: selectedSchool.schoolCode },
          });
          if (activateError || !activateData?.ok) {
            console.error('Failed to mark school activated:', activateError);
          } else {
            setSelectedSchool({ ...selectedSchool, activatedAt: activateData.activatedAt });
          }
        }

        // Soft device cache (no longer source of truth)
        localStorage.setItem(`school_verified_${selectedSchool.id}`, JSON.stringify({
          timestamp: Date.now(),
          schoolCode: selectedSchool.schoolCode,
        }));

        toast({
          title: 'Verified!',
          description: `Welcome to ${selectedSchool.name}`,
        });
        navigate('/login');
      } else {
        toast({
          title: 'Invalid Code',
          description: 'The school code you entered is incorrect.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An error occurred during verification.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
            Enter your school code to continue
          </motion.p>
        </motion.div>

        {!selectedSchool.subscriptionStatus && (
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
              <span className="font-medium">Subscription Inactive</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              This school's subscription is currently inactive.
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
          <form onSubmit={handleVerify} className="space-y-6">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="code">School Code</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter school code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pl-10 uppercase"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The school code was provided by your administrator.
              </p>
            </motion.div>

            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </motion.div>
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 gradient-primary text-primary-foreground"
                >
                  {loading ? 'Verifying...' : (
                    <>
                      Verify & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}