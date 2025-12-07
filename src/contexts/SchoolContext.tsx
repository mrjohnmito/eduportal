import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, SubjectScore, SchoolSettings, ClassLevel } from '@/types/school';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface SchoolContextType {
  students: Student[];
  scores: SubjectScore[];
  settings: SchoolSettings;
  isAdmin: boolean;
  user: User | null;
  loading: boolean;
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  addScore: (score: Omit<SubjectScore, 'id'>) => Promise<void>;
  updateScore: (id: string, updates: Partial<SubjectScore>) => Promise<void>;
  getScoresByClassAndSubject: (classLevel: ClassLevel, subject: string) => SubjectScore[];
  getStudentsByClass: (classLevel: ClassLevel) => Student[];
  clearSubjectData: (classLevel: ClassLevel, subject: string) => Promise<void>;
  updateSettings: (updates: Partial<SchoolSettings>) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all data from database
  const fetchData = async () => {
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      if (studentsError) throw studentsError;
      
      setStudents(studentsData?.map(s => ({
        id: s.id,
        name: s.name,
        classLevel: s.class_level as ClassLevel,
        photo: s.photo_url || undefined,
      })) || []);

      // Fetch scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*');
      
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
      })) || []);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('school_settings')
        .select('*')
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setSettings({
          schoolName: settingsData.school_name,
          schoolLogo: settingsData.logo_url || undefined,
          motto: settingsData.motto || 'Humble Beginners',
          email: settingsData.email || '',
          academicYear: settingsData.academic_year || '2024/2025',
          term: settingsData.term || 'First Term',
          contacts: [settingsData.phone1 || '', settingsData.phone2 || ''].filter(Boolean),
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
          setIsAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id).then(setIsAdmin);
      }
    });

    // Fetch initial data
    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    await fetchData();
  };

  const addStudent = async (student: Omit<Student, 'id'>) => {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: student.name,
        class_level: student.classLevel,
        photo_url: student.photo || null,
      })
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
        classLevel: data.class_level as ClassLevel,
        photo: data.photo_url || undefined,
      }]);
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const { error } = await supabase
      .from('students')
      .update({
        name: updates.name,
        class_level: updates.classLevel,
        photo_url: updates.photo,
      })
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

  const getScoresByClassAndSubject = (classLevel: ClassLevel, subject: string) => {
    return scores.filter(s => s.classLevel === classLevel && s.subject === subject);
  };

  const getStudentsByClass = (classLevel: ClassLevel) => {
    return students.filter(s => s.classLevel === classLevel);
  };

  const clearSubjectData = async (classLevel: ClassLevel, subject: string) => {
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('class_level', classLevel)
      .eq('subject', subject);

    if (error) {
      console.error('Error clearing subject data:', error);
      throw error;
    }

    setScores(prev =>
      prev.filter(s => !(s.classLevel === classLevel && s.subject === subject))
    );
  };

  const updateSettings = async (updates: Partial<SchoolSettings>) => {
    const { data: existing } = await supabase
      .from('school_settings')
      .select('id')
      .maybeSingle();

    const updateData = {
      school_name: updates.schoolName,
      logo_url: updates.schoolLogo,
      motto: updates.motto,
      email: updates.email,
      academic_year: updates.academicYear,
      term: updates.term,
      phone1: updates.contacts?.[0],
      phone2: updates.contacts?.[1],
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
    }

    setSettings(prev => ({ ...prev, ...updates }));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return false;
    }

    if (data.user) {
      const hasAdminRole = await checkAdminRole(data.user.id);
      setIsAdmin(hasAdminRole);
      return hasAdminRole;
    }

    return false;
  };

  const logout = async () => {
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