---
phase: "07"
plan: "03"
subsystem: "i18n / portal / admin"
tags: [i18n, portal, admin, next-intl, LanguageSwitcher, retrofit]
dependency_graph:
  requires:
    - "07-01 (catalog creation — portal.json, admin.json, common.json)"
    - "07-02 (public site i18n + LanguageSwitcher component)"
  provides:
    - "All portal + admin user-visible strings externalized to next-intl"
    - "LanguageSwitcher accessible from authed pages (portal + admin dashboards)"
  affects:
    - "src/features/pickups/components/*"
    - "src/features/notifications/components/*"
    - "src/features/admin/components/*"
    - "src/app/portal/**"
    - "src/app/admin/**"
    - "src/i18n/messages/en/portal.json"
    - "src/i18n/messages/en/admin.json"
tech_stack:
  added: []
  patterns:
    - "Server components: getTranslations('namespace') from next-intl/server"
    - "Client components: useTranslations('namespace') from next-intl"
    - "PickupStatusPill converted to 'use client' to use useTranslations"
    - "PickupCard + AdminPickupRow made async server components for getTranslations"
    - "Dual-namespace pattern: useTranslations('portal') + useTranslations('common') in same component"
key_files:
  modified:
    - src/features/pickups/components/PickupStatusPill.tsx
    - src/features/pickups/components/PickupCard.tsx
    - src/features/pickups/components/PickupForm.tsx
    - src/features/pickups/components/ClaimButton.tsx
    - src/features/pickups/components/StatusAdvanceSection.tsx
    - src/features/notifications/components/NotificationBell.tsx
    - src/features/notifications/components/NotificationFeed.tsx
    - src/features/admin/components/AssignVolunteerControl.tsx
    - src/features/admin/components/AdminPickupRow.tsx
    - src/features/admin/components/AdminPickupFilters.tsx
    - src/features/admin/components/UserRow.tsx
    - src/features/admin/components/PartnerForm.tsx
    - src/features/admin/components/PartnerList.tsx
    - src/features/admin/components/LinkDonorControl.tsx
    - src/features/admin/components/ImpactReport.tsx
    - src/app/portal/pickups/page.tsx
    - src/app/portal/pickups/new/page.tsx
    - src/app/portal/pickups/[id]/page.tsx
    - src/app/portal/board/page.tsx
    - src/app/portal/dashboard/page.tsx
    - src/app/admin/dashboard/page.tsx
    - src/app/admin/pickups/page.tsx
    - src/app/admin/users/page.tsx
    - src/app/admin/partners/page.tsx
    - src/app/admin/reports/page.tsx
    - src/i18n/messages/en/portal.json
    - src/i18n/messages/en/admin.json
    - src/features/notifications/components/NotificationBell.test.tsx
decisions:
  - "PickupStatusPill converted to 'use client' (added directive + useTranslations) — the component is used in both server pages and client contexts; making it a client island is the clean path without prop-drilling a label string."
  - "PickupCard made async server component to call getTranslations — avoids making it a client island just for a single label."
  - "StatusAdvanceSection uses both portal and common namespaces (two useTranslations calls) to keep proofUpload/advanceButton in portal and status labels in common."
  - "LanguageSwitcher added to portal/dashboard header and admin/dashboard header (no shared layout file exists; the dashboards are the natural entry points for authed users)."
  - "volunteer/ feature directory does not exist — ClaimButton and StatusAdvanceSection are in src/features/pickups/components/. Plan's assumed paths were wrong; actual paths used."
  - "NotificationBell.test.tsx updated to wrap renders with NextIntlClientProvider (Rule 1 auto-fix — useTranslations threw without context in tests)."
metrics:
  duration: "~45 minutes"
  completed: "2026-06-27"
  tasks: 3
  files_modified: 28
---

# Phase 7 Plan 03: Portal + Admin i18n Retrofit Summary

Portal and admin authenticated UI fully retrofitted to next-intl: all hardcoded English strings replaced with `t()` keys, FOOD_CATEGORY_LABELS / PICKUP_STATUS_LABELS / PARTNER_TYPE_LABELS display lookups removed from components, LanguageSwitcher added to portal and admin dashboard headers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Retrofit portal pickup + volunteer components | d0a8239 | PickupStatusPill, PickupCard, PickupForm, ClaimButton, StatusAdvanceSection, portal.json |
| 2 | Retrofit portal pages + notifications + LanguageSwitcher | 29a133c | 5 portal pages, NotificationBell, NotificationFeed, portal.json |
| 3 | Retrofit admin components + pages + LanguageSwitcher | 1d5a2da | 8 admin components, 5 admin pages, admin.json, NotificationBell.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NotificationBell tests crashed after adding useTranslations**
- **Found during:** Task 3 test run
- **Issue:** `NotificationBell.tsx` now calls `useTranslations("portal")` but the test file rendered the component without a `NextIntlClientProvider` wrapper, causing the hook to throw "context from NextIntlClientProvider was not found."
- **Fix:** Updated `NotificationBell.test.tsx` to wrap render calls with `<NextIntlClientProvider locale="en" messages={...}>` containing the minimal portal.notifications messages needed by the component.
- **Files modified:** `src/features/notifications/components/NotificationBell.test.tsx`
- **Commit:** 1d5a2da

