# Plan

I'll proceed with these defaults (since you let me decide):
- **Visual direction:** Modern Mesh — vibrant blue/orange/emerald gradient orbs on white, bold sans-serif. Replaces all space/shooting-star theming.
- **Subjects scope:** Per school level (Primary vs JHS). Super admin maintains two global subject lists.
- **School level field:** Added to schools table; super admin picks Primary, JHS, or Both when creating a school.

## 1. Visual redesign (Modern Mesh)
- Update `src/index.css` design tokens: new gradients (`--gradient-mesh`, `--gradient-primary`), new shadow tokens, brighter primary (#3b82f6), accents orange (#f97316) + emerald (#10b981).
- Rewrite `src/pages/Index.tsx` (homepage) — animated mesh blobs, bold hero, feature bento grid. No shooting stars.
- Rewrite `src/pages/SchoolSelection.tsx` — light mesh background, clean school cards.
- Update `src/pages/SuperAdminLogin.tsx` and `src/pages/Login.tsx` — mesh-style backdrop instead of dark blobs.
- Refresh `src/pages/Dashboard.tsx` and `src/pages/SuperAdminDashboard.tsx` headers/cards to the new tokens.

## 2. Teacher sees only their assigned class(es)
- `src/pages/Dashboard.tsx`: when `teacherSession` exists, fetch the teacher's `teacher_class_assignments` and filter the rendered class cards to only those classes.
- All other dashboard widgets (students, subscription, etc.) hidden or scoped for teachers.

## 3. Super Admin Subjects by School Level
- **Migration:**
  - Add `school_level text` (`primary` | `jhs` | `both`) to `schools`.
  - New table `level_subjects(id, level, name, created_at)` with RLS: public SELECT, super_admin INSERT/UPDATE/DELETE.
- **Super Admin UI:** new "Subjects" tab in `SuperAdminDashboard.tsx` — two columns (Primary / JHS), add/remove subjects.
- **School creation form:** add Primary/JHS/Both selector.
- **ScoreEntry / ClassPortal:** replace hardcoded `SUBJECTS` constant with a hook `useSchoolSubjects()` that reads the school's level and pulls the matching `level_subjects`.

## Technical notes
- Keep existing teacher access-code auth (sessionStorage) — no changes to auth flow.
- Subject hook returns array of strings; falls back to current `SUBJECTS` constant if no rows yet (so existing schools keep working).
- Homepage uses Tailwind semantic tokens only (no hardcoded colors in JSX).

## Out of scope
- No data migration of existing scores (subject names stay as-is).
- No changes to PDF report layout.

Shall I proceed?