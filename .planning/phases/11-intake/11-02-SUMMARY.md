# 11-02 SUMMARY — Intake UI + i18n + migration

**Status:** complete (human-verify checkpoint skipped per no-stop directive; validated via tsc/lint/tests + prod column check)

## What was built
- `ROUTES.adminSurplusNew` (`/admin/surplus/new`) + dashboard nav card.
- `PickupForm`: optional `onSubmit`/`submitLabel`/`submitting` props (reuse, not fork) — calls `onSubmit(d)` instead of createPickup when provided.
- `AdminSurplusForm` (INT-02): native partner `<select>` + reused PickupForm → `logSurplus`.
- `/admin/surplus/new` page: admin-gated server component, lists partners.
- `VerifyToggle` (INT-03): admin-only badge + verify/unverify button on pickup detail; wired into `[id]/page.tsx` behind `isAdmin`.
- i18n EN/GU/HI: `admin.surplus.*`, `admin.pickup.verify.*`, `dashboard.surplus*`. Catalog-parity green.
- Migration `0009_intake_columns.sql` applied to Supabase prod; columns verified present.

## Verification
- `tsc` clean; eslint clean; full suite 268/268; prod `pickups` has partner_id/verified_at/verified_by.

## Requirements: INT-01/02/03 fully wired to UI.
