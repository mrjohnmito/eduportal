# Student registration and photograph upload

## Inspection findings

This inspection covers the backend currently connected to this application (Lovable Cloud), not a separately owned Manage School Direct database.

- The existing `student-photos` bucket exists, is **public**, has no bucket-specific size or format restrictions, and currently contains **zero objects**.
- Storage RLS is enabled, but photo upload/update/delete policies check only the `admin` role, not the school folder. There is no private photo SELECT policy and no teacher photo upload policy. Public bucket URLs bypass private read restrictions.
- Student RLS is enabled, but additional public policies allow unrestricted SELECT, INSERT, UPDATE, and DELETE. Frontend school filters do **not** provide a security boundary against direct requests.
- `src/pages/StudentManagement.tsx`, `handlePhotoUpload`, uploads the original file immediately after selection. It accepts any `image/*` up to 5 MB, does not resize/compress, uses a school/random-filename path (with an `unknown` fallback), and saves a public URL.
- Add/edit previews exist, but only after uploading. Cancelled forms and replaced photos can leave unused files. There is no registration-in-progress lock or stable retry identity.
- `src/contexts/SchoolContext.tsx`, `addStudent` and `updateStudent`, write `photo_url` in the existing student record. Creation also sends `index_number`, which does not exist in this connected database; this can block registration.
- Teacher authentication code attempts to use `teachers.auth_user_id`, but that column is absent in this connected database. Teacher sign-in must be validated before claiming teacher upload support.

## Proposed changes

### Photo preparation and registration
- Reuse the existing bucket and `students.photo_url`; create no duplicate bucket, student table, or authentication system.
- Validate JPEG, PNG, and WebP inputs up to the existing 5 MB limit; reject corrupt or unsupported images.
- Resize large images and encode photographs as JPEG, targeting approximately 100–200 KB without enlarging already small images or sacrificing readability unnecessarily.
- Preview the prepared image locally before submission. Do not upload when selecting a file or cancelling a form.
- Show preparation, upload, saving, success, and actionable error states; prevent concurrent submissions and closing an active save.
- Assign a stable student UUID for a registration attempt and store photographs under `<school_id>/<student_id>/<unique-photo-id>.jpg`. Require a valid school and authenticated authorization; remove the `unknown` fallback.
- Keep the same registration identity through retries. Verify uncertain save results before retrying or removing files, so a lost response does not create another student or delete a successfully attached photograph.
- If saving definitely fails, remove only the newly uploaded unattached file. Replace an old photograph only after the new reference is confirmed saved; report cleanup failures rather than hiding them.
- Avoid submitting the unsupported `index_number` field on this backend without adding a column. Preserve existing index values where a supported record already provides them; explain the unavailable field in the form.

### Security changes requiring approval
These changes are necessary: compression and frontend filtering alone cannot make the current public photographs private.

- Make **only** `student-photos` private, and apply JPEG/PNG/WebP and file-size restrictions through the Storage API. Leave school logos unchanged.
- Replace the photo policies that lack school checks with authenticated policies that verify the user's protected school role and the student's actual school. Administrators manage their school's photographs; teachers access only explicitly assigned classes; super administrators retain explicitly authorized cross-school access.
- Replace unrestricted student policies with server-enforced school/assigned-class restrictions, preserving authorized registration and editing. Restrict dependent score/report access if those paths would otherwise expose student photographs or permit cross-school access.
- Resolve teacher authentication against the existing database without silently adding columns or users. If preserving the login flow requires a schema/authentication change, explain the exact change and obtain a further decision first.
- Use short-lived signed photo URLs for on-screen display and PDF/report generation. Store durable storage paths, not expiring signed URLs, in student records. Retain compatibility with existing photographs and do not delete student records.

## Validation
- Add and run focused tests for supported formats, the 5 MB input limit, compression target, school/student paths, repeated submission, retry recovery, and failure cleanup.
- Verify registration with a real signed-in school administrator: photo preview, upload, save, display after reload, and edit replacement.
- Check teacher access using an authorized teacher session once teacher authentication is confirmed working.
- Test anonymous and other-school requests against student records and photo download/upload/update/delete paths; require denial. No fake financial data or existing student deletion.
- Do not label authenticated checks complete if no suitable account/session is available. Report any specific remaining blocker.

## Preservation boundaries
No student record deletion, duplicate buckets, financial changes, unrelated redesign, or database schema changes are proposed. Existing access policies will change only with approval because the current policies cannot satisfy the requested privacy. Any broader authentication repair will be explained separately before implementation.