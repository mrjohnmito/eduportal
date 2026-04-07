
Fix the report-card photo by replacing the current PDF clipping approach with a safer image-preprocessing flow.

1. Replace the unreliable clipping logic in `src/pages/BulkPDF.tsx`
- I inspected the current file and the issue is coming from `addClippedImage(...)`, which uses raw PDF clipping commands.
- That clip is not being applied reliably, so the image is drawn over the frame instead of being contained by it.
- I’ll remove that dependency and switch to an offscreen canvas helper that crops the image before it is added to the PDF.

2. Make the main photo truly “fill the box”
- Add a helper like `preparePhotoForBox(...)` that:
  - loads the student photo,
  - center-crops it to the photo-frame aspect ratio,
  - scales it to fully cover the frame,
  - returns a ready-to-insert JPEG/PNG data URL.
- This will give true cover behavior: no distortion, no empty gaps, and no overflow.
- I’ll align the main photo frame to the requested 120x150 behavior by using a strict 4:5 aspect ratio in the export logic.

3. Apply the same containment fix to the small grayscale photo
- The small photo inside the student info card should use the same crop-first approach.
- Grayscale will be applied after the crop/resize step so the image stays properly aligned and sharp.

4. Clean up the frame rendering
- Draw the processed image only inside the exact inner photo bounds.
- Redraw the photo border/frame on top after the image so the edge stays clean and the picture never appears to sit “on” the box.
- Keep the existing placeholder only when a photo fails to load.

Technical details
- File to update: `src/pages/BulkPDF.tsx`
- Replace raw PDF clipping (`q`, `re`, `W`, `n`) with canvas-based crop-and-scale.
- Likely retire or stop using `addClippedImage`, and simplify the current `fillImage/getImageDimensions` flow around one image-preparation helper.
- This is a PDF export issue, not a browser CSS issue, so the fix will make the generated report card layout stable regardless of screen size by normalizing the photo before inserting it into the PDF.
