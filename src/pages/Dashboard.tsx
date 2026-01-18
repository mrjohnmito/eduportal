import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { TotalStudentsCard } from '@/components/dashboard/TotalStudentsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Calendar, AlertTriangle } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface ClassItem {
  id: string;
  name: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, isAdmin, user, loading, subscriptionExpiry, subscriptionDaysRemaining } = useSchool();
  const { selectedSchool } = useSelectedSchool();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useDocumentTitle('Dashboard');

  // Check authentication and school selection
  useEffect(() => {
    if (loading) return;
    
    const teacherId = sessionStorage.getItem('teacherId');
    if (!user && !teacherId) {
      navigate('/');
      return;
    }

    if (!selectedSchool) {
      navigate('/');
    }
  }, [user, loading, navigate, selectedSchool]);

  // Fetch classes from database filtered by school_id
  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool) return;

      // Admins use authenticated session; teachers use access-code flow.
      const teacherId = sessionStorage.getItem('teacherId');
      if (!user && !teacherId) return;

      setClassesLoading(true);

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');

      if (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      } else {
        setClasses(data || []);
      }

      setClassesLoading(false);
    };

    fetchClasses();
  }, [selectedSchool?.id, user?.id]);

  return (
    <MainLayout>
      <div className="container py-6">
        {/* Subscription Warning for Admins */}
        {isAdmin && subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 30 && (
          <div className={`mb-6 rounded-xl border p-4 animate-fade-in ${
            subscriptionDaysRemaining <= 7 
              ? 'border-destructive/50 bg-destructive/10' 
              : 'border-amber-500/50 bg-amber-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {subscriptionDaysRemaining <= 7 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Calendar className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className={`font-medium ${subscriptionDaysRemaining <= 7 ? 'text-destructive' : 'text-amber-600'}`}>
                    Subscription {subscriptionDaysRemaining <= 0 ? 'Expired' : 'Expiring Soon'}
                  </p>
                  <p className={`text-sm ${subscriptionDaysRemaining <= 7 ? 'text-destructive/80' : 'text-amber-600/80'}`}>
                    {subscriptionDaysRemaining <= 0 
                      ? 'Please renew to continue using all features.'
                      : `${subscriptionDaysRemaining} day${subscriptionDaysRemaining !== 1 ? 's' : ''} remaining until ${subscriptionExpiry}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedSchool?.logoUrl && (
              <img 
                src={selectedSchool.logoUrl} 
                alt="School Logo" 
                className="h-12 w-12 object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">
                {settings.schoolName}
              </h1>
              <p className="text-sm text-muted-foreground">School Management System</p>
            </div>
          </div>
        </div>

        {/* Select a Class Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Select a Class</h2>
            </div>
            <TotalStudentsCard />
          </div>

          {/* Class Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classesLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                Loading classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No classes found. {isAdmin && 'Add classes from the Classes menu.'}
              </div>
            ) : (
              classes.map((classItem, index) => {
                // Convert "Basic 7" to "basic7"
                const classId = classItem.name.toLowerCase().replace(/\s/g, '');
                return (
                  <div
                    key={classItem.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ClassCard
                      classLevel={classId as any}
                      name={classItem.name}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <QuickActions />
        </div>
      </div>
    </MainLayout>
  );
}
