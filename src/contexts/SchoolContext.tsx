import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, SubjectScore, SchoolSettings, ClassLevel } from '@/types/school';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';

interface SchoolContextType {
  students: Student[];
  scores: SubjectScore[];
  settings: SchoolSettings;
  isAdmin: boolean;
  user: User | null;
  loading: boolean;
  subscriptionExpiry: string | null;
  subscriptionDaysRemaining: number | null;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  addScore: (score: Omit<SubjectScore, 'id'>) => Promise<void>;
  updateScore: (id: string, updates: Partial<SubjectScore>) => Promise<void>;
  getScoresByClassAndSubject: (classLevel: string, subject: string) => SubjectScore[];
  getStudentsByClass: (classLevel: string) => Student[];
  clearSubjectData: (classLevel: string, subject: string) => Promise<void>;
  updateSettings: (updates: Partial<SchoolSettings>) => Promise<void>;
  login: (email: string, password: string, isSchoolAdmin?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSchoolAdminSession: () => boolean;
  refreshData: () => Promise<void>;
}

const defaultSettings: SchoolSettings = {
  schoolName: 'IBRAHIM MEMORIAL SCHOOL COMPLEX',
  motto: 'Humble Beginners',
  email: 'ibrahimmemorialfoundationschool@gmail.com',
  academicYear: '2024/2025',
  term: 'First Term',
  contacts: ['0557387992', '0545231646'],
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { selectedSchool } = useSelectedSchool();
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate subscription days remaining
  const subscriptionExpiry = selectedSchool?.subscriptionExpiry || null;
  const subscriptionDaysRemaining = subscriptionExpiry 
    ? Math.ceil((new Date(subscriptionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Fetch all data from database filtered by school_id
  const fetchData = async () => {
    if (!selectedSchool) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch students filtered by school_id
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .order('name');
      
      if (studentsError) throw studentsError;
      
      setStudents(studentsData?.map(s => ({
        id: s.id,
        name: s.name,
        classLevel: s.class_level,
        photo: s.photo_url || undefined,
        attendanceDays: (s as any).attendance_days || 0,
        schoolId: s.school_id,
      })) || []);

      // Fetch scores filtered by school_id
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('school_id', selectedSchool.id);
      
      if (scoresError) throw scoresError;
      
      setScores(scoresData?.map(s => ({
        id: s.id,
        studentId: s.student_id,
        classLevel: s.class_level as ClassLevel,
        subject: s.subject,
        test1: Number(s.test1) || null,
        groupWork: Number(s.group_work) || null,
        test2: Number(s.test2) || null,
        project: Number(s.project) || null,
        examScore: Number(s.exam) || null,
        schoolId: s.school_id,
      })) || []);

      // Fetch settings filtered by school_id
      const { data: settingsData, error: settingsError } = await supabase
        .from('school_settings')
        .select('*')
        .eq('school_id', selectedSchool.id)
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setSettings({
          schoolName: settingsData.school_name || selectedSchool.name,
          schoolLogo: settingsData.logo_url || selectedSchool.logoUrl || undefined,
          motto: settingsData.motto || 'Humble Beginners',
          email: settingsData.email || '',
          academicYear: settingsData.academic_year || '2024/2025',
          term: settingsData.term || 'First Term',
          contacts: [settingsData.phone1 || '', settingsData.phone2 || ''].filter(Boolean),
          totalSchoolDays: (settingsData as any).total_school_days || 64,
          interestOptions: (settingsData as any).interest_options || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair'],
          conductOptions: (settingsData as any).conduct_options || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair'],
          nextTermBegins: (settingsData as any).next_term_begins || undefined,
          schoolId: selectedSchool.id,
        });
      } else {
        // Use selected school info as defaults
        setSettings({
          ...defaultSettings,
          schoolName: selectedSchool.name,
          schoolLogo: selectedSchool.logoUrl || undefined,
          schoolId: selectedSchool.id,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
    
    return !!data;
  };

  // Check for school admin session in sessionStorage
  const checkSchoolAdminSession = (): boolean => {
    try {
      const adminSessionStr = sessionStorage.getItem('adminSession');
      if (adminSessionStr) {
        const adminSession = JSON.parse(adminSessionStr);
        // Validate that the session is for the current school
        if (adminSession.schoolId === selectedSchool?.id && adminSession.isAdmin) {
          return true;
        }
      }
    } catch {
      // Invalid session data
    }
    return false;
  };

  // Initialize auth and data
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id).then(setIsAdmin);
          }, 0);
        } else {
          // Check for school admin session when no Supabase user
          const isSchoolAdmin = checkSchoolAdminSession();
          setIsAdmin(isSchoolAdmin);
        }
      }
    );

