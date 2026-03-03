

## Fix Build Error + Modernize PDF Report Card

### Priority 1: Fix Critical Build Error

The `src/contexts/SchoolContext.tsx` file is broken -- the last edit accidentally removed the closing `};` of `defaultSettings` and the `SchoolProvider` function declaration + state initialization lines. This needs to be restored:

- Line 37: Add closing `};` after the contacts array
- Lines 38-43: Restore `const SchoolContext = createContext(...)`, `export function SchoolProvider(...)`, and the state declarations (`students`, `scores`, etc.)

### Priority 2: Modernize the PDF Report Card

Redesign `src/pages/BulkPDF.tsx` PDF generation to create a more modern academic report card:

**Header:**
- Add a subtle colored accent bar across the top of the page
- School logo centered with name in a modern serif-style bold font
- Motto in italic below, with contact info in a smaller font
- "ACADEMIC REPORT CARD" as a styled banner with rounded corners and gradient fill
- Term and academic year below the banner

**Student Info Section:**
- Modern card-style layout with rounded corners and subtle shadow effect (drawn via PDF rectangles)
- Two-column grid with label-value pairs using a clean sans-serif look
- Student photo in a rounded rectangle with a thin colored border
- Position displayed with a colored badge-style highlight

**Scores Table:**
- Clean modern table with:
  - Rounded header corners (simulated)
  - Alternating row colors (white / very light blue-gray)
  - Subject column with a left-aligned bold blue text (no fill)
  - Score columns with centered numbers
  - Grade column with color-coded badges: green for grades 1-3, amber for 4-6, red for 7-9
  - Thin column separators instead of heavy grid lines

**Grand Total & Aggregate:**
- Modern summary bar with gradient background
- Total score in large bold text, aggregate in a pill-shaped badge

**Remarks Section:**
- Two modern card-style boxes side by side
- Colored left border accent (blue for class teacher, green for headteacher)
- Clean typography with remark text and signature line

**Footer:**
- Thin accent line with school contacts centered below
- "Generated on" timestamp in light gray

### Files to Modify
1. `src/contexts/SchoolContext.tsx` -- Fix the broken syntax (restore missing lines)
2. `src/pages/BulkPDF.tsx` -- Complete PDF layout modernization

