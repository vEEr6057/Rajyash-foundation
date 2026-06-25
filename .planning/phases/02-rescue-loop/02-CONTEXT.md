# Phase 2: Rescue Loop Core - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The end-to-end rescue loop: a **donor** posts a surplus-food pickup request; a **volunteer**
browses (list + map), claims it (race-safe), advances it through statuses
(accepted → en route → picked up → delivered), and uploads a proof-of-delivery photo. Builds on the
Phase 1 foundation (Clerk auth, RBAC, Drizzle/Supabase, design system).

Requirements: DON-01..06, VOL-01..06. **Out of scope** (later phases): live GPS tracking (Phase 3),
notifications (Phase 4), payments (Phase 5), admin management (Phase 6), public site (Phase 7).
No geofencing/distance filter, no recurring pickups (v2).
</domain>

<decisions>
## Implementation Decisions

### Food + quantity (DON-01)
- **D-01:** Pickup has a **preset food category** (pg enum): `cooked_meal`, `raw_produce`, `packaged`, `bakery`, `other`; plus a free-text `description`.
- **D-02:** Quantity = a number + **unit enum** (`servings`, `kg`). Keep it to those two units for v1.

### Images (DON-02, VOL-05) — Supabase Storage
- **D-03:** Photos (food photo on request + proof-of-delivery photo) live in **Supabase Storage** (private bucket `pickups`). Store the object path in the DB, not a public URL.
- **D-04:** Upload flow: **server action issues a signed upload URL** (service role); the client **compresses the image** (~1600px / JPEG) before uploading directly to Storage. Display via short-lived signed download URLs. This needs `@supabase/supabase-js` (Storage client) + the Supabase **service-role key** as a new server secret (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Add to env validation + Cloudflare secrets.

### Location (DON-01) — geocode + pin
- **D-05:** Donor types an address → **geocode to lat/lng** via **Nominatim/OpenStreetMap** (free, no key; respect 1 req/s + User-Agent) at creation time, server-side. A **Leaflet draggable pin** lets them fine-tune. Store `address`, `lat`, `lng`. (Mapbox geocoding is the upgrade if Ahmedabad accuracy is poor — needs a token, deferred.)

### Volunteer board (VOL-01, VOL-02) — simple
- **D-06:** Board shows **all open (status=requested) pickups**, newest first, as **list + Leaflet map** (markers from stored lat/lng). No filters/distance for v1.

### Claim concurrency (VOL-03)
- **D-07:** Claim is an **atomic conditional UPDATE**: `UPDATE pickups SET status='accepted', volunteer_id=:uid, claimed_at=now() WHERE id=:id AND status='requested' RETURNING *`. Zero rows updated → already claimed → return a friendly "just taken" error. No row locks/transactions needed.

### Status machine (VOL-04)
- **D-08:** Statuses: `requested → accepted → en_route → picked_up → delivered`, plus `cancelled` (donor, pre-claim only). A server-side `VALID_TRANSITIONS` map validates every change; invalid → rejected. Only the **assigned volunteer** can advance accepted→delivered; only the **donor** can cancel a still-`requested` pickup. Append a `status_events` audit row per transition.

### Donor edit/cancel/repost (DON-04, DON-05, DON-06)
- **D-09:** Donor can edit/cancel only while `status='requested'`. **Quick-repost** clones a prior pickup's fields into a new `requested` request (new id, fresh timestamps, no claim).

### Field UX (VOL-06)
- **D-10:** Status-advance + claim buttons show a **loading state** and an explicit **retry on failure** (mid-range Android / patchy 3G). Use the app motion budget (frugal); optimistic where safe, but the server is source of truth.

### Reuse from Phase 1 (Claude's discretion)
- Auth: `requireRole`/`requireUser`/`getSession` first line of every server action (AUTH-05 carries forward — no IDOR; donor can only edit own, volunteer can only advance own claim).
- Patterns: `src/features/pickups/` feature module (components/hooks/services/validations), `src/server/db/repositories/pickups.ts`, server actions for mutations, mock+adapter, design tokens + shadcn primitives + status pills (already tokenized) + skeletons.
- TanStack Query for the board; Zustand only if UI state needs it.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & scope
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (DON-*, VOL-*), `.planning/ROADMAP.md` §"Phase 2".
- `.planning/research/SUMMARY.md` (status-machine + claim + storage notes), `.planning/research/ARCHITECTURE.md`.
- `.planning/phases/01-foundation/01-SUMMARY.md` — what Phase 1 built (auth, schema, patterns) to reuse.

### Conventions + design (binding)
- `.claude/rules/frontend-practices.md`, `testing-practices.md`, `git-workflow.md` (stacked PRs).
- `docs/design/UI-SPEC.md`, `tokens/` (status pills already defined: requested/accepted/enroute/pickedup/delivered/cancelled), `tokens/MOTION.md` (app budget).

### Existing code to extend
- `src/server/db/schema.ts` (add pickups + status_events), `src/server/db/client.ts`, `src/server/db/repositories/profiles.ts` (repo pattern), `src/server/auth/session.ts`, `src/config/constants.ts` (add pickup statuses/categories), `src/config/env.ts` (add Supabase storage keys).

### Lessons
- `.claude/lessons/INDEX.md` — esp. stale-`.next` + create-next-app gotchas; recall before risky work.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireRole`/`requireUser`/`getSession` (`src/server/auth/session.ts`) — auth guard for all actions.
- `profilesRepo` (`src/server/db/repositories/profiles.ts`) — repository pattern to mirror for pickups.
- UI primitives `src/components/ui/{button,input,label,card}.tsx`; design tokens incl. per-status pill colors; `.rj-press`/`.rj-skeleton`/`.rj-field--error` motion classes.
- Drizzle client `getDb()` (per-request cache, prepare:false) — pickups repo uses it.

### Established Patterns
- Route groups: `(portal)` for donor+volunteer (authed+onboarded). Add `src/app/portal/pickups/*` (donor) + `src/app/portal/board/*` (volunteer). Thin pages → feature module.
- Server actions for mutations with first-line auth re-check; status machine validated in the service layer.

### Integration Points
- New env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server secrets → env.ts + Cloudflare). New dep: `@supabase/supabase-js` (Storage only). New dep: `react-leaflet` + `leaflet` (map). Geocoding: Nominatim fetch (no key).
</code_context>

<specifics>
## Specific Ideas
- Status pills must use the exact per-state tokens already in the design system.
- Mobile-first: the volunteer flow (board, claim, status advance, photo) is the field path — frugal motion, big tap targets, loading+retry.
</specifics>

<deferred>
## Deferred Ideas
- Live GPS tracking (Phase 3), notifications on status change (Phase 4), distance/geofence filter + recurring pickups (v2), donor-visible proof photo (v2).
None in Phase 2 scope.
</deferred>

---

*Phase: 2-Rescue Loop Core*
*Context gathered: 2026-06-26*
