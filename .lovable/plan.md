

## Analysis: Quick Actions Disappearing After School Deletion

### Understanding the Issue

After investigating the codebase, I identified that the **Quick Actions cards are NOT stored in the database** - they are hardcoded UI components in `src/components/dashboard/QuickActions.tsx`. The actions are static and defined in the `commonActions` array (lines 94-151).

The Quick Actions only display when one of these conditions is true:
- `isAdmin` is `true` (admin user logged in via Supabase Auth)
- `isTeacher` is `true` (teacher logged in via access code, stored in sessionStorage)

### Root Cause

When a school is deleted from the Super Admin dashboard, the following happens:
1. The school record is removed from the `schools` table
2. However, **related data is NOT automatically cleaned up** because there are no foreign key CASCADE constraints
3. If the deleted school's ID was stored in `sessionStorage` (via `SelectedSchoolContext`), any browser session that had selected that school now has **stale/orphaned data**
4. When other schools are selected, the old session data might conflict or cause authentication checks to fail

The specific issue is that after deleting a school:
- The `selectedSchool` in sessionStorage might still reference stale data
- Teacher verification (`sessionStorage.getItem('teacher')`) may fail or return null
- Admin role checks may return false if the user_roles entry was for the deleted school

### Solution

I'll fix this by ensuring the Quick Actions always display for both admins AND teachers, and add a fallback mechanism to handle cases where session state might be corrupted.

### Technical Details

**Files to Modify:**

1. **`src/components/dashboard/QuickActions.tsx`**
   - Add additional checks to ensure the component doesn't incorrectly hide when session data is stale
   - Add a fallback to check `teacherId` in addition to `teacher` JSON in sessionStorage (for robustness)

2. **`src/pages/SuperAdminDashboard.tsx`**
   - When deleting a school, also clean up any localStorage entries that might reference that school's ID
   - This prevents stale verification data from causing issues

**Changes Summary:**
- Make the QuickActions component more resilient to session state issues
- Add cleanup logic when schools are deleted to remove any cached verification data
- Ensure consistent teacher login state detection

