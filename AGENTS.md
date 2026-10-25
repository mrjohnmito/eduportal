# Project architecture
- Store durable student photograph object paths in `students.photo_url`; resolve private signed URLs only at display/export boundaries so expiring URLs are never persisted.
- Prepare photographs locally with browser-image-compression and upload immutable school/student-scoped objects only after a stable student identity is saved; retries reuse that identity to avoid duplicate students.
- Enforce student and photograph access with protected roles and database school/class predicates; never treat selected-school state or user-editable metadata as authorization.
- Keep photo lifecycle tests alongside the photo utilities and run them with Bun; browser image processing is verified separately with Playwright.