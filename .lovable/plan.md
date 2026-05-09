## Issues to fix

### 1. Class names should accept letters (e.g. Basic 1A, Basic 2B)
`src/pages/ClassManagement.tsx` currently forces a numeric input with `parseInt` and rejects anything that isn't a number 1–12. Super Admin needs to add classes like `Basic 1A`, `Basic 2B`.

**Change:**
- Replace the numeric `<Input type="number">` with a text input that accepts an alphanumeric suffix (e.g. `1`, `1A`, `2B`, `10A`).
- Validation: regex `^\d{1,2}[A-Za-z]?$` (one or two digits, optional single letter). Letter is uppercased.
- Final stored name stays in the existing `Basic <suffix>` format so downstream `classLevel` ids (lowercased, stripped of spaces — e.g. `basic1a`) keep working with `Dashboard`, `ClassCard`, `ScoreEntry`, etc.
- Update the placeholder ("e.g. 1A") and helper text ("Enter a number, optionally followed by a letter, e.g. 1, 1A, 2B").
- Keep the edit flow: extract suffix from `Basic XYZ` instead of just digits.

### 2. School admin gets bounced from /dashboard back to "/"
Root cause: After a successful school-admin login (the credentials set by Super Admin during school creation), `Login.tsx` stores an `adminSession` in `sessionStorage` and navigates to `/dashboard`. But `Dashboard.tsx` redirects to `/` whenever there is **no Supabase `user` and no `teacherId`**:

```ts
if (!user && !teacherId) { navigate('/'); return; }
```

School admins authenticate via the custom `schools.admin_email`/`admin_password_hash` flow, so `user` is always `null` for them. They have no `teacherId`. Result: instant bounce back to landing.

**Change:** Treat a valid `adminSession` (matching the currently selected school) as a valid login signal in `Dashboard.tsx`.

```ts
const adminSession = sessionStorage.getItem('adminSession');
const hasSchoolAdmin = adminSession && (() => {
  try {
    const s = JSON.parse(adminSession);
    return s?.isAdmin && s?.schoolId === selectedSchool?.id;
  } catch { return false; }
})();
if (!user && !teacherId && !hasSchoolAdmin) { navigate('/'); return; }
```

Also audit other authenticated pages that use the same `!user && !teacherId` pattern (Settings, StudentManagement, TeacherManagement, ClassManagement, BulkPDF, ClearData, ClassPortal, ScoreEntry, ClassTeacherReport) and apply the same `hasSchoolAdmin` check so school admins aren't bounced from any of them. Extract a small helper `getSchoolAdminSession(selectedSchoolId)` in `src/lib/utils.ts` (or a new `src/lib/session.ts`) and reuse it.

### Files to change
- `src/pages/ClassManagement.tsx` — alphanumeric class suffix input + validation + edit extraction.
- `src/lib/session.ts` (new, small helper) — `hasValidSchoolAdminSession(schoolId)`.
- `src/pages/Dashboard.tsx` — use helper in the auth guard.
- Other gated pages listed above — same helper in their auth guards.

### Out of scope
- No DB schema changes. No changes to login credential handling itself (that flow already works — only the post-login redirect is broken).
- No changes to teacher login.
