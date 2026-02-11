

## Add "Master Sheet" Feature

### Overview
Create a new "Master Sheet" page that generates a summary of student performance for a chosen class, with filters for academic year, term, and optionally a specific subject. Users can download the report as Excel (.xlsx) or PDF. Also add a quick action card on the dashboard linking to this page.

---

### New File: `src/pages/MasterSheet.tsx`

A multi-step page with the following flow:

**Step 1 - Select Class Level**
- Fetch classes from the database (like BulkPDF does)
- Display a dropdown to pick a class

**Step 2 - Select Subject**
- Show a dropdown with all subjects from `SUBJECTS` constant plus an "All Subjects" option
- Default to "All Subjects"

**Step 3 - Export Format**
- Two buttons: "Excel (.xlsx)" and "PDF"

**Step 4 - Confirm and Generate**
- Show a summary of selections
- Generate button triggers the export

**Report Content:**
For each student in the selected class, show:
- Student Name
- For each subject (or selected subject): Class Score (50%), Exam Score (50%), Overall, Grade, Remark
- Total Score and Position (when "All Subjects")

The data comes from the existing `students` and `scores` arrays in `SchoolContext`, filtered by the selected class level. Academic year and term are taken from the current school settings.

**Excel Export:** Uses the existing `xlsx` library to create a spreadsheet with formatted columns.

**PDF Export:** Uses `jsPDF` + `autoTable` to create a landscape PDF table with the same color-coded columns as the report card (blue headers, yellow score columns, peach overall/grade columns).

---

### Changes to Existing Files

**`src/App.tsx`** (1 change)
- Add route: `<Route path="/master-sheet" element={<MasterSheet />} />`
- Import the new MasterSheet component

**`src/components/dashboard/QuickActions.tsx`** (1 change)
- Add a new action card to the `commonActions` array:
  - Route: `/master-sheet`
  - Icon: `FileSpreadsheet`
  - Label: "Master Sheet"
  - Description: "Class performance summary"
  - Colors: indigo theme (bg-indigo-50, bg-indigo-500)

---

### Technical Details

- Reuses existing utilities: `calculateScores`, `calculatePositions`, `getPositionSuffix` from `gradeUtils.ts`
- Reuses existing constants: `SUBJECTS` from `types/school.ts`
- Fetches classes from Supabase filtered by `school_id` (same pattern as BulkPDF)
- Uses `useSchool()` for students, scores, and settings data
- No database changes needed -- all data already exists
- Follows the same page layout pattern as BulkPDF (MainLayout wrapper, back button, card-based UI)

