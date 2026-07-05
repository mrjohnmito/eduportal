# Student Promotion Module

An admin-only module to move students between classes/academic years while preserving full history, with audit trail, duplicate prevention, and exportable reports.

## Key behaviours (from your choices)
- **Graduation** → graduated students are moved to a hidden **"Alumni"** bucket and excluded from active class lists, dashboards, and counts (all records kept).
- **Final-year rule** → a configurable **Final Year Class** in Settings; the *Graduate* action is only enabled when the selected current class matches it.
- **Destination academic year** → auto-incremented (e.g. `2024/2025 → 2025/2026`) but editable.
- **Reports** → both printable **PDF** and **Excel/CSV** export.

## Data model (new tables)

Because students currently store only a single `class_level` text field (no history), we add two tables.

```text
student_enrollments   -> the historical record (one row per student per year+class)
  school_id, student_id, academic_year, class_level,
  status: active | promoted | repeated | graduated
  UNIQUE (school_id, student_id, academic_year)

student_promotions    -> audit trail (who/when/what)
  school_id, student_id, student_name (snapshot),
  action: promote | repeat | graduate,
  from_academic_year, from_class,
  to_academic_year, to_class (nullable for graduate = 'Alumni'),
  performed_by (admin email from session), performed_at
```

- **Duplicate prevention**: partial unique index on `student_promotions (school_id, student_id, to_academic_year)` for `promote`/`repeat`, plus a pre-check in the UI so already-promoted students are shown disabled.
- **RLS/grants**: follow the app's existing pattern — policies scoped by `school_id`, grants to `anon`/`authenticated`/`service_role` — since school admins operate via the anon key (consistent with current tables and the security memory).

## Promotion logic (per student, on confirm)
- **Promote**: close source enrollment (`from` year/class → `promoted`), create destination enrollment (`to` year/class → `active`), set `students.class_level = toClass`, write audit row.
- **Repeat**: source → `repeated`, new enrollment for the *same* class in the destination year → `active`, `class_level` unchanged, audit row.
- **Graduate** (only when current class = Final Year Class): source → `graduated`, `students.class_level = 'Alumni'`, audit row (`to_class = 'Alumni'`).
- Runs sequentially with a live **progress bar**; per-row success/failure is tallied and reported.

## Frontend

**New page** `src/pages/StudentPromotion.tsx` (route `/promotion`, admin-only guard — teachers redirected):
- Selectors: Current Academic Year (default from settings), Current Class, Destination Academic Year (auto-filled, editable), Destination Class.
- Eligible list = students whose `class_level` = current class; table with per-row checkboxes + select-all, photo/name/class.
- Already-promoted-for-destination-year students shown with a badge and disabled checkbox.
- Action buttons: **Promote All**, **Promote Selected**, **Repeat Selected**, **Graduate Selected** (enabled only for final-year class).
- **Confirmation dialog** (AlertDialog) summarising action, source/destination, and student count before executing.
- Loading skeletons, progress bar during bulk run, success/error toasts.
- **Promotion Report** section: filter history by academic year / class, **Print** (opens print view), **Export PDF** (jsPDF + autotable), **Export Excel** (XLSX). Reuses the app's existing PDF/spreadsheet tooling (installed if missing).

**Settings** (`src/pages/Settings.tsx`): add a **Final Year Class** dropdown (persisted on `school_settings`, new `final_class` column).

**Dashboard** (`src/components/dashboard/QuickActions.tsx`): add an admin-only **Student Promotion** quick-action card (GraduationCap icon), linking to `/promotion`.

**Alumni hiding**: introduce an `ALUMNI_CLASS = 'Alumni'` constant and filter it out of active student lists/counts (SchoolContext consumers, StudentManagement, dashboard totals) so graduated students disappear from active views but remain queryable.

**Routing**: register `/promotion` in `src/App.tsx`.

## Styling
Matches the existing Modern Mesh theme (gradient blob backgrounds, glassmorphic cards, framer-motion entrance/hover), using semantic design tokens — no hardcoded colors.

## Technical notes
- Migration adds the two tables (with GRANTs + RLS + triggers) and the `school_settings.final_class` column.
- Audit `performed_by` is captured from the admin `sessionStorage` session email (consistent with the current auth model).
- All selector inputs validated before enabling actions; destination class/year required for promote/repeat.