### Structural Adaptations (Not Bugs)

**2. [Deviation] volunteer/ feature directory does not exist**
- Plan assumed `src/features/volunteer/components/{ClaimButton,StatusAdvanceButton,VolunteerBoard}.tsx` but the actual files are `src/features/pickups/components/{ClaimButton,StatusAdvanceSection,VolunteerBoard — no such file}`.
- `VolunteerBoard` component does not exist — the volunteer board is implemented directly in `src/app/portal/board/page.tsx` as a server page. Retrofitted there instead.
- `StatusAdvanceButton` is `StatusAdvanceSection` in the actual codebase.
- All three actual files were successfully retrofitted.

**3. [Deviation] PickupStatusPill converted to 'use client'**
- Plan suggested leaving it as a server component. Because the component is synchronous (no async) and is rendered in both server and client trees (PickupCard server, AdminPickupRow server, ClaimButton/status-advance client contexts), the simplest correct approach is to add `'use client'` and `useTranslations`. No prop-threading needed.

**4. [Deviation] LanguageSwitcher placement — dashboard pages not shared layouts**
- No `portal/layout.tsx` or `admin/layout.tsx` exists. The LanguageSwitcher was added to `portal/dashboard/page.tsx` and `admin/dashboard/page.tsx` headers, which are the natural entry points for authenticated users. All other authed pages (pickups, board, users, partners, reports) are navigated from the dashboard, and users return to the dashboard between flows.
- Note: The switcher is not reachable from deep pages (e.g., pickup detail). Creating shared layouts is a follow-up (deferred-items below).

**5. [Deviation] portal.json and admin.json expanded with additional keys**
- The plan's catalog already had most keys from 07-01. Additional keys were added during implementation to cover all actually-rendered strings found in components: `portal.dashboard.title`, `portal.pickup.detail.{foodPhoto,deliveredPhoto,history}`, `portal.pickup.board.mapButton`, `portal.pickup.donor.firstPickupCta`, `admin.pickups.{noMatch,table.assigned,table.unassigned,assign.noVolunteers}`, `admin.users.{you,yourAccount,appliesNextSignIn}`, `admin.partners.{noPartners,noDonors,allPartners,addPartner,linkDonorTitle,editClose,form.contactEmail,form.city,form.addButton}`, `admin.reports.{exportButton,totalsNote}`, `admin.dashboard.{pickupsDesc,usersDesc,partnersDesc,reportsDesc}`.

## Pre-existing Test Failures (not introduced by this plan)

2 test files (`recipients.test.ts`, `pickupActions.purge.test.ts`) fail with "Invalid environment variables" — confirmed pre-existing by running `git stash && pnpm test:run` which showed the same 2 failures before any plan-03 changes.

## Known Stubs

None — all i18n keys are real EN strings, no placeholder values.

## Threat Flags

No new network endpoints, auth paths, or trust-boundary changes introduced. Retrofit is string-only; admin auth guard (`requireRole(["admin"])`) untouched in all admin pages.

## Self-Check: PASSED

Files exist:
- src/i18n/messages/en/portal.json: FOUND
- src/i18n/messages/en/admin.json: FOUND
- src/features/pickups/components/PickupStatusPill.tsx: FOUND (has useTranslations)
- src/features/admin/components/ImpactReport.tsx: FOUND (has useTranslations)
- src/app/portal/dashboard/page.tsx: FOUND (has LanguageSwitcher)
- src/app/admin/dashboard/page.tsx: FOUND (has LanguageSwitcher)

Commits exist:
- d0a8239: FOUND
- 29a133c: FOUND
- 1d5a2da: FOUND

Verification:
- `SKIP_ENV_VALIDATION=1 pnpm typecheck`: 0 errors
- `pnpm lint`: 0 errors, 1 pre-existing warning
- `pnpm test:run`: 111 tests pass, 2 pre-existing env-validation failures (unchanged from baseline)
