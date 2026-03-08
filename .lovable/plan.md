

## Plan: Update Remark System & Modernize Bulk PDF UI

### 1. Update `TOTAL_SCORE_REMARKS` to split into Headteacher & Class Teacher remarks

**File: `src/types/school.ts`**

Replace `TOTAL_SCORE_REMARKS` with two new arrays:

```typescript
export const HEADTEACHER_REMARKS = [
  { min: 0, max: 99, remark: 'There is the need to sit up.' },
  { min: 100, max: 249, remark: 'Buck up in weaker subjects.' },
  { min: 250, max: 299, remark: 'There is the need for increased parental support.' },
  { min: 300, max: 399, remark: 'There is the need for extra motivation to sit up.' },
  { min: 400, max: 449, remark: 'Good work done, keep it up.' },
  { min: 450, max: 499, remark: 'Impressive performance, the sky can be your limit.' },
  { min: 500, max: 649, remark: 'Do not rest on your oars because you can go beyond the sky.' },
  { min: 650, max: 699, remark: 'What a promising performance. Keep it up!' },
  { min: 700, max: 899, remark: 'Incredible display of academic prowess. Keep it up!' },
  { min: 900, max: 1000, remark: 'You are simply a genius. Keep it up!' },
];

export const CLASS_TEACHER_REMARKS = [
  { min: 0, max: 99, remark: 'Below average. There is the need for parental support.' },
  { min: 100, max: 249, remark: 'Below average, you must work hard. There is the need for parental support.' },
  { min: 250, max: 299, remark: 'You must sit up. There is the need for parental support.' },
  { min: 300, max: 399, remark: 'Average performance, more room for improvement.' },
  { min: 400, max: 449, remark: 'Well done but more room for improvement.' },
  { min: 450, max: 499, remark: 'More room for improvement.' },
  { min: 500, max: 649, remark: 'Good work done, keep improving.' },
  { min: 650, max: 699, remark: 'Excellent, keep it up.' },
  { min: 700, max: 899, remark: 'Incredible display of academic prowess. Keep it up!' },
  { min: 900, max: 1000, remark: 'Excellent performance. Keep working hard.' },
];
```

Keep the old `TOTAL_SCORE_REMARKS` for backward compatibility or remove it.

### 2. Add lookup functions in `src/lib/gradeUtils.ts`

Add `getHeadteacherRemark(totalScore)` and `getClassTeacherRemark(totalScore)` functions that look up the appropriate remark from the new arrays.

### 3. Update PDF generation in `src/pages/BulkPDF.tsx`

- **Class Teacher Remark** (line 459): Use auto-generated `getClassTeacherRemark(grandTotal)` instead of `report?.class_teacher_remark` (which is always empty/N/A since the class_teacher_reports table stores per-student data entered by teachers, but the remark field is typically not filled).
- **Headteacher Remark** (line 479): Use `getHeadteacherRemark(grandTotal)` instead of `getTotalScoreRemark(grandTotal)`.

### 4. Modernize the Bulk PDF page UI (`src/pages/BulkPDF.tsx`)

Make the page more colorful and modern:
- Add a gradient header section with an icon and description
- Use colored cards with subtle gradients for the class selector
- Add a colorful progress bar with animated gradient
- Style the generate button with a gradient background
- Add a stats preview showing matched student count before generating
- Use framer-motion for fade-in animations

