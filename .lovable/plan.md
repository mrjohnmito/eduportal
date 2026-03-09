

## Plan: Super Admin Messaging, Inbox & Dashboard Modernization

### 1. Create `admin_messages` Database Table

New migration to create a messaging table:

```sql
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Super admins can insert/manage all messages
CREATE POLICY "Super admins can manage messages" ON public.admin_messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can view messages by school (school admins use sessionStorage auth)
CREATE POLICY "Anyone can view messages by school" ON public.admin_messages
  FOR SELECT TO public USING (true);

-- Anyone can update messages (for marking read)
CREATE POLICY "Anyone can update messages by school" ON public.admin_messages
  FOR UPDATE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
```

### 2. Super Admin Dashboard — Add Messaging Section

**File: `src/pages/SuperAdminDashboard.tsx`**

- Add a "Send Message" dialog with: school selector (dropdown of all schools or "All Schools"), subject field, message textarea
- Insert one row per target school (or one per school if "All Schools" selected)
- Add a "Messages" tab/section showing sent message history
- Modernize with framer-motion animations and gradient header (matching the design language from BulkPDF)

### 3. School Admin Header — Add Inbox with Blinking Badge

**File: `src/components/layout/Header.tsx`**

- For admin users: add a Mail/Inbox icon button next to Settings
- Fetch unread message count from `admin_messages` where `school_id = selectedSchool.id AND is_read = false`
- Show a pulsing red badge with count when > 0
- On click, open an inbox dialog/sheet showing messages sorted by date
- Mark messages as read when opened
- Subscribe to realtime changes for live updates

### 4. Admin Login Already Uses Super Admin Password

The current flow already works: Super admin sets `admin_password_hash: btoa(password)` during school creation, and `Login.tsx` decodes with `atob()` and compares. **No changes needed here.**

### 5. Modernize School Admin Dashboard

**File: `src/pages/Dashboard.tsx`**

- Add gradient header section with school branding
- Use framer-motion for staggered card animations
- Add colorful stat cards (total students, total classes, subscription status)
- Improve class card grid with gradient backgrounds

### 6. Add Back Buttons to All Sub-Pages

**Files:** `src/pages/StudentManagement.tsx`, `src/pages/Settings.tsx`, `src/pages/ClearData.tsx`, `src/pages/TeacherManagement.tsx`, `src/pages/ClassManagement.tsx`, `src/pages/ClassTeacherReport.tsx`, `src/pages/BulkPDF.tsx`

- Ensure each page has a prominent back button (← Back to Dashboard) at the top using `navigate('/dashboard')`
- Some pages already have this (ClassPortal, ScoreEntry, ClearData) — verify and add where missing

### Summary of Files Changed

| File | Change |
|---|---|
| Migration SQL | Create `admin_messages` table with RLS + realtime |
| `src/pages/SuperAdminDashboard.tsx` | Add messaging UI + modern gradient styling |
| `src/components/layout/Header.tsx` | Add inbox icon with blinking unread badge + message dialog |
| `src/pages/Dashboard.tsx` | Modernize with gradients, animations, stat cards |
| `src/pages/StudentManagement.tsx` | Ensure back button present |
| `src/pages/Settings.tsx` | Ensure back button present |
| `src/pages/TeacherManagement.tsx` | Ensure back button present |
| `src/pages/ClassManagement.tsx` | Ensure back button present |
| `src/pages/ClassTeacherReport.tsx` | Ensure back button present |

