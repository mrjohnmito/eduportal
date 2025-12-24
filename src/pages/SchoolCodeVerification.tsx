import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Key, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const codeSchema = z.string().min(1, 'School code is required');

export default function SchoolCodeVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedSchool, clearSelectedSchool } = useSelectedSchool();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if no school selected
  if (!selectedSchool) {
    navigate('/');
    return null;
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
          <p className="text-muted-foreground mt-1">Enter your school code to continue</p>
        </div>

        {!selectedSchool.subscriptionStatus && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Subscription Inactive</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              This school's subscription is currently inactive.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg animate-fade-in [animation-delay:100ms]">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
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
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 gap-2 gradient-primary text-primary-foreground"
              >
                {loading ? 'Verifying...' : (
                  <>
                    Verify & Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}