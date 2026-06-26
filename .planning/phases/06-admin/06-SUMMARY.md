# Phase 6: Admin Portal + Reporting — Summary

**Built:** 2026-06-26 (autonomous) · **Branch:** `feature/phase-6-admin` (stacked on phase-4; Phase 5 PARKED)
**Status:** Code complete + Playwright-E2E verified (all ADM-01..06, as a real admin). DB applied live. No new external accounts (admin is internal).

## What was built
A `/admin/*` portal for foundation staff: see/filter all pickups + manually assign; manage users (role + deactivate); manage partner orgs + link donors; impact report (meals/kg) + CSV export.

| Area | Files |
|---|---|
| Schema | `schema.ts` (+`partners` + `partner_type` enum + `profiles.partnerId` + `profiles.deactivatedAt`); migration `0004` **applied live + partners RLS** (deny-anon) |
| Repos | `pickups` (+`listForAdmin`/`assignToVolunteer` atomic/`impactReport` SUM-FILTER), `profiles` (+`listAll`/`listAssignableVolunteers`/`setRole`/`deactivate`/`reactivate`/`setPartner`), new `partners` CRUD |
| Auth | `session.getSession` now blocks soft-deactivated users (fail-open on DB error) |
| Actions (NOT-trust-boundary) | `adminActions.ts` — assignPickup, setUserRole, deactivate/reactivateUser, setUserPartner, partner CRUD — each `requireRole(["admin"])` first line + self-guard; role = DB-mirror-then-Clerk; deactivate = soft + best-effort `banUser`; assign emits `pickup/claimed` |
| Validations/lib | `partner` + `filters` Zod schemas (+`parseAdminFilters`), `csv` (formula-injection-safe `toCsv`/`csvCell`) |
| UI (`/admin/**`) | dashboard (4 links), pickups (filters + inline assign), users (role select + deactivate, self-guard), partners (RHF+Zod CRUD + link-donor), reports (servings/kg/count + CSV link); `pickups/export` route (`text/csv` + Content-Disposition) |

## Verification (all green)
`typecheck` ✓ · `lint` ✓ (1 pre-existing font warning) · `test` ✓ **92 passed** (+29: csv 10, partner 5, filters 6, adminActions 7, session +1) · `build` ✓ 19 routes (6 `/admin/*`).

**Playwright E2E as a real admin (donor promoted via Clerk Backend API):**
- ADM-01: `/admin/pickups` lists all + filters; ADM-02: **assigned** a requested pickup → `accepted` + status_event(actor=admin) (DB-confirmed).
- ADM-03: `/admin/users` role select + "applies on next sign-in"; **own row shows "Your account"** (self-guard); **deactivate→reactivate** (DB-confirmed, Clerk banUser/unbanUser succeeded).
- ADM-04: created a partner via the form (DB-confirmed) + link-donor UI.
- ADM-05: report = **40 servings / 0 kg / 1 delivery** (separate, D-07); ADM-06: export = `text/csv` attachment with rows.
- Admin RBAC dashboard access. **0 console errors.** Test data + the donor's role were restored after.

## Code review (react-review) → fixed
- **HIGH** `deletePartner` FK violation (linked donor) → generic crash → now returns CONFLICT "Unlink donors first" + the list surfaces it.
- **HIGH** role-change Clerk-first → DB-mirror-then-Clerk (no silent role drift on a DB blip).
- **MED** `getSession` DB read now fail-open (a DB error no longer 500s all auth; soft-deactivate best-effort).
- **LOW** filter `blankToUndefined` trims.
- Deferred (noted, low/operational): resolver-cast smell (versions), assign TOCTOU (rare), **last-admin lockout guard** (v1.5 — self-guard covers the common case), date-input max, controlled role select, admin-date i18n, delete confirm dialog.

## Decisions / deviations
- `clerkClient` is async in v7 (`await clerkClient()`). Role source of truth = Clerk publicMetadata; `profiles.role` is the mirror.
- Soft-deactivate (`deactivatedAt`) enforced in `getSession` (not middleware — no edge DB read) + best-effort Clerk `banUser`.
- Admin-wide repo reads are non-owner-scoped BY DESIGN; the `requireRole(["admin"])` gate is the boundary (re-checked in every action + page + the export route).
- partners RLS deny-anon; CSV formula-injection guard (unit-tested).

## Deferred / setup (see `06-DEFERRED-SETUP.md`)
Only touchpoint: make a real staff member an admin (set their Clerk `publicMetadata.role="admin"`). No new accounts/services.

## Stacked PR
PR #5 base = `feature/phase-4-notifications`. Phase 5 (Payments) PARKED; Phase 7 (Public/i18n/PWA) is the remaining phase.
