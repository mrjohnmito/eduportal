

## Fix Report Card Issues

### 3 issues to address:

**1. Teacher's Remark showing "N/A"**
The `class_teacher_reports` table is currently empty — no teacher has submitted any reports yet, so `report?.class_teacher_remark` correctly returns "N/A". The code logic is correct. However, to improve UX, I'll change the fallback text from "N/A" to something more informative like "No remark entered" and add a console log during generation showing how many reports were matched, so admins can troubleshoot.

**2. Stretched student photos in PDF**
Currently both the color photo (line 193) and grayscale photo (line 302) use fixed width/height that don't preserve aspect ratio. Fix: load the image into an `Image` element to get natural dimensions, then calculate fitted dimensions that maintain aspect ratio within the allocated box.

**3. Increase image upload limit from 2MB to 5MB**
Two files need updating:
- `src/pages/StudentManagement.tsx` — lines 126-131 and label text at lines 636, 782
- `src/pages/SuperAdminDashboard.tsx` — lines 185-190 and label text at line 499

Change `2 * 1024 * 1024` → `5 * 1024 * 1024` and update all "2MB" labels to "5MB".

### Changes summary

| File | Change |
|---|---|
| `src/pages/BulkPDF.tsx` | Fix photo aspect ratio for both color and grayscale photos; improve remark fallback text |
| `src/pages/StudentManagement.tsx` | Change upload limit from 2MB to 5MB (code + labels) |
| `src/pages/SuperAdminDashboard.tsx` | Change upload limit from 2MB to 5MB (code + labels) |

### Photo aspect ratio fix detail
Add a helper function `getImageDimensions(dataUrl)` that returns `{width, height}`. Then when placing photos, calculate fitted dimensions:
```
const ratio = Math.min(boxW / imgW, boxH / imgH);
const drawW = imgW * ratio;
const drawH = imgH * ratio;
const offsetX = (boxW - drawW) / 2;
const offsetY = (boxH - drawH) / 2;
```
This centers the photo within its box while maintaining aspect ratio.

