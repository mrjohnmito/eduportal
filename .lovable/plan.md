
Fix the photo corners by aligning the processed image to the exact inner photo frame and preserving rounded transparency all the way into the PDF.

1. Correct the actual root cause in `src/pages/BulkPDF.tsx`
- The current helper already clips the photo to rounded corners on canvas and exports a PNG.
- But the image is still inserted into the PDF as `'JPEG'`, which removes the transparent rounded corners.
- There is also a size mismatch: the helper prepares the photo for the full outer box, while the PDF draws it inside the inset area (`+1`, `-2`).

2. Make the image match the inner photo box exactly
- Compute the real drawable photo area first:
  - main photo: inner width/height = box size minus inset
  - small grayscale photo: same pattern
- Pass those exact inner dimensions into `preparePhotoForBox(...)` instead of the outer frame size.
- Add a corner-radius parameter so the helper uses the same rounding shape as the visible image area.

3. Preserve rounded corners in the PDF
- Keep `preparePhotoForBox(...)` output as PNG.
- Change both `doc.addImage(...)` calls from `'JPEG'` to `'PNG'`.
- This keeps the transparent clipped corners instead of flattening them.

4. Match the image corner radius to the frame radius
- Use the outer box radius and inset to derive the inner image radius so the photo corners visually follow the same curve as the photo box.
- Apply the same logic to:
  - the large top-left color photo
  - the small grayscale info-card photo

5. Keep the clean frame finish
- Draw the processed photo first inside the inner bounds.
- Redraw the rounded border/frame on top after the image.
- Keep the placeholder behavior unchanged for missing or failed photos.

Technical details
- File: `src/pages/BulkPDF.tsx`
- Update `preparePhotoForBox(...)` to accept exact target size + corner radius.
- Replace:
  - `preparePhotoForBox(rawPhoto, 32, 38)`
  - `preparePhotoForBox(rawPhoto, 14, 17, true)`
  with calls based on the actual inner draw area.
- Replace both `doc.addImage(..., 'JPEG', ...)` calls for processed photos with `doc.addImage(..., 'PNG', ...)`.

Expected result
- The photo will still fill the box without distortion.
- The image corners will visually match the rounded corners of the photo box instead of appearing square or sitting on top of the frame.
