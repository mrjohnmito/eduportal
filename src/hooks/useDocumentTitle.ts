import { useEffect } from 'react';
import { useSchool } from '@/contexts/SchoolContext';

export function useDocumentTitle(suffix?: string) {
  const { settings } = useSchool();

  useEffect(() => {
    const schoolName = settings?.schoolName;
    
    if (schoolName) {
      document.title = suffix ? `${suffix} | ${schoolName}` : schoolName;
    } else {
      document.title = suffix ? `${suffix} | Edu Portal` : 'Edu Portal - School Management System';
    }

    return () => {
      document.title = 'Edu Portal - School Management System';
    };
  }, [settings?.schoolName, suffix]);
}
