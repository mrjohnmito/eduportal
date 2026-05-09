/**
 * Returns true if a valid school-admin session exists in sessionStorage
 * for the given schoolId. Used by route guards on pages that allow either
 * a Supabase-authenticated user, a teacher, or a school admin (custom auth).
 */
export function hasValidSchoolAdminSession(schoolId?: string | null): boolean {
  if (!schoolId) return false;
  try {
    const raw = sessionStorage.getItem('adminSession');
    if (!raw) return false;
    const s = JSON.parse(raw);
    return !!(s && s.isAdmin && s.schoolId === schoolId);
  } catch {
    return false;
  }
}
