## Goal

Let the Super Admin save their contact details (name, WhatsApp number, email) once. Show a blinking "Contact admin for help" banner on:

1. The public landing page (school selection / homepage)
2. Every school admin dashboard (existing and future schools)

Clicking the banner opens a WhatsApp chat (`https://wa.me/<number>`) with the Super Admin.

## What gets built

### 1. Database — new `super_admin_contact` table

A single-row settings table (singleton pattern)

- `whatsapp` (text, digits only, used to build `wa.me` link)
- `email` (text)
- standard timestamps

RLS:

- Public SELECT (everyone needs to read it to render the banner — landing page has no auth)
- INSERT/UPDATE only allowed for users with the `super_admin` role
- No DELETE

Seed an empty default row so the UI always has something to update.

### 2. Super Admin dashboard — Contact Info card

In `src/pages/SuperAdminDashboard.tsx`, add a new section "Help / Contact Info" with a small form:

- WhatsApp Number (with hint: include country code, no `+` or spaces, e.g. `233557387992`)
- Email
- Save button → upserts the singleton row

Light validation: WhatsApp must be 8–15 digits; email must look like an email.

### 3. Reusable component — `ContactAdminBanner`

New file `src/components/ContactAdminBanner.tsx`:

- Fetches the singleton `super_admin_contact` row once (light, public read)
- Renders a pill/banner with blinking text "Contact admin for help" + small WhatsApp icon
- On click → `window.open('https://wa.me/<digits>?text=Hello%20Admin', '_blank')`
- Falls back to `mailto:` if WhatsApp is empty
- Hides itself entirely if no contact row exists or both fields are empty
- Blink effect via a small Tailwind keyframe added to `tailwind.config.ts` (`animate-blink`) so we don't hard-code colors; banner uses semantic tokens (`bg-primary/10`, `text-primary`, `ring-primary/30`)

### 4. Placement

- `src/pages/SchoolSelection.tsx` (the homepage at `/`) — render `<ContactAdminBanner />` near the top of the content, above or below the school grid
- `src/pages/Dashboard.tsx` — render `<ContactAdminBanner />` inside the school admin dashboard, just under the hero header

That's it — no other dashboards/pages per the user's choice.

## Out of scope

- Floating bubble version, teacher-portal placement, multiple super admin contacts, in-app chat, message history.
- No changes to existing auth, school code activation, classes, or scoring flows.

## Technical details

**Table**

```sql
create table public.super_admin_contact (
  id uuid primary key default gen_random_uuid(),
  name text,
  whatsapp text,
  email text,
  updated_at timestamptz not null default now()
);
alter table public.super_admin_contact enable row level security;
-- Public read
create policy "Anyone can read super admin contact"
  on public.super_admin_contact for select using (true);
-- Super admin write
create policy "Super admins can insert"
  on public.super_admin_contact for insert to authenticated
  with check (has_role(auth.uid(), 'super_admin'::app_role));
create policy "Super admins can update"
  on public.super_admin_contact for update to authenticated
  using (has_role(auth.uid(), 'super_admin'::app_role));
-- Seed singleton
insert into public.super_admin_contact (name, whatsapp, email) values (null, null, null);
```

**WhatsApp link helper**

```ts
const digits = (whatsapp ?? '').replace(/\D/g, '');
const href = digits ? `https://wa.me/${digits}?text=${encodeURIComponent('Hello Admin, I need help with Edu Pro')}` : null;
```

**Blink animation** (tailwind.config.ts → `theme.extend.keyframes` + `animation`):

```ts
keyframes: { blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } } },
animation: { blink: 'blink 1.2s ease-in-out infinite' },
```

**Files touched**

- New migration (table + RLS + seed)
- New `src/components/ContactAdminBanner.tsx`
- Edit `src/pages/SuperAdminDashboard.tsx` — add contact form section
- Edit `src/pages/SchoolSelection.tsx` — mount banner
- Edit `src/pages/Dashboard.tsx` — mount banner
- Edit `tailwind.config.ts` — add `blink` animation