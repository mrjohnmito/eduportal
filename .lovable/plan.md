## Goal
Make the school code a one-time, school-wide activation. After any device successfully enters the correct code for a school, every other device will skip the school-code page and go straight to the login page when that school is clicked.

## Root cause
Right now `SchoolSelection.tsx` checks `localStorage.getItem('school_verified_<id>')`, which only exists on the device that entered the code. So device B has no record and gets sent back to `/school-code`.

## Approach
Move the "this school has been activated" flag from per-device localStorage to the database, on the `schools` table itself.

### 1. Database
Add a single column to `public.schools`:
- `activated_at timestamptz null` — set the first time the correct school code is entered.

No new RLS policies are needed (the existing public `SELECT` and the public/admin `UPDATE` paths used during code verification already cover this; we'll only allow setting `activated_at` from null → now via the existing update path used by `SchoolCodeVerification`).

### 2. `SchoolCodeVerification.tsx`
On a successful code match:
- If `activated_at` is null in the DB, update that school row to set `activated_at = now()`.
- Then continue with the existing flow (navigate to `/login`).
- Keep the local `school_verified_<id>` write only as a soft cache; it's no longer the source of truth.

### 3. `SchoolSelection.tsx`
Replace `isSchoolVerified(schoolId)` with a check against the school record itself:
- `const verified = !!school.activated_at;`
- If `verified && subscriptionValid` → navigate to `/login`.
- Else → navigate to `/school-code`.

Remove the localStorage-based 30-day check entirely. Update the `School` type and the row mapper in `fetchSchools` to include `activatedAt`.

### 4. Super Admin (optional but recommended)
In `SuperAdminDashboard.tsx`, surface an "Activated" badge per school and a "Reset activation" action that sets `activated_at` back to `null`. This lets the super admin force re-verification if a code is ever rotated.

## Result
- Device A enters the school code → school is marked activated in the DB.
- Device B (and every future device) clicks the school → goes straight to the login page.
- Super admin can reset activation if the code is changed.

## Files to change
- `supabase/migrations/<new>.sql` — add `activated_at` column.
- `src/types/school.ts` — add `activatedAt?: string`.
- `src/pages/SchoolSelection.tsx` — replace localStorage check with `school.activatedAt`.
- `src/pages/SchoolCodeVerification.tsx` — write `activated_at` to DB on first success.
- `src/pages/SuperAdminDashboard.tsx` — show activation status + reset button (optional).