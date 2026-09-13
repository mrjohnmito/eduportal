# Finance Module — School Fees & Daily Feeding Fees

## What I found in the existing system

Existing tables I will reuse (nothing duplicated, nothing recreated):

- `schools` — school identity, logo, code, level
- `students` — name, class_level, photo, `school_id`
- `student_enrollments` — academic_year, class_level, status per student
- `classes` — per-school class list
- `school_settings` — school name, logo, motto, email, phone1/phone2, current academic_year and term
- `user_roles` + `app_role` enum (`admin`, `teacher`, `super_admin`)
- Security functions `has_role(uuid, app_role)` and `get_user_school_id(uuid)`

Important finding about logins: school admins are provisioned as real backend auth accounts when they sign in (with an `admin` role row carrying their `school_id`). Super admins are real accounts too. Teachers sign in by access code only and have no account — so they will simply have no finance access, which matches your requirement.

This means every new finance table can be locked down to signed-in users only, scoped by `get_user_school_id(auth.uid())`. No "public/anyone" policies on any financial table, so a school can never see another school's money. `school_id` is never taken from the browser — it is enforced by the database policy itself. No existing policy is weakened.

There is no `accountant` role today. I will add it to the existing role enum (additive, non-destructive) and grant it payment + read + receipt rights.

## New tables

- `fee_types` — per-school list (Tuition, Examination, ICT, Development, Library, Sports, PTA, Admission, Other); seeded per school on first use
- `fee_structures` — school, academic_year, term, class_level
- `fee_structure_items` — structure, fee_type, amount (total computed)
- `student_fee_accounts` — student, academic_year, term, class_level; stores charged total, discount total, paid total, status; unique per student/year/term
- `student_fee_charges` — the individual fee lines copied onto a student's account when a structure is assigned
- `fee_payments` — one row per payment, never overwritten; method, reference, received_by, remarks, `voided_at`/`void_reason`
- `fee_receipts` — unique receipt number per payment (per-school sequence)
- `feeding_fee_settings` — school, academic_year, term, class_level, daily_rate, feeding_days
- `student_feeding_accounts` — per student/year/term, with an `is_excluded` flag for non-participants
- `feeding_fee_payments` — separate from school fee payments, same structure
- `fee_discounts` — student account, original amount, discount amount, reason, authorized_by, date
- `fee_audit_logs` — actor, action, entity, before/after snapshot, timestamp

Balances and statuses (UNPAID / PARTIALLY PAID / PAID / OVERPAID) are computed by database triggers from the charge and payment rows — never typed by a user. Payments are never deleted from the interface; a controlled void writes a reversal and an audit entry.

## Build order

1. Migration: tables, foreign keys, grants, RLS policies, balance triggers, audit triggers, `accountant` role.
2. Fee Structure page — build structures per year/term/class with live total.
3. Student Fees page — assign structures to enrolled students, per-student account view.
4. Record Payment + printable A4 receipt (school logo, contacts, previous/new balance).
5. Daily Feeding Fees — rate, days, per-class expected amount, exclusions, separate payments.
6. Student Financial Profile section inside the existing student view.
7. Fees Dashboard, Arrears, Class Fees Report, Daily Collection Report — with filters, print and export.

## UI

A new `Finance` area matching the current Modern Mesh look, reached from the dashboard, with sub-pages: Fees Dashboard, Fee Structure, Student Fees, Record Payment, Feeding Fees, Arrears, Receipts, Reports. Responsive, all amounts in GH₵. Teachers never see the Finance entry point.

## Verification after each stage

Students, scores, class teacher reports, promotion, bulk PDF and settings all continue to work untouched — no existing table, policy or page is modified except adding the Finance link to the dashboard.
