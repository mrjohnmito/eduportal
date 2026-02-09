import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { School } from '@/types/school';
import { GraduationCap, Building2, Lock, AlertTriangle, CheckCircle, BookOpen, Users, BarChart3, FileText, ArrowRight, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import featureStudentMgmt from '@/assets/feature-student-management.jpg';
import featureGradeRecording from '@/assets/feature-grade-recording.jpg';
import featureReportGen from '@/assets/feature-report-generation.jpg';
import featureAnalytics from '@/assets/feature-performance-analytics.jpg';
export default function SchoolSelection() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    setSelectedSchool
  } = useSelectedSchool();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewFeature, setPreviewFeature] = useState<{ title: string; image: string } | null>(null);
  useEffect(() => {
    fetchSchools();
  }, []);
  const fetchSchools = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('schools').select('*').order('name');
      if (error) throw error;
      setSchools(data?.map(s => ({
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
        isLocked: s.is_locked || false
      })) || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schools.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const isSchoolVerified = (schoolId: string): boolean => {
    const verified = localStorage.getItem(`school_verified_${schoolId}`);
    if (!verified) return false;
    try {
      const {
        timestamp,
        schoolCode
      } = JSON.parse(verified);
      const school = schools.find(s => s.id === schoolId);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
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
    if (school.isLocked) {
      toast({
        title: 'School Locked',
        description: 'This school has been locked by the administrator. Please contact support.',
        variant: 'destructive'
      });
      return;
    }
    setSelectedId(school.id);
    setSelectedSchool(school);
    const verified = isSchoolVerified(school.id);
    const subscriptionValid = isSubscriptionValid(school);
    if (verified && subscriptionValid) {
      navigate('/login');
    } else {
      navigate('/school-code');
    }
  };
  const features = [{
    icon: Users,
    title: 'Student Management',
    description: 'Easily manage student records, enrollment, and academic profiles.',
    image: featureStudentMgmt
  }, {
    icon: BookOpen,
    title: 'Grade Recording',
    description: 'Record and track student scores across all subjects and terms.',
    image: featureGradeRecording
  }, {
    icon: FileText,
    title: 'Report Generation',
    description: 'Generate professional report cards with just a few clicks.',
    image: featureReportGen
  }, {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Visualize class performance and identify areas for improvement.',
    image: featureAnalytics
  }];
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading schools...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
          {/* Shooting stars */}
          <div className="shooting-star" style={{ top: '10%', right: '-5%', animationDuration: '3s', animationDelay: '0s' }} />
          <div className="shooting-star" style={{ top: '25%', right: '-10%', animationDuration: '2.5s', animationDelay: '1.2s' }} />
          <div className="shooting-star" style={{ top: '5%', right: '10%', animationDuration: '3.5s', animationDelay: '2.5s' }} />
          <div className="shooting-star" style={{ top: '40%', right: '-3%', animationDuration: '2.8s', animationDelay: '4s' }} />
          <div className="shooting-star" style={{ top: '15%', right: '20%', animationDuration: '3.2s', animationDelay: '5.5s' }} />
        </div>

        <div className="relative container mx-auto px-4 py-6">
          {/* Navigation */}
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Edu Pro</span>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="max-w-3xl mx-auto text-center pb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Streamlined School Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Modern School
              <span className="text-primary"> Report Card</span>
              <br />Management System
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Simplify academic record-keeping, generate professional report cards, 
              and track student performance with our comprehensive school management platform.
            </p>
          </div>
        </div>
      </header>

      {/* Schools Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Select Your School
            </h2>
            <p className="text-muted-foreground">
              Choose your institution to access the management portal
            </p>
          </div>

          {schools.length === 0 ? <div className="rounded-2xl border border-border bg-card p-12 text-center max-w-md mx-auto shadow-sm">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Schools Yet</h3>
              <p className="text-muted-foreground text-sm">
                No schools have been registered. Contact the system administrator to get started.
              </p>
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {schools.map(school => {
            const verified = isSchoolVerified(school.id);
            const subscriptionValid = isSubscriptionValid(school);
            const isLocked = school.isLocked;
            return <button key={school.id} onClick={() => handleSchoolClick(school)} disabled={isLocked} className={`
                      group relative rounded-2xl border bg-card p-6 text-left transition-all duration-300
                      ${selectedId === school.id ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border'}
                      ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer'}
                    `}>
                    {/* Status badges */}
                    <div className="absolute top-4 right-4 flex gap-1.5">
                      {isLocked && <div className="rounded-full bg-destructive/10 p-1.5" title="School Locked">
                          <Lock className="h-3.5 w-3.5 text-destructive" />
                        </div>}
                      {!subscriptionValid && !isLocked && <div className="rounded-full bg-amber-500/10 p-1.5" title="Subscription Issue">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </div>}
                      {verified && subscriptionValid && !isLocked && <div className="rounded-full bg-green-500/10 p-1.5" title="Verified">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        </div>}
                    </div>

                    {/* School logo */}
                    <div className="mb-4">
                      {school.logoUrl ? <img src={school.logoUrl} alt={school.name} className="h-16 w-16 rounded-xl object-cover border border-border" /> : <div className="h-16 w-16 rounded-xl flex items-center justify-center border border-border transition-colors group-hover:border-primary/30" style={{
                  backgroundColor: (school.themeColor || '#3B82F6') + '10'
                }}>
                          <Building2 className="h-8 w-8 transition-transform group-hover:scale-110" style={{
                    color: school.themeColor || '#3B82F6'
                  }} />
                        </div>}
                    </div>

                    {/* School info */}
                    <h3 className="font-semibold text-foreground mb-2 pr-8 line-clamp-2">{school.name}</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {isLocked ? <span className="text-destructive font-medium">Locked</span> : !school.subscriptionStatus ? <span className="text-destructive">Inactive</span> : school.subscriptionExpiry && new Date(school.subscriptionExpiry) < new Date() ? <span className="text-amber-500">Expired</span> : <span className="text-green-600 font-medium">Active</span>}
                      </div>
                      {!isLocked && <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />}
                    </div>
                  </button>;
          })}
            </div>}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Powerful Features
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to manage student records and generate professional report cards
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => <button key={index} onClick={() => setPreviewFeature({ title: feature.title, image: feature.image })} className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 text-left cursor-pointer">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to preview →</span>
              </button>)}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Edu Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Edu Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Feature Preview Modal */}
      {previewFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewFeature(null)}>
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-lg">{previewFeature.title}</h3>
              <button onClick={() => setPreviewFeature(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              <img src={previewFeature.image} alt={previewFeature.title} className="w-full rounded-xl border border-border" />
            </div>
          </div>
        </div>
      )}
    </div>;
}