# Phase 3: Live Tracking - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

While a pickup is **active** (`en_route` or `picked_up`), the **volunteer's browser** pings its
GPS location every ~30s; the **donor** (of that pickup) and any **admin** watch the volunteer's
marker move on a Leaflet map in near-real-time via **Supabase Realtime**, with a polling fallback
on disconnect and a **stale indicator** when pings stop. When the pickup is marked **delivered**
(or cancelled), all of its location pings are **purged immediately** (ephemeral, privacy).

Builds on Phase 2 (pickups + status machine + Leaflet `MapView`) and Phase 1 (Clerk auth, RBAC,
Drizzle/Supabase, design system).

Requirements: **TRK-01..04**.

**Out of scope** (later phases / v2): notifications on movement (Phase 4), admin "all active
pickups on one map" overview (Phase 6), ETA / route-line / distance-to-destination (v2),
turn-by-turn, geofencing, background/native location (web only — foreground tab).
</domain>

<decisions>
## Implementation Decisions

### Realtime authorization (THE crux — TRK-02) — **LOCKED**
- **D-01:** Browsers are authorized via **Clerk ↔ Supabase native third-party auth + RLS** (user-chosen).
  The browser builds a Supabase client with `accessToken: () => getToken()` (Clerk session token);
  Supabase validates it and RLS on `location_pings` decides visibility. **Most secure** option.
- **D-02:** New **deferred setup touchpoint** (end-of-project, with the other account setup):
  configure **Clerk as a Supabase third-party auth provider** (Supabase Dashboard → Authentication →
  Third-party Auth → Clerk; Clerk Dashboard → enable the Supabase integration / domain). Until wired,
  realtime falls back to the **polling path** (see D-06) so the feature degrades gracefully, not breaks.
- **D-03:** New **client** env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (publishable/anon key — safe in browser; RLS does the gating). Add to `env.ts` client block.

### Ping capture (TRK-01)
- **D-04:** Volunteer page uses the **browser Geolocation API** (`watchPosition`, high accuracy),
  **throttled to one write per ~30s**, active **only** while the volunteer's claimed pickup is
  `en_route` or `picked_up`. Consent is **best-effort / non-blocking**: if permission is denied or
  unavailable, the pickup still advances normally; a small banner explains tracking is off. A clear
  **"sharing your location" indicator** shows while active (`rj-live` pulse from the motion system).
- **D-05 (UPDATED per RESEARCH §A2):** Each throttled tick calls a **server action** `recordPing`
  (reuses `requireRole` + ownership + the en_route/picked_up status check), which INSERTs into
  `location_pings` (`id, pickup_id, volunteer_id, lat, lng, accuracy, created_at`) via the `postgres`
  role. **The browser is read/subscribe-only — it never writes with the anon key.** Append-only
  history (not upsert) — matches TRK-04's "purge the pings". Rationale: the write path then works
  **today** without the deferred Clerk↔Supabase auth wiring, and is secured by the same guards as
  every other action (no IDOR).

### Viewer (TRK-02, TRK-03)
- **D-06:** Donor/admin pickup-detail map subscribes to **Supabase Realtime Postgres Changes**
  (`INSERT` on `location_pings` filtered by `pickup_id`) and moves the volunteer marker. On
  subscription error / disconnect, a **10-second polling fallback** (server action reading the latest
  ping) takes over and auto-resumes realtime when possible. Map shows the **volunteer's live marker +
  the pickup destination marker** (stored donor lat/lng from Phase 2).
- **D-07:** **Stale indicator**: derive "last updated Xs/Xm ago" from the newest ping's `created_at`;
  if older than a threshold (~90s = 3 missed pings) show a muted **"location may be outdated"** badge
  and dim the marker. Live updates clear it.

### Purge (TRK-04) — **LOCKED: immediate**
- **D-08:** On transition to **`delivered`** (and on **`cancelled`**), the advance/cancel server
  action **DELETEs all `location_pings` for that pickup** in the same operation. No retention window,
  no cron needed. (Optional later safety-net: a cron sweep for abandoned `accepted`/stale pickups —
  deferred, not v1.)

