
## Goal
When the Super Admin creates a school and sets an Admin Email + Admin Password, those exact credentials should log into that school via the Admin tab on `/login`.

## Current State (already partly built)
- `SuperAdminDashboard.tsx` saves `admin_email` and `admin_password_hash` (base64) on the `schools` row when creating/editing a school.
- `Login.tsx` (Admin tab) reads `schools.admin_email` + `schools.admin_password_hash`, decodes and compares, then sets a `sessionStorage` admin session and calls `login(...)`.

So the wiring exists, but a few gaps cause it to feel broken:

1. **Email & password are optional on creation** — Super Admin can save a school with no admin credentials, leaving the school unable to log in.
2. **No feedback if login fails on the credentials path** — it silently falls through to Supabase Auth and returns the generic “invalid credentials” toast, hiding the real cause.
3. **Old/edited passwords**: editing a school without typing a new password keeps the old hash (this is fine, but should be made explicit in UI text).
4. **No way for Super Admin to verify** which email/password is currently set (password is write-only, which is correct, but the email should be clearly visible — it already is in the table).

## Plan

### 1. Make admin credentials required on school create
File: `src/pages/SuperAdminDashboard.tsx`
- When `editingSchool` is null (creating a new school), require both `formAdminEmail` and `formAdminPassword` before submit.
- Validate email format and minimum password length (≥6).
- Show inline toast error if missing/invalid.
- Keep current behavior on edit: leaving password blank keeps the existing hash.

### 2. Tighten the login flow
File: `src/pages/Login.tsx` (Admin tab handler)
- Keep the existing schools-table credential check as the primary path.
- If the entered email matches `schools.admin_email` but the password does not match the decoded hash, immediately show “Invalid admin password for this school” instead of falling through to Supabase Auth (which produces a misleading message).
- Only fall through to Supabase Auth when the entered email does NOT match `schools.admin_email` (so super admins can still sign in if they ever use this screen).
- Trim email and compare case-insensitively (already done for email; also trim whitespace).

### 3. Small UX clarifications
File: `src/pages/SuperAdminDashboard.tsx`
- Update the password field helper text on create to: “This email and password will be used to log into the school as Admin.”
- On edit, keep: “Leave blank to keep current password.”

### 4. No schema changes
- `schools.admin_email` and `schools.admin_password_hash` already exist; no migration needed.
- We continue storing the password as base64 in `admin_password_hash` to stay compatible with the existing login code. (If you later want true hashing, that’s a separate change.)

## Out of scope
- Migrating to real password hashing (bcrypt/argon2) via an edge function.
- Changing how Teachers or Super Admins log in.

## Expected result
- Creating a school in Super Admin requires admin email + password.
- Those exact credentials log the user into that school on `/login` → Admin tab.
- Wrong password against a known school email gives a clear, correct error.
