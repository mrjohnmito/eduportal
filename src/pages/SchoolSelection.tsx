import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { School } from '@/types/school';
import { Button } from '@/components/ui/button';
import { GraduationCap, Building2, Shield, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SchoolSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSelectedSchool } = useSelectedSchool();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) throw error;

      setSchools(
        data?.map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logo_url || undefined,
          schoolCode: s.school_code,
          subscriptionStatus: s.subscription_status,
          subscriptionExpiry: s.subscription_expiry || undefined,
          themeColor: s.theme_color || undefined,
          createdAt: s.created_at,
          adminEmail: s.admin_email || undefined,
          adminPasswordHash: s.admin_password_hash || undefined,
          isLocked: s.is_locked || false,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schools.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isSchoolVerified = (schoolId: string): boolean => {
    const verified = localStorage.getItem(`school_verified_${schoolId}`);
    if (!verified) return false;
    
    try {
      const { timestamp, schoolCode } = JSON.parse(verified);
      const school = schools.find(s => s.id === schoolId);
      // Verification is valid if less than 30 days old and school code matches
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return timestamp > thirtyDaysAgo && school?.schoolCode === schoolCode;
    } catch {
      return false;
    }
  };

  const isSubscriptionValid = (school: School): boolean => {
    if (!school.subscriptionStatus) return false;
    if (school.subscriptionExpiry) {
      return new Date(school.subscriptionExpiry) >= new Date();
    }
    return true;
  };

  const handleSchoolClick = (school: School) => {
    // Check if school is locked
    if (school.isLocked) {
      toast({
        title: 'School Locked',
        description: 'This school has been locked by the administrator. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedId(school.id);
    setSelectedSchool(school);

    // Check if verified and subscription is valid
    const verified = isSchoolVerified(school.id);
    const subscriptionValid = isSubscriptionValid(school);

    if (verified && subscriptionValid) {
      // Skip code verification
      navigate('/login');
    } else {
      // Need to verify code (expired subscription or first time)
      navigate('/school-code');
    }
  };

  const handleSuperAdminLogin = () => {
    navigate('/super-admin-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="animate-pulse text-muted-foreground">Loading schools...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 py-8">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">School Management System</h1>
          <p className="text-muted-foreground mt-1">Select your school to continue</p>
        </div>

        {schools.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center max-w-md mx-auto animate-fade-in">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No schools have been added yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact the system administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in [animation-delay:100ms]">
            {schools.map((school) => {
              const verified = isSchoolVerified(school.id);
              const subscriptionValid = isSubscriptionValid(school);
              const isLocked = school.isLocked;

              return (
                <button
                  key={school.id}
                  onClick={() => handleSchoolClick(school)}
                  disabled={isLocked}
                  className={`
                    relative rounded-xl border bg-card p-6 text-left transition-all duration-200
                    ${selectedId === school.id ? 'ring-2 ring-primary border-primary' : 'border-border'}
                    ${isLocked 
                      ? 'opacity-60 cursor-not-allowed' 
                      : 'hover:border-primary/50 hover:shadow-lg cursor-pointer'
                    }
                  `}
                >
                  {/* Status badges */}
                  <div className="absolute top-3 right-3 flex gap-1">
                    {isLocked && (
                      <div className="rounded-full bg-destructive/10 p-1.5" title="School Locked">
                        <Lock className="h-3.5 w-3.5 text-destructive" />
                      </div>
                    )}
                    {!subscriptionValid && !isLocked && (
                      <div className="rounded-full bg-amber-500/10 p-1.5" title="Subscription Issue">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                    )}
                    {verified && subscriptionValid && !isLocked && (
                      <div className="rounded-full bg-green-500/10 p-1.5" title="Verified">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      </div>
                    )}
                  </div>

                  {/* School logo */}
                  <div className="flex items-center gap-4 mb-4">
                    {school.logoUrl ? (
                      <img
                        src={school.logoUrl}
                        alt={school.name}
                        className="h-16 w-16 rounded-xl object-cover border border-border"
                      />
                    ) : (
                      <div
                        className="h-16 w-16 rounded-xl flex items-center justify-center border border-border"
                        style={{ backgroundColor: (school.themeColor || '#3B82F6') + '15' }}
                      >
                        <Building2
                          className="h-8 w-8"
                          style={{ color: school.themeColor || '#3B82F6' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* School info */}
                  <h3 className="font-semibold text-foreground mb-1 pr-8">{school.name}</h3>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {isLocked ? (
                      <span className="text-destructive font-medium">Locked</span>
                    ) : !school.subscriptionStatus ? (
                      <span className="text-destructive">Inactive</span>
                    ) : school.subscriptionExpiry && new Date(school.subscriptionExpiry) < new Date() ? (
                      <span className="text-amber-500">Expired</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center animate-fade-in [animation-delay:200ms]">
          <Button
            variant="ghost"
            onClick={handleSuperAdminLogin}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <Shield className="h-4 w-4" />
            Super Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
}