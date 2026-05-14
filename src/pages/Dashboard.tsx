import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useSchool } from '@/contexts/SchoolContext';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Calendar, AlertTriangle, Users, BookOpen, Activity } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion } from 'framer-motion';
import { hasValidSchoolAdminSession } from '@/lib/session';

interface ClassItem {
  id: string;
  name: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings, isAdmin, user, loading, subscriptionExpiry, subscriptionDaysRemaining, students } = useSchool();
  const { selectedSchool } = useSelectedSchool();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [allowedClassIds, setAllowedClassIds] = useState<Set<string> | null>(null);

  useDocumentTitle('Dashboard');

  useEffect(() => {
    if (loading) return;
    const tId = sessionStorage.getItem('teacherId');
    setTeacherId(tId);
    const schoolAdmin = hasValidSchoolAdminSession(selectedSchool?.id);
    if (!user && !tId && !schoolAdmin) { navigate('/'); return; }
    if (!selectedSchool) navigate('/');
  }, [user, loading, navigate, selectedSchool]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedSchool) return;
      const tId = sessionStorage.getItem('teacherId');
      const schoolAdmin = hasValidSchoolAdminSession(selectedSchool.id);
      if (!user && !tId && !schoolAdmin) return;
      setClassesLoading(true);

      // If a teacher is logged in, fetch their assigned class IDs first
      let assigned: Set<string> | null = null;
      if (tId && !user && !schoolAdmin) {
        const { data: assignments } = await supabase
          .from('teacher_class_assignments')
          .select('class_id')
          .eq('teacher_id', tId)
          .eq('school_id', selectedSchool.id);
        assigned = new Set((assignments || []).map((a: any) => a.class_id));
      }
      setAllowedClassIds(assigned);

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');
      if (error) { console.error('Error fetching classes:', error); setClasses([]); }
      else {
        const all = data || [];
        setClasses(assigned ? all.filter(c => assigned!.has(c.id)) : all);
      }
      setClassesLoading(false);
    };
    fetchClasses();
  }, [selectedSchool?.id, user?.id]);

  const isTeacher = !!teacherId && !user && !hasValidSchoolAdminSession(selectedSchool?.id);

  const totalStudents = students?.length || 0;

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-6 space-y-6">
          <div className="h-24 bg-muted animate-pulse rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        {isTeacher && allowedClassIds && allowedClassIds.size === 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-700 text-sm">
            You haven't been assigned to any class yet. Please contact your school admin.
          </div>
        )}
        {/* Subscription Warning */}
        {isAdmin && subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 30 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 ${
              subscriptionDaysRemaining <= 7
                ? 'border-destructive/50 bg-destructive/10'
                : 'border-amber-500/50 bg-amber-500/10'
            }`}
          >
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
                    : `${subscriptionDaysRemaining} day${subscriptionDaysRemaining !== 1 ? 's' : ''} remaining until ${subscriptionExpiry}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 text-primary-foreground shadow-lg"
        >
          <div className="flex items-center gap-4">
            {selectedSchool?.logoUrl ? (
              <img
                src={selectedSchool.logoUrl}
                alt="School Logo"
                className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary-foreground/30 shadow-md"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-foreground/20">
                <GraduationCap className="h-8 w-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide">{settings.schoolName}</h1>
              <p className="text-primary-foreground/80 text-sm">{settings.motto} • {settings.academicYear} • {settings.term}</p>
            </div>
          </div>
        </motion.div>


        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
        >
          <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{classes.length}</p>
                <p className="text-xs text-muted-foreground">Classes</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-secondary/5 to-secondary/10 p-4 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/10 p-2">
                <Activity className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {isAdmin && subscriptionDaysRemaining !== null
                    ? subscriptionDaysRemaining <= 0 ? 'Expired' : `${subscriptionDaysRemaining} Days Left`
                    : 'Active'}
                </p>
                <p className="text-xs text-muted-foreground">Subscription</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Select a Class */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Select a Class</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classesLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No classes found. {isAdmin && 'Add classes from the Classes menu.'}
              </div>
            ) : (
              classes.map((classItem, index) => {
                const classId = classItem.name.toLowerCase().replace(/\s/g, '');
                return (
                  <motion.div
                    key={classItem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <ClassCard classLevel={classId as any} name={classItem.name} />
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <QuickActions />
        </motion.div>
      </div>
    </MainLayout>
  );
}
