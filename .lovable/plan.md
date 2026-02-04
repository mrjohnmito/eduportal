
## Fix Report Card Layout and Admin Login Issue

### Issue 1: PDF Report Card Student Information Layout

**Problem**: The student information section on the academic report card has inconsistent spacing, overflow issues with the "Next Term Begins" field, and poor alignment.

**Root Cause**: In `src/pages/BulkPDF.tsx` (lines 238-300):
- The info box height is only 28mm which is too small for 3 rows of content
- Text positioning is hardcoded without proper column alignment
- The "Next Term Begins" value starts at position `margin + 173` which can overflow the box edge
- Inconsistent spacing between rows (8px each but starting position causes crowding)

**Solution**:
- Increase the info box height from 28mm to 38mm to accommodate all content
- Implement a proper two-column grid layout with:
  - Left column (Student Name, Position, Interest)
  - Right column (Class, Aggregate, Conduct, Serial No, Attendance, Next Term Begins)
- Add consistent vertical spacing (7mm per row)
- Add proper internal padding (5mm from edges)
- Ensure all text stays within the bordered box boundaries

---

### Issue 2: Admin Login Credentials Not Working

**Problem**: When the Super Admin creates a school and sets admin email/password, the school admin cannot login with those credentials.

**Root Cause**: There is a fundamental mismatch in authentication systems:
1. The Super Admin stores admin credentials in the `schools` table:
   - `admin_email` - stored as plain text
   - `admin_password_hash` - stored using `btoa()` (base64 encoding - NOT secure hashing)

2. The admin login in `Login.tsx` uses `supabase.auth.signInWithPassword()` which authenticates against Supabase Auth's `auth.users` table - a completely different system!

3. The credentials set by Super Admin are NEVER used because the login function checks Supabase Auth, not the `schools` table.

**Solution**:
Modify the admin login flow to authenticate against the school's stored credentials:
1. When admin tries to login, first check if the email matches the school's `admin_email`
2. If it matches, decode the stored password (using `atob()`) and compare with the entered password
3. If credentials match, set the admin session (store in sessionStorage like teachers)
4. Update the `isAdmin` state based on this custom authentication

This approach:
- Uses the credentials that Super Admin actually sets
- Maintains data isolation per school (each school has its own admin)
- Doesn't require creating Supabase Auth users for each school admin

---

### Technical Details

**Files to Modify:**

1. **`src/pages/BulkPDF.tsx`** (PDF layout fix)
   - Increase info box height from 28 to 38
   - Reorganize text positioning for two-column layout with 4 rows:
     - Row 1: Student Name | Class, Serial No
     - Row 2: Position | Aggregate, Attendance
     - Row 3: Interest | Conduct
     - Row 4: Next Term Begins (full width or right-aligned)
   - Add proper padding and ensure no text touches borders
   - Adjust yPos offset after info box from 34 to 44

2. **`src/pages/Login.tsx`** (Admin login fix)
   - Modify `handleAdminLogin` to first check credentials against the `schools` table
   - If `selectedSchool.adminEmail` matches and password (decoded with `atob`) matches, authenticate
   - Store admin session in sessionStorage (similar to teacher flow)
   - Navigate to dashboard on success

3. **`src/contexts/SchoolContext.tsx`** (Session management)
   - Update the `isAdmin` check to also look for admin session in sessionStorage
   - Modify `login` function to support school-based admin authentication
   - Update `logout` to clear admin session from sessionStorage

4. **`src/components/dashboard/QuickActions.tsx`** (Ensure admin detection works)
   - Add check for sessionStorage admin flag similar to teacher check
