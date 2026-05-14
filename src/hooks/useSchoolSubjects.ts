import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { SUBJECTS } from '@/types/school';

/**
 * Returns the list of subjects relevant to the selected school's level
 * (Primary, JHS, or Both). Falls back to the legacy SUBJECTS constant
 * if nothing is configured yet.
 */
export function useSchoolSubjects(): { subjects: string[]; loading: boolean } {
  const { selectedSchool } = useSelectedSchool();
  const [subjects, setSubjects] = useState<string[]>([...SUBJECTS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Read the school's level
        let level: 'primary' | 'jhs' | 'both' = 'jhs';
        if (selectedSchool?.id) {
          const { data: schoolRow } = await supabase
            .from('schools')
            .select('school_level')
            .eq('id', selectedSchool.id)
            .maybeSingle();
          const lvl = (schoolRow as any)?.school_level as string | undefined;
          if (lvl === 'primary' || lvl === 'jhs' || lvl === 'both') level = lvl;
        }

        const levels = level === 'both' ? ['primary', 'jhs'] : [level];
        const { data, error } = await supabase
          .from('level_subjects' as any)
          .select('name, level')
          .in('level', levels);

        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setSubjects([...SUBJECTS]);
        } else {
          // De-dup
          const names = Array.from(new Set((data as any[]).map(r => r.name as string)));
          names.sort((a, b) => a.localeCompare(b));
          setSubjects(names);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedSchool?.id]);

  return { subjects, loading };
}