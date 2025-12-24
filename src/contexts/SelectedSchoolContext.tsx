import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { School } from '@/types/school';

interface SelectedSchoolContextType {
  selectedSchool: School | null;
  setSelectedSchool: (school: School | null) => void;
  clearSelectedSchool: () => void;
}

const SelectedSchoolContext = createContext<SelectedSchoolContextType | undefined>(undefined);

export function SelectedSchoolProvider({ children }: { children: ReactNode }) {
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(() => {
    const stored = sessionStorage.getItem('selectedSchool');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSelectedSchool = (school: School | null) => {
    setSelectedSchoolState(school);
    if (school) {
      sessionStorage.setItem('selectedSchool', JSON.stringify(school));
    } else {
      sessionStorage.removeItem('selectedSchool');
    }
  };

  const clearSelectedSchool = () => {
    setSelectedSchoolState(null);
    sessionStorage.removeItem('selectedSchool');
  };

  return (
    <SelectedSchoolContext.Provider
      value={{
        selectedSchool,
        setSelectedSchool,
        clearSelectedSchool,
      }}
    >
      {children}
    </SelectedSchoolContext.Provider>
  );
}

export function useSelectedSchool() {
  const context = useContext(SelectedSchoolContext);
  if (context === undefined) {
    throw new Error('useSelectedSchool must be used within a SelectedSchoolProvider');
  }
  return context;
}