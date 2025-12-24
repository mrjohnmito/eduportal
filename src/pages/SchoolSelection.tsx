import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { School } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Building2, ArrowRight, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SchoolSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSelectedSchool } = useSelectedSchool();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

  const handleContinue = () => {
    const school = schools.find((s) => s.id === selectedSchoolId);
    if (school) {
      setSelectedSchool(school);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">School Management System</h1>
          <p className="text-muted-foreground mt-1">Select your school to continue</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg animate-fade-in [animation-delay:100ms]">
          {schools.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No schools have been added yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact the system administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="school">Select Your School</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger id="school" className="w-full">
                    <SelectValue placeholder="Choose a school..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        <div className="flex items-center gap-2">
                          {school.logoUrl ? (
                            <img
                              src={school.logoUrl}
                              alt={school.name}
                              className="h-5 w-5 rounded object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span>{school.name}</span>
                          {!school.subscriptionStatus && (
                            <span className="text-xs text-destructive">(Inactive)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleContinue}
                disabled={!selectedSchoolId}
                className="w-full gap-2 gradient-primary text-primary-foreground"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center animate-fade-in [animation-delay:200ms]">
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