    // Check for existing session (Supabase or school admin)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id).then(setIsAdmin);
      } else {
        // Check for school admin session
        const isSchoolAdmin = checkSchoolAdminSession();
        setIsAdmin(isSchoolAdmin);
      }
    });

    return () => subscription.unsubscribe();
  }, [selectedSchool?.id]);

  // Fetch data when selected school changes or auth state changes
  useEffect(() => {
    if (selectedSchool) {
      fetchData();
    }
  }, [selectedSchool?.id, session?.access_token]);

  const refreshData = async () => {
    await fetchData();
  };

  const addStudent = async (student: Omit<Student, 'id'>) => {
    if (!selectedSchool) throw new Error('No school selected');

    const { data, error } = await supabase
      .from('students')
      .insert({
        name: student.name,
        class_level: student.classLevel,
        photo_url: student.photo || null,
        attendance_days: student.attendanceDays || 0,
        school_id: selectedSchool.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding student:', error);
      throw error;
    }

    if (data) {
      setStudents(prev => [...prev, {
        id: data.id,
        name: data.name,
        classLevel: data.class_level,
        photo: data.photo_url || undefined,
        attendanceDays: (data as any).attendance_days || 0,
        schoolId: data.school_id,
      }]);
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.classLevel !== undefined) updateData.class_level = updates.classLevel;
    if (updates.photo !== undefined) updateData.photo_url = updates.photo;
    if (updates.attendanceDays !== undefined) updateData.attendance_days = updates.attendanceDays;

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating student:', error);
      throw error;
    }

    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting student:', error);
      throw error;
    }

    setStudents(prev => prev.filter(s => s.id !== id));
    setScores(prev => prev.filter(s => s.studentId !== id));
  };

  const addScore = async (score: Omit<SubjectScore, 'id'>) => {
    if (!selectedSchool) throw new Error('No school selected');

    const { data, error } = await supabase
      .from('scores')
      .insert({
        student_id: score.studentId,
        class_level: score.classLevel,
        subject: score.subject,
        test1: score.test1,
        group_work: score.groupWork,
        test2: score.test2,
        project: score.project,
        exam: score.examScore,
        school_id: selectedSchool.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding score:', error);
      throw error;
    }

    if (data) {
      setScores(prev => [...prev, {
        id: data.id,
        studentId: data.student_id,
        classLevel: data.class_level as ClassLevel,
        subject: data.subject,
        test1: Number(data.test1) || null,
        groupWork: Number(data.group_work) || null,
        test2: Number(data.test2) || null,
        project: Number(data.project) || null,
        examScore: Number(data.exam) || null,
        schoolId: data.school_id,
      }]);
    }
  };

  const updateScore = async (id: string, updates: Partial<SubjectScore>) => {
    const { error } = await supabase
      .from('scores')
      .update({
        test1: updates.test1,
        group_work: updates.groupWork,
        test2: updates.test2,
        project: updates.project,
        exam: updates.examScore,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating score:', error);
      throw error;
    }

    setScores(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const getScoresByClassAndSubject = (classLevel: string, subject: string) => {
    return scores.filter(s => s.classLevel === classLevel && s.subject === subject);
  };

  const getStudentsByClass = (classLevel: string) => {
    return students.filter(s => s.classLevel === classLevel);
  };

  const clearSubjectData = async (classLevel: string, subject: string) => {
    if (!selectedSchool) throw new Error('No school selected');

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('class_level', classLevel)
      .eq('subject', subject)
      .eq('school_id', selectedSchool.id);

    if (error) {
      console.error('Error clearing subject data:', error);
      throw error;
    }

    setScores(prev =>
      prev.filter(s => !(s.classLevel === classLevel && s.subject === subject))
    );
  };

  const updateSettings = async (updates: Partial<SchoolSettings>) => {
    if (!selectedSchool) throw new Error('No school selected');

    const { data: existing } = await supabase
      .from('school_settings')
      .select('id')
      .eq('school_id', selectedSchool.id)
      .maybeSingle();

    const updateData: any = {
      school_name: updates.schoolName,
      logo_url: updates.schoolLogo,
      motto: updates.motto,
      email: updates.email,
      academic_year: updates.academicYear,
      term: updates.term,
      phone1: updates.contacts?.[0],
      phone2: updates.contacts?.[1],
      total_school_days: updates.totalSchoolDays,
      interest_options: updates.interestOptions,
      conduct_options: updates.conductOptions,
      next_term_begins: updates.nextTermBegins,
      school_id: selectedSchool.id,
    };


    if (existing) {
      const { error } = await supabase
        .from('school_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('school_settings')
        .insert(updateData);

      if (error) {
        console.error('Error inserting settings:', error);
        throw error;
      }
    }

    setSettings(prev => ({ ...prev, ...updates }));
  };

  const login = async (email: string, password: string, isSchoolAdmin?: boolean): Promise<boolean> => {
    // If this is a school admin login (credentials from schools table)
    if (isSchoolAdmin) {
      setIsAdmin(true);
      if (selectedSchool) {
        await fetchData();
      }
      return true;
    }

    // Otherwise, try Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return false;
    }

    if (data.user) {
      // Keep local state in sync immediately (auth listener will also update).
      setSession(data.session ?? null);
      setUser(data.user);

      const hasAdminRole = await checkAdminRole(data.user.id);
      setIsAdmin(hasAdminRole);

      // Refresh data after login using an authenticated session.
      if (hasAdminRole && selectedSchool) {
        await supabase.auth.getSession();
        await fetchData();
      }

      return hasAdminRole;
    }

    return false;
  };

  const logout = async () => {
    // Clear school admin session
    sessionStorage.removeItem('adminSession');
    
    await supabase.auth.signOut();
    setIsAdmin(false);
    setUser(null);
    setSession(null);
  };

  return (
    <SchoolContext.Provider
      value={{
        students,
        scores,
        settings,
        isAdmin,
        user,
        loading,
        subscriptionExpiry,
        subscriptionDaysRemaining,
        addStudent,
        updateStudent,
        deleteStudent,
        addScore,
        updateScore,
        getScoresByClassAndSubject,
        getStudentsByClass,
        clearSubjectData,
        updateSettings,
        login,
        logout,
        refreshData,
        checkSchoolAdminSession,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}