### RLS (security)
- **D-09:** `location_pings` RLS: **INSERT** allowed only when `volunteer_id = auth Clerk user` AND
  they are the assigned volunteer of a pickup currently in `en_route`/`picked_up`; **SELECT** allowed
  only to that pickup's **donor** or an **admin**. Server writes still go through the `postgres` role
  (bypasses RLS) — RLS is the gate for the **browser** clients (publishable key). Mirrors the Phase 2
  pattern (RLS on; app role bypasses; anon/PostgREST blocked from PII).

### Reuse from Phase 1/2 (Claude's discretion)
- Extend `MapView`/`MapViewInner` (react-leaflet, dynamic `ssr:false`) for the live marker rather than
  a new map component; reuse status pills, motion classes (`rj-live`, skeletons), `requireRole`/
  ownership guards (no IDOR — only the pickup's donor/admin can view; only the assigned volunteer pings).
- Pings repo mirrors `repositories/pickups.ts`; query keys in `constants.ts` (`QUERY_KEYS.pings(id)`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & scope
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (TRK-*), `.planning/ROADMAP.md` §"Phase 3".
- `.planning/STATE.md` — note the **Phase 3 research flag**: confirm the Supabase Realtime JS client
  API for INSERT events on `location_pings` filtered by `pickup_id` (resolve in RESEARCH.md).
- `.planning/phases/02-rescue-loop/02-SUMMARY.md` — what Phase 2 built (pickups, status machine,
  `MapView`, storage) to reuse/extend.

### Conventions + design (binding)
- `.claude/rules/frontend-practices.md`, `testing-practices.md`, `git-workflow.md` (stacked PRs).
- `docs/design/UI-SPEC.md`, `tokens/` (status pills; **`rj-live` pulse** for live/tracking is already
  specified), `tokens/MOTION.md` (app budget — frugal; transform+opacity only; honor reduced-motion).

### Existing code to extend
- `src/server/db/schema.ts` (add `location_pings`), `src/server/db/client.ts`,
  `src/server/db/repositories/pickups.ts` (repo + atomic patterns to mirror; purge lives near advance),
  `src/features/pickups/components/MapView*.tsx`, `src/features/pickups/actions/pickupActions.ts`
  (advance/cancel get the purge; add ping read/insert actions), `src/config/{constants,env}.ts`.

### Lessons
- `.claude/lessons/INDEX.md` — recall before risky work (stale-`.next`, Clerk redirect props).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MapView` + `MapViewInner` (dynamic import, `ssr:false`) — extend for a moving/live marker.
- `requireRole`/`requireUser`/`getSession` (`src/server/auth/session.ts`) — guard ping read/write.
- `pickupsRepo` + atomic conditional-UPDATE pattern — mirror for pings; purge = scoped DELETE.
- Motion: `rj-live` pulse + `rj-skeleton` already in `globals.css`/`motion.css`.
- Drizzle `getDb()` (per-request cache, `prepare:false`).

### Established Patterns
- Server actions for mutations (first-line auth + ownership), `force-dynamic` pages, `revalidatePath`.
- Feature module `src/features/pickups/**` (add `hooks/useLiveLocation`, `services` for ping read).
- Status machine is the source of truth for "is this pickup trackable" (en_route/picked_up).

### Integration Points
- **New client env**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env.ts client block
  + Cloudflare vars). Browser Supabase client wired to Clerk token (`accessToken` option).
- **New table**: `location_pings` (+ RLS policies) — apply live via Supabase MCP (Phase 2 pattern).
- **Deferred dashboard setup**: Clerk ↔ Supabase third-party auth (graceful polling fallback until set).
- Existing dep `@supabase/supabase-js` already installed (used server-side for Storage) — reuse on client.
</code_context>

<specifics>
## Specific Ideas
- Mobile-first volunteer path: tracking runs on the volunteer's phone in the foreground tab; make the
  "sharing location" state obvious and the battery cost honest (foreground-only, ~30s cadence).
- Donor/admin view: marker glides (CSS transform), `rj-live` dot while fresh, dim + "outdated" when stale.
- Privacy is a feature: say plainly that the trail is deleted on delivery.
</specifics>

<deferred>
## Deferred Ideas
- ETA / route line / distance-to-destination (v2 — needs routing, e.g. OSRM).
- Admin "all active pickups" live overview map (Phase 6 admin portal).
- Cron safety-net purge for abandoned pickups (optional hardening, post-v1).
- Background / native-app location, geofencing, movement-triggered notifications (Phase 4 / v2).
</deferred>

---

*Phase: 3-Live Tracking*
*Context gathered: 2026-06-26*
