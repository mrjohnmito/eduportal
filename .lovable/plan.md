

## Redesign PDF Report Card to Match Reference Format

### Overview
Modify the PDF report card generation in `BulkPDF.tsx` to exactly match the reference image format. The new design features a cleaner layout with improved styling, proper column colors, and restructured sections.

---

### Key Visual Changes

**Header Section:**
- Add date/time stamp in top-left corner (format: DD/MM/YYYY, HH:MM)
- Student photo: Left-aligned with border
- School logo: Centered with school name in blue below
- School name in bold blue text, centered
- "Academic Report Card" subtitle
- Term and academic year

**Student Information Box:**
- Light gray background (not blue)
- Two-column layout with 3 rows:
  - Row 1: Name / Serial / Class
  - Row 2: Position / Aggregate
  - Row 3: Interest / Conduct / Attendance / Next Term Begins

**Scores Table:**
- Subject column: Blue background with white text
- Class Score (50%) column: Light yellow background
- Exam Score (50%) column: Light yellow background  
- Overall column: Light orange/peach background
- Grade column: Light orange/peach background
- Remark column: White background
- Blue header row

**Grand Total Section:**
- White background with border
- "Grand Total: X / 1000" on left side
- "Aggregate: X" on right side

**Remarks Section:**
- Two side-by-side boxes with blue underlined headers:
  - "Class Teacher's Remark:" (left box)
  - "Headteacher's Remark:" (right box)
- Both with "Signature & Date" at bottom

---

### Technical Details

**File to Modify:** `src/pages/BulkPDF.tsx`

**Changes Required:**

1. **Header Section (Lines ~179-227)**
   - Add timestamp text at top-left: `doc.text(currentDateTime, margin, 8)`
   - Keep student photo box at left (25x30mm)
   - Center school logo properly
   - Style school name in blue color using `doc.setTextColor(0, 102, 204)`

2. **Student Info Box (Lines ~238-310)**
   - Change fill color from light blue to light gray: `doc.setFillColor(245, 245, 245)`
   - Restructure grid layout to match 3-row format from image
   - Row 1: Name | Class | Serial
   - Row 2: Position | Aggregate
   - Row 3: Interest | Conduct | Attendance | Next Term Begins

3. **Scores Table (Lines ~312-372)**
   - Update column widths to match reference proportions
   - Subject column: Blue fill `[59, 130, 246]`
   - Class Score & Exam Score: Yellow fill `[255, 255, 200]`
   - Overall & Grade: Peach fill `[255, 218, 185]`
   - Remark: White background
   - Ensure alternating row styling is consistent

4. **Grand Total Section (Lines ~378-397)**
   - Change from rounded rectangle banner to simple bordered box
   - White background with thin border
   - Left-align "Grand Total: X / 1000"
   - Right-align "Aggregate: X"

5. **Remarks Section (Lines ~400-439)**
   - Change box styling: white background with thin border
   - Add blue underlined text for headers: "Class Teacher's Remark:"
   - Add italic quoted remark text
   - Add "Signature & Date" line at bottom of each box

6. **Additional Settings Field**
   - Add `nextTermBegins` field to `SchoolSettings` type
   - Add input field in Settings page to configure next term start date
   - Use this value in the PDF instead of hardcoded date

---

### Color Reference (RGB Values)

| Element | RGB Color |
|---------|-----------|
| School name | (0, 102, 204) - Blue |
| Subject column | (59, 130, 246) - Blue |
| Class/Exam Score columns | (255, 255, 200) - Light Yellow |
| Overall/Grade columns | (255, 218, 185) - Peach |
| Info box background | (245, 245, 245) - Light Gray |
| Header row | (59, 130, 246) - Blue |
| Remark header underline | (0, 102, 204) - Blue |

---

### Files to Modify

1. **`src/pages/BulkPDF.tsx`** - Main PDF generation logic
2. **`src/types/school.ts`** - Add `nextTermBegins?: string` to SchoolSettings
3. **`src/pages/Settings.tsx`** - Add input for Next Term Begins date
4. **`src/contexts/SchoolContext.tsx`** - Include `nextTermBegins` in settings fetch/update

