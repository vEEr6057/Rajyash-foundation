# Phase 6: Admin Portal + Reporting - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Foundation staff (role=`admin`) get an **admin portal** under `/admin/*` to: view + filter all
pickups and manually assign an unassigned one to a volunteer; manage users (change role,
deactivate); manage **partner organizations** + link donor users to them; and pull an **impact
report** (meals/kg rescued, by date range) with **CSV export**.

Requirements: **ADM-01..06**. Builds on Phase 1 (Clerk RBAC + `/admin` route group already
403-gated in middleware), Phase 2 (pickups + status machine), Phase 4 (notify on admin-assign).

**Out of scope** (parked / later): **donation/revenue reporting (Phase 5 Payments — PARKED)**;
public site (Phase 7); i18n (Phase 7); bulk ops; audit log UI; partner self-service.
</domain>

<decisions>
## Implementation Decisions

### Admin RBAC + pages
- **D-01:** All admin pages live under `src/app/admin/**` (the `/admin(.*)` route group is already
  admin-only via middleware — 403 for non-admins). Every admin **server action re-checks**
  `requireRole(["admin"])` (no reliance on middleware; AUTH-05). Pages are server components;
  thin, feature-module-backed.
- **D-02:** Pages: `/admin/dashboard` (overview + links), `/admin/pickups` (ADM-01/02),
  `/admin/users` (ADM-03), `/admin/partners` (ADM-04), `/admin/reports` (ADM-05/06).

### ADM-01 view + filter pickups
- **D-03:** Admin pickups list shows ALL pickups (not owner-scoped) with filters: status, date
  range (created/window), donor, volunteer. Server-side filtering in a repo query
  (`pickupsRepo.listForAdmin(filters)`). Reuse `PickupStatusPill`, `PickupCard`-style rows.

### ADM-02 manual assign
- **D-04:** Admin can assign a `requested` pickup to a chosen volunteer: sets `volunteer_id`,
  `status='accepted'`, `claimed_at`, records a `status_events` row (actor = admin), and **emits
  `pickup/claimed`** (Phase 4 → donor notified). Atomic conditional UPDATE (only if still
  `requested`). A new action `assignPickup(pickupId, volunteerId)`.

### ADM-03 manage users
- **D-05:** Admin user list = all `profiles`. **Change role**: update Clerk `publicMetadata.role`
  via the Clerk **Backend SDK** (`clerkClient().users.updateUserMetadata`) AND mirror to
  `profiles.role` (single transaction-ish; Clerk is the source of truth for the session claim).
  **Deactivate** = **soft**: set `profiles.deactivatedAt` (new column) and block the user in
  `getSession`/middleware (deactivated → signed out / 403). Reversible (reactivate clears it).
  No hard delete. An admin cannot deactivate/demote themselves (guard).

### ADM-04 partners (BOTH — user-locked)
- **D-06:** New `partners` org entity (CRUD): `id, name, type, contactName, contactPhone,
  contactEmail, address, city, createdAt, updatedAt` where `type` ∈ {restaurant, hall,
  event_planner, family, other}. AND **link donor users to a partner**: add
  `profiles.partnerId` (nullable FK → partners.id); admin sets it on the user/partner screens.
  (Optional `pickups.partnerId` is deferred — the report can attribute via the donor's partner.)

### ADM-05 impact report
- **D-07:** Sum **delivered** pickups in a date range (by `delivered_at`): **total servings**
  (Σ quantity where unit=servings) + **total kg** (Σ quantity where unit=kg), shown **separately**
  (no lossy conversion — user-locked), plus delivery count. A repo aggregate
  `pickupsRepo.impactReport(from, to)`.

### ADM-06 CSV export
- **D-08:** Export the **filtered pickups list** as CSV (the data staff want), via a route handler
  `/admin/pickups/export` (or a server action returning a CSV string) → `text/csv` +
  `Content-Disposition: attachment`. Build the CSV string server-side (no Node-only lib — Workers
  runtime; simple escaped join). Also offer the impact summary numbers on the reports page.

### Reuse
- `requireRole`, repos, `pickupsRepo`, status machine, `PickupStatusPill`, design tokens, forms
  (RHF+Zod) for partner CRUD, TanStack Query where a client list needs interactivity (else server).
- Inngest emit for admin-assign (Phase 4 `pickup/claimed`).
</decisions>

<canonical_refs>
## Canonical References
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (ADM-*), `.planning/ROADMAP.md` §"Phase 6".
- `.planning/phases/{02-rescue-loop,04-notifications}/*-SUMMARY.md` (patterns: repos, actions, emits).
- `.claude/rules/{frontend-practices,testing-practices,git-workflow}.md`.
- Code: `src/middleware.ts` (`/admin` gate), `src/server/auth/session.ts` (getSession — add deactivated block),
  `src/server/db/{schema,repositories/{pickups,profiles}}.ts`, `src/features/pickups/actions/pickupActions.ts`
  (assign mirrors claim + emit), `src/config/constants.ts` (ROUTES.adminDashboard exists).
</canonical_refs>

<code_context>
## Existing Code Insights
- `/admin(.*)` already 403-gated in middleware; `ROUTES.adminDashboard = "/admin/dashboard"` exists but no page yet.
- `pickupsRepo` has owner-scoped queries; add admin-wide `listForAdmin` + `impactReport` + `assign`.
- `profilesRepo` has getById/upsert/listVolunteerIds; add `listAll`, `setRole`, `deactivate`, `setPartner`.
- Clerk Backend SDK: `import { clerkClient } from "@clerk/nextjs/server"` → `clerkClient().users.updateUserMetadata`.
- Phase 4 `inngest.send(pickup/claimed)` to notify the donor on admin-assign.

## Integration Points
- New table `partners` (+ enum partner_type) + `profiles.partnerId` + `profiles.deactivatedAt` → migration via MCP + RLS (deny-anon).
- New admin feature module `src/features/admin/**` (or extend pickups/profiles features).
- getSession must return/handle `deactivatedAt` → block deactivated users.
</code_context>

<specifics>
## Specific Ideas
- Admin screens are functional + token-styled (not fancy); mobile-OK but desktop-first (staff use laptops).
- Self-protection guards: an admin can't demote or deactivate their own account.
- CSV must escape commas/quotes/newlines.
</specifics>

<deferred>
## Deferred Ideas
- Donation/revenue reporting (with Phase 5). pickups.partnerId auto-link. Audit-log UI, bulk actions,
  partner self-service, CSV of the impact aggregate (numbers shown on-page instead).
</deferred>

---

*Phase: 6-Admin Portal + Reporting*
*Context gathered: 2026-06-26*
