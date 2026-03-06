

## Fix Report Card Layout Issues

### Changes to `src/pages/BulkPDF.tsx`

**1. Remove deep blue accent bar at top** (lines 172-175)
- Delete the 4mm blue `doc.rect()` bar, start `y` at 2 instead.

**2. Remove the blue banner behind "ACADEMIC REPORT CARD"** (lines 223-233)
- Remove the two `roundedRect` calls (dark blue + lighter blue).
- Keep the "ACADEMIC REPORT CARD" text, render it as bold blue text on white background instead.

**3. Simplify scores table columns** (lines 308-334)
- Reduce headers to: `Subject`, `Class Score (50%)`, `Exam Score (50%)`, `Overall Total`, `Position`, `Grade`, `Remark`
- Need to calculate per-subject positions across students
- Update table body and column style indices accordingly

**4. Fix Headteacher's remark** (line 463)
- Currently `htRemark = totalRemark` (the score-based remark from `getTotalScoreRemark`), which is wrong — it's showing the total score remark in the headteacher box instead of an actual headteacher remark.
- Change to use `report?.head_teacher_remark || 'N/A'` (or similar field from class_teacher_reports table).

**5. Fix school name overlapping logo** (lines 194-206)
- The logo is drawn at `headerCenterX - 10` and the school name text starts at `y += 22` which may overlap. Add more spacing after logo.

**6. Shrink info card height** (line 243)
- Reduce `cardH` from 36 to ~28, and tighten `lineH` from 5.5 to 5.

### Subject Position Calculation
Need to add a helper that calculates each student's rank per subject within the class, so we can show "Position" per subject row.

