import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Student, SubjectScore, SchoolSettings, ClassLevel, AdminUser } from '@/types/school';

interface SchoolContextType {
  students: Student[];
  scores: SubjectScore[];
  settings: SchoolSettings;
  isAdmin: boolean;
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addScore: (score: Omit<SubjectScore, 'id'>) => void;
  updateScore: (id: string, updates: Partial<SubjectScore>) => void;
  getScoresByClassAndSubject: (classLevel: ClassLevel, subject: string) => SubjectScore[];
  getStudentsByClass: (classLevel: ClassLevel) => Student[];
  clearSubjectData: (classLevel: ClassLevel, subject: string) => void;
  updateSettings: (updates: Partial<SchoolSettings>) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const defaultSettings: SchoolSettings = {
  schoolName: 'IBRAHIM MEMORIAL SCHOOL COMPLEX',
  motto: 'Humble Beginners',
  email: 'ibrahimmemorialfoundationschool@gmail.com',
  academicYear: '2024/2025',
  term: 'First Term',
  contacts: ['0557387992', '0545231646'],
};

const defaultAdmin: AdminUser = {
  email: 'ibrahimmemorialfoundationschool@gmail.com',
  password: 'IBMFS@123',
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('school_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [scores, setScores] = useState<SubjectScore[]>(() => {
    const saved = localStorage.getItem('school_scores');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem('school_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('school_admin_logged') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('school_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('school_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('school_settings', JSON.stringify(settings));
  }, [settings]);

  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...student,
      id: crypto.randomUUID(),
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setScores(prev => prev.filter(s => s.studentId !== id));
  };

  const addScore = (score: Omit<SubjectScore, 'id'>) => {
    const newScore: SubjectScore = {
      ...score,
      id: crypto.randomUUID(),
    };
    setScores(prev => [...prev, newScore]);
  };

  const updateScore = (id: string, updates: Partial<SubjectScore>) => {
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

  const clearSubjectData = (classLevel: ClassLevel, subject: string) => {
    setScores(prev =>
      prev.filter(s => !(s.classLevel === classLevel && s.subject === subject))
    );
  };

  const updateSettings = (updates: Partial<SchoolSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const login = (email: string, password: string): boolean => {
    if (email === defaultAdmin.email && password === defaultAdmin.password) {
      setIsAdmin(true);
      localStorage.setItem('school_admin_logged', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem('school_admin_logged');
  };

  return (
    <SchoolContext.Provider
      value={{
        students,
        scores,
        settings,
        isAdmin,
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
