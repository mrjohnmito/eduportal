

## Rebuild BulkPDF.tsx — Modern Academic Report Card

The entire `src/pages/BulkPDF.tsx` file was accidentally wiped. It needs to be fully rewritten from scratch, restoring and improving the modern report card design.

### What will be rebuilt

**Single file: `src/pages/BulkPDF.tsx`** — complete rewrite (~600 lines)

**Page UI:** Class selection dropdown, generate button, progress indicator (same pattern as before using MainLayout, useSchool, Supabase class fetching).

**PDF Generation per student:**

1. **Header** — Deep blue accent bar across top, centered school logo, school name (serif bold, blue), motto (italic), contacts (small gray), rounded "ACADEMIC REPORT CARD" banner with blue gradient, term/year info

2. **Colored Photo** — Large photo box at top-right corner with the student's uploaded color photo

3. **Student Info Card** — Rounded rectangle with shadow effect, light gray fill, two-column grid:
   - Name, Class, Index Number, Position (badge-style)
   - Conduct, Next Term Begins
   - Grayscale version of student photo in a small box inside the card

4. **Scores Table** — autoTable with:
   - Blue header row for Subject column
   - Yellow tint for Class Score / Exam Score columns
   - Peach tint for Overall / Grade / Remark columns
   - Alternating row colors (white / light blue-gray)
   - Grade color-coded badges: Green (1-3), Amber (4-6), Red (7-9)

5. **Grand Total & Aggregate** — Summary bar with gradient, large bold total, pill-shaped aggregate badge

6. **Attendance Row** — Days present / total days

7. **Remarks** — Two side-by-side cards:
   - Class Teacher: blue left border accent, remark text, signature line
   - Headteacher: emerald left border accent, remark text, signature line

8. **Footer** — Thin accent line, school contacts, "Generated on" timestamp

### Dependencies used
- `jspdf` + `jspdf-autotable` for PDF
- `useSchool()` context for students, scores, settings
- `gradeUtils.ts` for score calculations
- Supabase client for fetching classes and student photos

This fixes the build error (missing default export) and restores the full feature.

