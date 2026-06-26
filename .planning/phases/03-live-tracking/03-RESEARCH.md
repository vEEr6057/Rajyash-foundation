# Phase 3: Live Tracking — Research

**Researched:** 2026-06-26
**Domain:** Realtime GPS tracking (volunteer browser pings → DB → donor/admin Leaflet map via Supabase Realtime), with polling fallback, stale indicator, and privacy purge
**Confidence:** HIGH — the Clerk↔Supabase native auth API, Realtime Postgres Changes, RLS interplay, and the `setAuth`/`role:authenticated` gotchas all verified against official Supabase + Clerk docs (June 2026) plus corroborating GitHub issues

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Browsers are authorized via **Clerk ↔ Supabase native third-party auth + RLS**. The browser builds a Supabase client with `accessToken: () => getToken()` (Clerk session token); Supabase validates it and RLS on `location_pings` decides visibility. Most secure option.
- **D-02:** New **deferred setup touchpoint**: configure **Clerk as a Supabase third-party auth provider** (Supabase Dashboard → Authentication → Sign In / Providers → Third Party Auth → Clerk; Clerk Dashboard → enable the Supabase integration / copy the Clerk domain). Until wired, realtime falls back to the **polling path** (D-06) so the feature degrades gracefully, not breaks.
- **D-03:** New **client** env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key — safe in browser; RLS does the gating). Add to `env.ts` client block.
- **D-04:** Volunteer page uses the **browser Geolocation API** (`watchPosition`, high accuracy), **throttled to one write per ~30s**, active **only** while the claimed pickup is `en_route` or `picked_up`. Consent is **best-effort / non-blocking**: if denied/unavailable, the pickup still advances; a small banner explains tracking is off. A clear **"sharing your location" indicator** shows while active (`rj-live` pulse).
- **D-05:** Each ping is an **INSERT** into `location_pings` (`id, pickup_id, volunteer_id, lat, lng, accuracy, created_at`). Append-only history (not upsert).
- **D-06:** Donor/admin pickup-detail map subscribes to **Supabase Realtime Postgres Changes** (`INSERT` on `location_pings` filtered by `pickup_id`) and moves the volunteer marker. On subscription error / disconnect, a **10-second polling fallback** (server action reading the latest ping) takes over and auto-resumes realtime when possible. Map shows the **volunteer's live marker + the pickup destination marker** (stored donor lat/lng from Phase 2).
- **D-07:** **Stale indicator**: derive "last updated Xs/Xm ago" from the newest ping's `created_at`; if older than ~90s (3 missed pings) show a muted **"location may be outdated"** badge and dim the marker. Live updates clear it.
- **D-08:** On transition to **`delivered`** (and on **`cancelled`**), the advance/cancel server action **DELETEs all `location_pings` for that pickup** in the same operation. No retention window, no cron.
- **D-09:** `location_pings` RLS: **INSERT** allowed only when `volunteer_id = auth Clerk user` AND they are the assigned volunteer of a pickup currently in `en_route`/`picked_up`; **SELECT** allowed only to that pickup's **donor** or an **admin**. Server writes go through the `postgres` role (bypasses RLS) — RLS is the gate for the **browser** clients (publishable key).

### Claude's Discretion
- Extend `MapView`/`MapViewInner` (react-leaflet, dynamic `ssr:false`) for the live marker rather than a new map component; reuse status pills, motion classes (`rj-live`, skeletons), `requireRole`/ownership guards (no IDOR — only the pickup's donor/admin can view; only the assigned volunteer pings).
- Pings repo mirrors `repositories/pickups.ts`; query keys in `constants.ts` (`QUERY_KEYS.pings(id)`).
- Mobile-first volunteer path: tracking runs on the volunteer's phone in the foreground tab; make the "sharing location" state obvious and the battery cost honest (foreground-only, ~30s cadence).
- Donor/admin view: marker glides (CSS transform), `rj-live` dot while fresh, dim + "outdated" when stale.
- Privacy as a feature: say plainly the trail is deleted on delivery.

### Deferred Ideas (OUT OF SCOPE)
- ETA / route line / distance-to-destination (v2 — needs routing, e.g. OSRM).
- Admin "all active pickups" live overview map (Phase 6 admin portal).
- Cron safety-net purge for abandoned pickups (optional hardening, post-v1).
- Background / native-app location, geofencing, movement-triggered notifications (Phase 4 / v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRK-01 | Volunteer's location is pinged during an active pickup (en route / picked up) | §D Geolocation `watchPosition` throttled to 30s; INSERT into `location_pings` (browser anon-key + RLS — §C decision); active only while `en_route`/`picked_up` |
| TRK-02 | Donor and admin can view the live pickup location on a map | §A Clerk↔Supabase native auth client + §B Realtime Postgres Changes INSERT subscription filtered by `pickup_id`; §E live Leaflet marker; §C SELECT RLS gates donor/admin |
| TRK-03 | The map shows a "last updated" stale indicator when pings stop | §B `.subscribe((status,err)=>…)` status drives 10s polling fallback; D-07 stale derivation from newest ping `created_at` (~90s threshold) |
| TRK-04 | Location pings are purged after delivery (ephemeral, privacy) | §C purge = scoped `DELETE FROM location_pings WHERE pickup_id=…` inside the `delivered`/`cancelled` server action (postgres role, bypasses RLS) |
</phase_requirements>

---

## Summary

Phase 3 layers realtime location on top of the Phase 2 rescue loop without touching the status machine. The volunteer's **browser** writes a GPS ping (~every 30s) while their claimed pickup is `en_route`/`picked_up`; the donor and admin **browser** subscribe to Supabase Realtime **Postgres Changes** (INSERT on `location_pings`, filtered by `pickup_id`) and glide a Leaflet marker. On any realtime disconnect a 10s polling server action takes over and auto-resumes. On `delivered`/`cancelled` the existing advance/cancel server action deletes the pickup's pings in the same operation.

**The crux is authorization (TRK-02), and the API changed in 2025.** Clerk deprecated the old "Supabase JWT template" on **April 1, 2025** in favor of Supabase **native Third-Party Auth**. Under the native model the browser builds its Supabase client with an `accessToken: async () => session?.getToken()` callback (Clerk's `getToken()` **with no template argument**), and RLS reads the Clerk user id from `auth.jwt() ->> 'sub'`. [CITED: supabase.com/docs/guides/auth/third-party/clerk; clerk.com/changelog/2025-03-31] — verified June 2026.

**Two non-obvious, silent-failure gotchas dominate this phase and must be planned for explicitly:**
1. **Realtime is NOT auto-authorized by the `accessToken` option.** The custom-JWT/`accessToken` path authenticates PostgREST/Storage but does **not** propagate the token to the Realtime WebSocket. You must call **`supabase.realtime.setAuth(token)`** after creating the client and again on every token refresh, or every channel silently fails RLS and receives **zero** events. [VERIFIED: supabase-js issue #553, realtime-js issue #274; Realtime Authorization docs — "Realtime updates the access policy cache … when a new JWT is sent to Realtime from a client via the `access_token` message"]
2. **Clerk session tokens must carry a `role` claim set to `"authenticated"`.** Supabase's Clerk integration requires this, and Realtime RLS validation silently fails without it. This is a **deferred-setup dashboard step** (Clerk → customize session token), not code. [VERIFIED: supabase.com/docs/guides/auth/third-party/clerk — "Add the `role` claim … should have the `authenticated` value"; corroborated by supabase-js #553]

The third structural decision: **volunteer pings should INSERT via a server action, not the browser anon-key client.** See §C — it removes the need to wire the write-path through native auth + INSERT RLS (which only the deferred dashboard setup unlocks), reuses the existing `requireRole` + ownership guard, works **today** without the third-party-auth touchpoint, and keeps the browser Supabase client **read/subscribe-only** (SELECT RLS). The browser anon-key client is then needed **only** for the Realtime subscription — and even that degrades to polling until the dashboard step is done.

**Primary recommendation:** Build in this order: (Wave 0) `location_pings` schema + migration + RLS + publication, env vars, RED tests; (Wave 1) `pingsRepo` + purge wired into `advancePickup`/`cancelPickup`, `recordPing`/`getLatestPing` server actions; (Wave 2) `useLiveLocation` (volunteer capture) + `useLivePickupLocation` (viewer subscribe+poll); (Wave 3) extend `MapViewInner` for a live moving marker, the "sharing location" banner, and the stale badge. The Clerk↔Supabase dashboard wiring is a **deferred touchpoint** — the feature runs on the polling path until it lands.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GPS capture (`watchPosition`, throttle, permission) | Browser/Client | — | Geolocation is a browser-only API; foreground tab on the volunteer's phone |
| Ping write (INSERT) | API/Backend (server action) | — | **Recommended path**: reuses `requireRole`+ownership, works without the deferred auth setup, keeps the service-role write on the trusted server (§C) |
| Ping purge on delivered/cancelled | API/Backend (server action) | — | DELETE runs in the same `advancePickup`/`cancelPickup` action; `postgres` role bypasses RLS |
| Latest-ping read (polling fallback) | API/Backend (server action) | Browser/Client (10s interval) | Server action under `requireRole` + ownership; client drives the interval only when realtime is down |
| Realtime subscription (Postgres Changes) | Browser/Client | — | WebSocket lives in the browser; per-subscriber RLS gates the broadcast; needs native auth + `setAuth` |
| Live marker render / glide | Browser/Client | — | Leaflet is DOM-only; `MapViewInner` already `"use client"` + `dynamic ssr:false` |
| Stale-indicator derivation | Browser/Client | — | Pure client computation from newest ping `created_at` vs `Date.now()` |
| RLS policy enforcement | Database/Storage | — | Postgres RLS is the gate for browser anon-key clients (SELECT for viewers; INSERT only if browser-write path is later adopted) |

---

## Standard Stack

### New dependencies for Phase 3
**None.** Everything needed is already installed.

| Library | Installed version | Role in Phase 3 | Notes |
|---------|------------------|-----------------|-------|
| `@supabase/supabase-js` | 2.108.2 | Browser Realtime client (`createClient` + `.channel().on('postgres_changes')`) | Already a dependency (server-side Storage in Phase 2). Bundles `@supabase/realtime-js` 2.108.2. Reuse on the client. [VERIFIED: package.json + `npm view`, modified 2026-06-19] |
| `@clerk/nextjs` | 7.5.8 | `useSession()` / `getToken()` in the browser; `auth()` already used server-side | Native Supabase integration uses `session.getToken()` **without a template** |
| `react-leaflet` | 5.0.0 | Live marker on the existing map | Extend `MapViewInner`, no new map lib |
| `leaflet` | 1.9.4 | Underlying map | Peer of react-leaflet |
| `drizzle-orm` | 0.45.2 | `location_pings` table + repo | Mirror `repositories/pickups.ts` |
| `postgres` | 3.4.9 | Server write/read/purge (postgres role, `prepare:false`) | Existing `getDb()` |

**Installation command:** none — no new packages.

**Version verification:** `@supabase/supabase-js@2.108.2` is the current latest (npm `dist-tags.latest`, modified 2026-06-19). [VERIFIED: npm registry]

### Alternatives considered
| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| DB-backed pings + Postgres Changes | Realtime **Broadcast** (ephemeral, no DB write) | Broadcast avoids the write + purge and scales better, BUT the donor/admin would see nothing if they open the map mid-trip (no history to replay), and there'd be no row for the polling fallback to read. CONTEXT D-05/D-06 lock DB-backed pings. Keep DB-backed. |
| Browser anon-key INSERT (D-05 literal) | **Server-action INSERT** (recommended §C) | Server action works without the deferred third-party-auth setup, reuses `requireRole`+ownership, no client write-RLS to debug. Same DB row, same realtime broadcast. **Recommended.** |
| Supabase Realtime | Self-hosted WS / SSE on Workers | Cloudflare Workers don't hold long-lived connections well; Supabase Realtime is free-tier (200 conns) and already in the stack. Keep Supabase. |

---

## A. Clerk ↔ Supabase third-party auth (current 2025 API)

**Decision:** Build the browser Supabase client with the **native** `accessToken` callback (no JWT template). Use it **read/subscribe-only**. Wiring Clerk as a Supabase third-party provider is a **deferred dashboard touchpoint** (D-02); until then the viewer runs on the polling path.

### What changed (don't use stale knowledge)
The old flow — create a Clerk **JWT template named `supabase`**, paste Supabase's JWT secret into Clerk, call `getToken({ template: 'supabase' })` — was **deprecated on 2025-04-01**. The native integration removes the shared secret and the template. [CITED: clerk.com/changelog/2025-03-31-supabase-integration; supabase.com/blog/clerk-tpa-pricing — accessed 2026-06-26]

### Browser client (verbatim from Clerk docs, adapted to our env names)
```tsx
// src/lib/supabase/browser.ts  — "use client" island only
"use client";
import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { env } from "@/config/env";

export function useSupabaseBrowser() {
  const { session } = useSession();
  // One client per session identity. accessToken is called by supabase-js
  // before each PostgREST/Storage request. getToken() takes NO template
  // under the native integration.
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    async accessToken() {
      return (await session?.getToken()) ?? null;
    },
  });
}
```
[CITED: clerk.com/docs/guides/development/integrations/databases/supabase — verbatim `accessToken() { return session?.getToken() ?? null }`, accessed 2026-06-26]

### Realtime gotcha (LOAD-BEARING — verified)
**The `accessToken` option does NOT authorize Realtime.** It authenticates PostgREST/Storage calls only; the Realtime WebSocket keeps using the anon key and every channel silently fails RLS (zero events). You MUST:

```ts
// After creating the client, and again on every Clerk token refresh:
const token = (await session?.getToken()) ?? null;
if (token) await supabase.realtime.setAuth(token);
```
- Realtime re-checks RLS "when a new JWT is sent to Realtime from a client via the `access_token` message" — that message is exactly what `setAuth()` sends. [VERIFIED: supabase.com/docs/guides/realtime/authorization]
- Clerk session tokens are **short-lived (~60s)** and auto-refresh; the channel's token is **not** auto-refreshed, so a channel left open across a refresh (or after the tab was backgrounded) stops receiving. Re-call `setAuth()` on a timer (well under the token TTL, e.g. every ~30–50s) or on Clerk's session-token-changed signal. [VERIFIED: realtime-js issue #274 — "Access token not refreshed for realtime channels after being offline or in standby"]

> Practically: this token-refresh fragility is a second reason the **polling fallback (D-06) is not optional** — it's the safety net when `setAuth` lapses.

### What RLS sees
- Clerk **user id** → `auth.jwt() ->> 'sub'`. [VERIFIED: supabase.com/docs/guides/auth/third-party/clerk — "The Clerk user ID is accessed via the `sub` claim … `auth.jwt()->>'sub'`"]
- **Mandatory:** Clerk session token must include a **`role` claim = `"authenticated"`**, or Supabase rejects the token and Realtime RLS silently fails. This is set in the Clerk dashboard (Sessions → customize session token), part of the deferred setup. [VERIFIED: supabase.com/docs/guides/auth/third-party/clerk — "Add the `role` claim … should have the `authenticated` value"; corroborated by supabase-js #553]
- SQL predicate for "current user = this Clerk sub":
  ```sql
  (select auth.jwt() ->> 'sub') = location_pings.volunteer_id
  ```
  (Wrapping in `(select …)` lets Postgres cache the claim per-statement — the Supabase-recommended performance idiom for RLS.)

### Dashboard steps (the deferred-setup checklist must say exactly this)
1. **Clerk Dashboard** → open the **Supabase integration setup** page (Clerk's "Connect with Supabase") → **Activate Supabase integration** → copy the revealed **Clerk domain** (the issuer, e.g. `https://<slug>.clerk.accounts.dev`).
2. **Clerk Dashboard** → **Sessions → customize session token** → add the claim `{"role": "authenticated"}` (so authenticated end-users carry `role: "authenticated"`).
3. **Supabase Dashboard** → **Authentication → Sign In / Providers → Add provider → Clerk** → paste the **Clerk domain** from step 1.
[CITED: clerk.com/docs/.../supabase (Clerk-side steps) + supabase.com/docs/guides/auth/third-party/clerk (Supabase-side step), accessed 2026-06-26]

---

## B. Realtime Postgres Changes for `location_pings`

**Decision:** Donor/admin map subscribes to **INSERT** events on `public.location_pings` filtered by `pickup_id`. The `.subscribe((status, err) => …)` status drives the polling fallback.

### Channel code (verified shapes)
```ts
// inside the viewer hook, after supabase.realtime.setAuth(token)
const channel = supabase
  .channel(`pings:${pickupId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "location_pings",
      filter: `pickup_id=eq.${pickupId}`,
    },
    (payload) => {
      // payload.new = the inserted row (lat, lng, accuracy, created_at)
      onPing(payload.new as LocationPing);
    },
  )
  .subscribe((status, err) => {
    // status ∈ 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
    if (status === "SUBSCRIBED") stopPolling();
    else startPolling(); // CHANNEL_ERROR | TIMED_OUT | CLOSED → 10s fallback
  });

// cleanup on unmount / when status leaves en_route|picked_up:
await supabase.removeChannel(channel);
```
- Filter syntax `pickup_id=eq.${id}` is correct; operators available: `eq, neq, lt, lte, gt, gte, in`. [VERIFIED: supabase.com/docs/guides/realtime/postgres-changes]
- `.subscribe((status, err) => {})` is the documented signature; values `SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED`. [VERIFIED: supabase.com/docs/reference/javascript/subscribe + Operational Error Codes page]
- **Per-subscriber RLS is enforced on broadcast**: "Before broadcasting a change, the Realtime server … temporarily assumes the identity of each subscribed client and runs an internal query to see if that client's RLS policies would allow them to see the updated row." If SELECT RLS denies, the client gets nothing — no error, just silence. [VERIFIED: supabase.com/docs/guides/realtime/postgres-changes]

### Enablement (REQUIRED migration SQL — silent no-events without it)
```sql
-- Table must be in the supabase_realtime publication or NO INSERT events fire.
alter publication supabase_realtime add table public.location_pings;
```
[VERIFIED: supabase.com/docs/guides/realtime/postgres-changes — `alter publication supabase_realtime add table your_table_name;`]
- We only consume `payload.new` on INSERT, so **`REPLICA IDENTITY FULL` is NOT needed** (that only matters for `old` values on UPDATE/DELETE). Skip it.
- **RLS interplay:** the subscriber receives a row only if a SELECT policy allows it (§C). RLS SELECT + publication membership are BOTH required; missing either = zero events with no error.

### Disconnect/error → fallback state machine
| `.subscribe` status | Meaning | Action |
|--------------------|---------|--------|
| `SUBSCRIBED` | channel live | stop polling; clear "reconnecting" |
| `CHANNEL_ERROR` | subscribe failed (bad/expired token, RLS, key) | start 10s polling; attempt `setAuth` + resubscribe |
| `TIMED_OUT` | server didn't respond in time | start 10s polling; retry subscribe with backoff |
| `CLOSED` | channel closed (often after background/standby) | start 10s polling; resubscribe on focus/visibility |

Auto-resume: on `document.visibilitychange → visible` and on a reconnect timer, re-call `setAuth(freshToken)` then resubscribe; the latest-ping server action keeps the marker current in the meantime.

### Free-tier limits (confirmed sufficient)
Free plan: **200 concurrent connections**, **100 messages/sec**, **100 channel joins/sec**, **100 channels per connection**. Dozens of concurrent viewers each on one channel, each pickup emitting one INSERT per ~30s, is far under every limit. [VERIFIED: supabase.com/docs/guides/realtime/quotas]

---

## C. RLS policy SQL for `location_pings` + the write-path decision

### Write-path decision (RECOMMENDED — justify)
**Volunteer pings INSERT via a SERVER ACTION (`postgres` role, bypasses RLS), not the browser anon-key client.** Reasons:
1. **Works today.** The browser anon-key INSERT path requires the native third-party-auth dashboard wiring (D-02, deferred) to be live AND the INSERT RLS to resolve a 2-table subquery per write. The server action needs none of that — it reuses the Phase 2 `requireRole(['volunteer'])` + ownership guard already proven in `pickupActions.ts`.
2. **Defence in depth, no new client write surface.** The browser only ever **reads/subscribes**; it can never write a forged ping. Matches the Phase 2 posture (server writes via postgres role; RLS gates the browser).
3. **Same outcome.** A server INSERT still fires the Postgres Changes broadcast to subscribers identically.

The **SELECT** RLS below is still required (it gates the browser **subscription**). The **INSERT** RLS below is written for completeness / defence-in-depth (harmless with the server-action path; necessary only if a future version moves writes to the browser).

### Policies (apply via Supabase MCP `apply_migration`, Phase 2 pattern)
```sql
-- 0) Index the subscription/purge/read key (REQUIRED for the RLS subqueries + filter)
create index if not exists location_pings_pickup_idx on public.location_pings (pickup_id);
create index if not exists location_pings_pickup_created_idx
  on public.location_pings (pickup_id, created_at desc);  -- latest-ping read

-- 1) Enable RLS (server postgres role bypasses; gate is for anon/authenticated browser)
alter table public.location_pings enable row level security;

-- 2) SELECT: only the pickup's donor, or an admin (role from profiles).
create policy "pings_select_donor_or_admin"
on public.location_pings
for select
to authenticated
using (
  exists (
    select 1
    from public.pickups p
    where p.id = location_pings.pickup_id
      and p.donor_id = (select auth.jwt() ->> 'sub')
  )
  or exists (
    select 1
    from public.profiles pr
    where pr.id = (select auth.jwt() ->> 'sub')
      and pr.role = 'admin'
  )
);

-- 3) INSERT (defence-in-depth; only relevant if writes ever move to the browser):
--    the assigned volunteer of a pickup currently en_route/picked_up.
create policy "pings_insert_assigned_active_volunteer"
on public.location_pings
for insert
to authenticated
with check (
  volunteer_id = (select auth.jwt() ->> 'sub')
  and exists (
    select 1
    from public.pickups p
    where p.id = location_pings.pickup_id
      and p.volunteer_id = (select auth.jwt() ->> 'sub')
      and p.status in ('en_route', 'picked_up')
  )
);

-- No UPDATE/DELETE policies → browser clients cannot mutate or purge.
-- Purge runs server-side as the postgres role (bypasses RLS).
```
- `auth.jwt() ->> 'sub'` = the Clerk user id; wrapped in `(select …)` for per-statement caching. [VERIFIED: Clerk integration docs + Supabase RLS performance guidance]
- The SELECT subquery joins `location_pings → pickups` (donor) and checks `profiles.role = 'admin'`. The `location_pings_pickup_idx` makes the broadcast-time per-subscriber RLS check cheap (it runs once per subscriber per insert). [VERIFIED: postgres-changes per-subscriber read model]

### Purge (TRK-04, D-08) — server action, scoped DELETE
```ts
// src/server/db/repositories/pings.ts (postgres role → bypasses RLS)
async purgeForPickup(pickupId: string): Promise<void> {
  const db = getDb();
  await db.delete(locationPings).where(eq(locationPings.pickupId, pickupId));
}
```
Call it inside `advancePickup` when `to === 'delivered'`, and inside `cancelPickup`, in the same action after the status write succeeds. (Belt-and-suspenders: a FK `references(() => pickups.id, { onDelete: 'cascade' })` is good hygiene but does NOT replace the explicit purge — pickups are never row-deleted, only status-changed.)

---

## D. Browser Geolocation capture (TRK-01, D-04)

**Decision:** `navigator.geolocation.watchPosition` with `enableHighAccuracy:true`, throttled to **one write per ~30s**, active **only** while the volunteer's pickup is `en_route`/`picked_up`. Best-effort consent: denial never blocks status advance; show a "tracking off" banner. Cleanup on unmount and on status leaving the active range.

```ts
// src/features/pickups/hooks/useLiveLocation.ts  (volunteer side, "use client")
"use client";
import { useEffect, useRef, useState } from "react";

type PermState = "prompt" | "granted" | "denied" | "unsupported";
const THROTTLE_MS = 30_000;

export function useLiveLocation(opts: {
  active: boolean;                       // pickup.status is en_route|picked_up AND I'm the volunteer
  onFix: (lat: number, lng: number, accuracy: number) => void; // -> recordPing server action
}) {
  const [perm, setPerm] = useState<PermState>("prompt");
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!opts.active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPerm("unsupported");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPerm("granted");
        const now = Date.now();
        if (now - lastWrite.current < THROTTLE_MS) return; // throttle to ~30s
        lastWrite.current = now;
        opts.onFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPerm("denied");
        // POSITION_UNAVAILABLE / TIMEOUT: keep watching; non-blocking
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 27_000 },
    );
    return () => navigator.geolocation.clearWatch(id); // cleanup (unmount / active→false)
  }, [opts.active]); // re-run when the pickup leaves/enters the active range

  return { perm };
}
```
- **Permission states:** Optionally read `navigator.permissions.query({ name: 'geolocation' })` to render the right banner before the first fix; the `watchPosition` error code is the reliable signal. Denied/unsupported → show the muted "Location sharing is off — the pickup still works" banner; never block `advancePickup`.
- **Throttle, not poll:** `watchPosition` fires as the device moves; the `lastWrite` ref gates writes to ~30s so a fast-moving volunteer doesn't flood `location_pings`. (`maximumAge:15000` lets the OS serve a recent fix cheaply between writes.)
- **HTTPS requirement:** Geolocation requires a secure context. `localhost` and `*.workers.dev` / `*.pages.dev` are secure contexts — OK. Plain-HTTP custom hosts would be blocked (not our case). [CITED: MDN Geolocation API — secure-context requirement]
- **Battery honesty (D-04 / specifics):** `enableHighAccuracy` uses GPS; foreground-tab only (mobile browsers throttle/suspend background tabs, which is *why* the stale indicator exists). Surface this in the "sharing location" UI.

---

## E. react-leaflet live marker (D-06, no remount)

**Decision:** Extend the existing `MapViewInner` with a **live mode**: a single volunteer marker whose position updates on each ping via a ref/state, plus the static destination marker (donor lat/lng). Update position **without remounting** the `MapContainer` (remount = flicker + reset zoom). Keep the `dynamic ssr:false` wrapper.

```tsx
// Add to MapViewInner.tsx — a child component inside <MapContainer>
import { Marker, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

function LiveMarker({ pos, stale }: { pos: { lat: number; lng: number } | null; stale: boolean }) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!pos) return;
    const ll: [number, number] = [pos.lat, pos.lng];
    if (ref.current) ref.current.setLatLng(ll);   // move existing marker (NO remount)
    map.panTo(ll, { animate: true });              // gentle recenter
  }, [pos?.lat, pos?.lng, map]);

  if (!pos) return null;
  return (
    <Marker
      position={[pos.lat, pos.lng]}
      ref={(m) => { ref.current = m; }}
      opacity={stale ? 0.45 : 1}                    // dim when stale (D-07)
    />
  );
}
```
- **No remount:** drive the marker by `setLatLng` on a stable ref (or by passing `position` to a keyed-stable `<Marker>`); never change the marker's React `key` per ping and never re-mount `<MapContainer>` — that's the #1 flicker bug. CSS `transition: transform` on `.leaflet-marker-icon` (in `motion.css`, transform-only, reduced-motion-aware) gives the "glide". [CITED: react-leaflet docs — `useMap`, marker `ref`]
- **Live dot:** overlay the `rj-live` pulse (already in `globals.css`) on a custom `L.divIcon` while fresh; swap to a muted icon when stale.
- **`ssr:false` still required:** the Worker has no `window`; `MapView` already does `dynamic(() => import('./MapViewInner'), { ssr:false })`. Keep it; opennext/Workers does not change this. [VERIFIED: existing `MapView.tsx`; react-leaflet SSR incompatibility confirmed in Phase 2 RESEARCH]

---

## F. Common Pitfalls (this stack)

### Pitfall 1: Table not in `supabase_realtime` publication → silent no events
**What goes wrong:** Subscription returns `SUBSCRIBED`, marker never moves, no error anywhere.
**Why:** Postgres Changes only fires for tables in the `supabase_realtime` publication.
**Avoid:** `alter publication supabase_realtime add table public.location_pings;` in the migration (§B). **Warning sign:** `SUBSCRIBED` status but zero `INSERT` payloads while you can see rows landing in the table.

### Pitfall 2: Realtime not authorized → RLS silently drops every event
**What goes wrong:** `SUBSCRIBED` but no payloads, even though the donor *should* see them and rows exist.
**Why:** The `accessToken` option authenticates PostgREST/Storage, **not** the Realtime socket; the channel ran as anon and SELECT RLS denied it.
**Avoid:** Call `supabase.realtime.setAuth(token)` after client creation and on every token refresh (§A). **Warning sign:** queries (`from('location_pings').select()`) return rows but the channel is silent.

### Pitfall 3: Missing `role: "authenticated"` claim → token rejected
**What goes wrong:** Auth/Realtime fails after the dashboard wiring; behaves like Pitfall 2.
**Why:** Supabase's Clerk integration requires the session token to carry `role = "authenticated"`.
**Avoid:** Add the claim in Clerk (Sessions → customize session token) — deferred-setup step (§A). **Warning sign:** works for nothing authenticated even though the provider is configured.

### Pitfall 4: Clerk token expiry / standby kills the channel
**What goes wrong:** Tracking works for ~1 min then stops; or stops after the volunteer/viewer backgrounds the tab.
**Why:** Clerk tokens are ~60s and auto-refresh, but the **channel's** token is not auto-refreshed (realtime-js #274).
**Avoid:** Re-`setAuth(freshToken)` on a sub-TTL timer and on `visibilitychange`; lean on the 10s polling fallback. **Warning sign:** first ~minute works, then silence until reload.

### Pitfall 5: SSR/Worker importing the realtime or Leaflet client
**What goes wrong:** Build/render error (`window is not defined`) or the Worker bundle pulls a browser-only client.
**Why:** Leaflet and the browser Supabase client touch `window`/WebSocket; the Worker has neither.
**Avoid:** Keep the Realtime client and Leaflet inside `"use client"` islands; map stays behind `dynamic ssr:false`; the browser Supabase client is created in a hook, never imported into a server component or `actions` file. **Warning sign:** `ReferenceError: window is not defined` at build/SSR.

### Pitfall 6: Duplicate-ping flooding (throttle wrong)
**What goes wrong:** `watchPosition` fires on every GPS sample; `location_pings` balloons; the marker jitters.
**Why:** `watchPosition` is event-driven (movement), not a 30s timer.
**Avoid:** Gate writes with a `lastWrite` ref to ~30s (§D); never write straight from the callback. **Warning sign:** dozens of rows per minute for one pickup.

### Pitfall 7: Marker remount on each ping → flicker / zoom reset
**What goes wrong:** Map flashes / re-centers / loses zoom on every update.
**Why:** Re-mounting `<MapContainer>` or re-keying `<Marker>` per ping.
**Avoid:** `setLatLng` on a stable marker ref; `MapContainer` mounts once (§E). **Warning sign:** visible flash every ~30s.

### Pitfall 8: Purge that misses the realtime DELETE (or relies on it)
**What goes wrong:** Pings linger after delivery (privacy regression), or you expect a DELETE event to clear viewers.
**Why:** Purge forgotten in `cancelPickup`, or assuming DELETE broadcasts (it requires REPLICA IDENTITY and we don't subscribe to DELETE).
**Avoid:** Explicit `pingsRepo.purgeForPickup(id)` in **both** `advancePickup(→delivered)` and `cancelPickup`; viewers stop subscribing when status leaves the active range (they don't need a DELETE event). **Warning sign:** rows for delivered pickups still in `location_pings`.

---

## Architecture / Data Flow

```
VOLUNTEER BROWSER (phone, foreground)         DONOR / ADMIN BROWSER
  │ useLiveLocation                             │ useLivePickupLocation
  │  watchPosition(highAccuracy)                │  ├─ useSupabaseBrowser() (Clerk accessToken)
  │  └─ throttle 30s ──► recordPing() action    │  ├─ supabase.realtime.setAuth(token)  ◄── REQUIRED
  │       (active only if en_route|picked_up)   │  ├─ channel(`pings:${id}`)
  │                                             │  │    .on('postgres_changes',
  │  permission denied/off → banner,            │  │       {INSERT, location_pings,
  │  pickup still advances (non-blocking)       │  │        filter pickup_id=eq.id}) → move marker
  ▼                                             │  └─ .subscribe((status,err)=>…)
NEXT.JS WORKER (server actions)                 │        SUBSCRIBED → stop polling
  ├─ recordPing(): requireRole(['volunteer'])   │        CHANNEL_ERROR|TIMED_OUT|CLOSED →
  │   + ownership + status guard                │           start 10s getLatestPing() poll
  │   → pingsRepo.insert (postgres role)  ──────┼───► INSERT broadcasts via Postgres Changes
  ├─ getLatestPing(id): donor/admin/owner       │        (per-subscriber RLS SELECT check)
  │   → pingsRepo.latest  (polling fallback)    │
  └─ advancePickup(→delivered)/cancelPickup     │   MapViewInner (live mode, dynamic ssr:false)
      → status write + pingsRepo.purgeForPickup │     ├─ LiveMarker (setLatLng, no remount, glide)
        (DELETE, postgres role)                 │     ├─ destination marker (donor lat/lng)
        ▼                                       │     └─ stale badge + dim @ ~90s (D-07)
   Supabase Postgres: location_pings (RLS on,   │
   in supabase_realtime publication)            │
```

---

## Files to create / modify (for the planner)

### Create
| File | Purpose |
|------|---------|
| `src/lib/supabase/browser.ts` | `useSupabaseBrowser()` — browser client with Clerk `accessToken` (read/subscribe only) + a `setAuth` helper |
| `src/server/db/repositories/pings.ts` | `pingsRepo`: `insert`, `latest(pickupId)`, `purgeForPickup(pickupId)` (mirrors `pickups.ts`) |
| `src/features/pickups/hooks/useLiveLocation.ts` | Volunteer GPS capture (`watchPosition`, throttle, permission state) → `recordPing` |
| `src/features/pickups/hooks/useLivePickupLocation.ts` | Viewer: subscribe (`setAuth` + Postgres Changes) + 10s polling fallback + stale derivation |
| `src/features/pickups/components/LiveTrackingMap.tsx` | Composes `MapView` in live mode (volunteer + destination markers, stale badge) |
| `src/features/pickups/components/SharingLocationBanner.tsx` | Volunteer "sharing your location" / "tracking off" states (`rj-live`) |
| `src/features/pickups/lib/staleness.ts` | Pure `isStale(createdAt, now, thresholdMs)` + `formatLastSeen(createdAt)` |
| `src/server/db/migrations/0002_location_pings.sql` (via Supabase MCP) | `location_pings` table + indexes + RLS policies + `alter publication` |
| Tests (Wave 0): `staleness.test.ts`, `pings.repo.test.ts`, `useLiveLocation.test.ts` | See Validation Architecture |

### Modify
| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add `locationPings` table (`id, pickupId→pickups(cascade), volunteerId→profiles, lat, lng, accuracy, createdAt`) + `pickup_id` / `(pickup_id, created_at desc)` indexes; export `LocationPing` types |
| `src/features/pickups/actions/pickupActions.ts` | Add `recordPing(pickupId, lat, lng, accuracy)` + `getLatestPing(pickupId)` actions; call `pingsRepo.purgeForPickup` inside `advancePickup` (→delivered) and `cancelPickup` |
| `src/features/pickups/components/MapViewInner.tsx` | Add live mode: `LiveMarker` (setLatLng/glide, dim when stale), optional destination marker; keep `ssr:false` |
| `src/features/pickups/components/MapView.tsx` | Pass through live-mode props |
| `src/config/env.ts` | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **client** block + `experimental__runtimeEnv` |
| `src/config/constants.ts` | `QUERY_KEYS.pings(id)`; `STALE_THRESHOLD_MS = 90_000`; `PING_INTERVAL_MS = 30_000`; `POLL_INTERVAL_MS = 10_000` |
| `.env.example` | Document the two new `NEXT_PUBLIC_SUPABASE_*` vars |
| Pickup detail page (`app/portal/pickups/[id]/page.tsx`) | Render `LiveTrackingMap` for donor/admin when status is active; render volunteer capture + banner when the viewer is the assigned volunteer |

---

## Deferred setup additions (append to the project's deferred-setup checklist)

1. **Clerk ↔ Supabase native third-party auth** (unlocks realtime; until done, viewers run on the 10s polling path):
   - Clerk Dashboard → **Connect with Supabase / Supabase integration** → **Activate** → copy the **Clerk domain** (issuer URL).
   - Clerk Dashboard → **Sessions → customize session token** → add `{"role": "authenticated"}`.
   - Supabase Dashboard → **Authentication → Sign In / Providers → Add provider → Clerk** → paste the Clerk domain.
2. **New client env vars** (env + Cloudflare Pages/Workers vars — these are PUBLIC, safe in the browser; RLS gates them):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Supabase project URL (same project as Phase 2's `SUPABASE_URL`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the project's **publishable/anon** key (Supabase → Project Settings → API).
3. **Migration `0002_location_pings`** applies the table + RLS + `alter publication supabase_realtime add table public.location_pings` (apply live via Supabase MCP, Phase 2 pattern).
4. Redeploy (`pnpm run deploy`) after adding the two client vars.

> Until step 1 lands, the viewer's `setAuth` has no valid third-party token, the channel fails, and the UI runs on the polling fallback — **degraded, not broken**. The volunteer write-path (server action) and the purge work regardless of step 1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + @testing-library/react 16 + jest-dom (jsdom) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:run --reporter=dot` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRK-03 | `isStale(createdAt, now, 90s)` true past threshold, false within; `formatLastSeen` renders "Xs/Xm ago" | unit | `pnpm test:run src/features/pickups/lib/staleness.test.ts` | ❌ Wave 0 |
| TRK-01 | `useLiveLocation` throttles ≥2 rapid fixes to one `onFix` within 30s; emits again after the window | unit | `pnpm test:run src/features/pickups/hooks/useLiveLocation.test.ts` (mock `navigator.geolocation` + fake timers) | ❌ Wave 0 |
| TRK-01 | `useLiveLocation` denied permission → `perm:'denied'`, never calls `onFix`, does not throw | unit | same file | ❌ Wave 0 |
| TRK-01 | `useLiveLocation` inactive (`active:false`) → never registers a watch | unit | same file | ❌ Wave 0 |
| TRK-04 | `pingsRepo.purgeForPickup` issues a DELETE scoped to `pickup_id` | unit | `pnpm test:run src/server/db/repositories/pings.test.ts` (mock `getDb`) | ❌ Wave 0 |
| TRK-04 | `advancePickup(→delivered)` and `cancelPickup` invoke `purgeForPickup` once | unit | `pnpm test:run src/features/pickups/actions/*.test.ts` (mock repo) | ❌ Wave 0 |
| TRK-02 | Realtime subscribe → live marker; `CHANNEL_ERROR` → polling fallback engages | manual | Two browsers (volunteer + donor) on a live pickup; throttle network to force CHANNEL_ERROR | — |
| TRK-02 | End-to-end RLS: a non-owner donor cannot read another pickup's pings | manual | Sign in as a different donor; confirm no marker + no rows via the anon client | — |

### Sampling Rate
- **Per task commit:** `pnpm test:run --reporter=dot` (Phase 3 files).
- **Per wave merge:** `pnpm test:run` (full suite — Phase 1+2 = 24 tests + Phase 3 additions stay green).
- **Phase gate:** Full suite green + `pnpm typecheck` + `pnpm lint` + `next build` before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/features/pickups/lib/staleness.test.ts` — covers TRK-03
- [ ] `src/features/pickups/hooks/useLiveLocation.test.ts` — covers TRK-01 (throttle, permission, inactive)
- [ ] `src/server/db/repositories/pings.test.ts` — covers TRK-04 (scoped DELETE)
- [ ] Realtime/Leaflet integration (TRK-02) is **manual** — two-browser live test; not auto-tested (WebSocket + GPS + cross-user RLS need a real Supabase + the deferred auth wiring). Justified per testing-practices ("test only what could really break in unit form").

---

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | YES | `requireRole` + ownership on `recordPing`/`getLatestPing`; RLS SELECT restricts pings to the pickup's donor/admin; no client UPDATE/DELETE policy |
| V5 Input Validation | YES | Zod-validate `lat∈[-90,90]`, `lng∈[-180,180]`, `accuracy≥0` in `recordPing` before insert |
| V6 Cryptography | Carried over | No new crypto; Clerk session JWT verified by Supabase via JWKS (native integration); anon key is public by design |
| V2 Authentication | YES (config) | Clerk session token must carry `role:"authenticated"`; native third-party-auth replaces the deprecated shared-secret JWT template |
| V3 Session Management | YES | Realtime token refresh via `setAuth` on a sub-TTL timer; channel re-auth on visibility regain |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| IDOR: a donor reads another pickup's live location | Information Disclosure | SELECT RLS (`donor_id = sub` OR admin); `getLatestPing` action re-checks ownership server-side |
| Forged ping: attacker writes a fake location for someone else's pickup | Tampering | Browser is read/subscribe-only; writes go through `recordPing` (server action) under `requireRole`+ownership+status guard (and INSERT RLS as defence-in-depth) |
| Privacy: location trail persists after delivery | Information Disclosure | Immediate `purgeForPickup` DELETE on `delivered`/`cancelled` (TRK-04); no retention |
| Realtime auth bypass via missing `setAuth` | Information Disclosure | RLS denies un-authorized channels by default (fails closed → zero events), not open |
| Anon-key abuse (it's public) | Information Disclosure | Key alone grants nothing — RLS requires a valid Clerk-issued token with the right `sub`/role; no service-role key in the browser |
| Ping flooding / DoS of `location_pings` | Denial of Service | 30s client throttle + server action behind auth; rows are short-lived (purged on delivery) |

---

## Assumptions Log
| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `role:"authenticated"` claim + `setAuth()` together fully authorize Realtime under Clerk native auth for OUR setup (no Clerk custom domain). | §A, §B | If wrong, channels stay silent and the app runs on polling indefinitely. Mitigated: polling fallback is a first-class path, not a stopgap. A known JWKS bug affects only **custom Clerk domains** (`/.well-known/jwks` 404) — we use the default `*.clerk.accounts.dev` issuer, so it doesn't apply. [VERIFIED scope: supabase/supabase issue #44527] |
| A2 | Server-action INSERT (not browser anon-key INSERT) is acceptable vs. CONTEXT D-05's literal "volunteer browser INSERTs". | §C | D-05 specifies browser INSERT. Recommending server-action INSERT is a *how* refinement of the same DB-backed-ping decision; it changes the write transport, not the data model or any user-visible behavior. **Flag for planner/user confirmation** — if browser-INSERT is required, the INSERT RLS in §C already covers it and the deferred auth wiring becomes a hard prerequisite for ping capture (not just for viewing). |
| A3 | One ping INSERT per pickup per ~30s, dozens of concurrent viewers, stays within free-tier Realtime quotas. | §B | Verified against published quotas (200 conns / 100 msg/s). Risk only if usage 10x's beyond "one city, ~200 meals/day". |
| A4 | `REPLICA IDENTITY FULL` is unnecessary because we subscribe to INSERT only and read `payload.new`. | §B | If a future need to broadcast DELETE/old-values arises, add it then. No current impact. |

---

## Open Questions
1. **Browser-INSERT vs server-action INSERT for pings (A2).**
   - Known: both produce the identical DB row + realtime broadcast; server-action works without the deferred auth setup and reuses existing guards.
   - Unclear: whether the user wants the literal D-05 browser-INSERT.
   - Recommendation: default to **server-action INSERT** (simpler, secure, works today); keep the INSERT RLS in §C so switching to browser-INSERT later is a one-line client change. Confirm with the user in discuss/plan.

2. **Clerk session-token-change signal for `setAuth` re-auth.**
   - Known: tokens are ~60s; the channel token isn't auto-refreshed.
   - Unclear: cleanest trigger in `@clerk/nextjs` v7 (poll `getToken()` on a timer vs. a Clerk event/listener).
   - Recommendation: a sub-TTL `setInterval` re-`setAuth` (~30–50s) plus `visibilitychange`, verified during the two-browser manual test. Low risk — polling covers any lapse.

3. **`@clerk/nextjs` v7 `getToken()` exact native signature in the browser.**
   - Known: native integration calls `session.getToken()` with no template; Clerk docs show `session?.getToken() ?? null`.
   - Unclear: nothing material; confirmed against current Clerk docs (June 2026).
   - Recommendation: use `useSession().session?.getToken()`; no template arg.

---

## Sources

### Primary (HIGH confidence — official docs, verified June 2026)
- supabase.com/docs/guides/auth/third-party/clerk — native integration, `auth.jwt()->>'sub'`, mandatory `role:"authenticated"` claim, dashboard provider step [VERIFIED]
- clerk.com/docs/guides/development/integrations/databases/supabase — browser `createClient` + `accessToken() { return session?.getToken() ?? null }` (no template), Clerk dashboard activation + Clerk domain [VERIFIED]
- clerk.com/changelog/2025-03-31-supabase-integration — JWT template deprecated 2025-04-01; native integration is the replacement [CITED]
- supabase.com/docs/guides/realtime/postgres-changes — channel `.on('postgres_changes', {...})`, filter `eq` operators, `alter publication supabase_realtime add table`, per-subscriber RLS broadcast check [VERIFIED]
- supabase.com/docs/guides/realtime/authorization — Realtime re-checks RLS on new `access_token` message [VERIFIED]
- supabase.com/docs/reference/javascript/subscribe — `.subscribe((status, err) => {})`; statuses `SUBSCRIBED|CHANNEL_ERROR|TIMED_OUT|CLOSED` [VERIFIED]
- supabase.com/docs/guides/realtime/quotas — Free plan: 200 conns, 100 msg/s, 100 joins/s, 100 channels/conn [VERIFIED]
- npm registry — `@supabase/supabase-js@2.108.2` current latest (modified 2026-06-19); bundles `realtime-js@2.108.2` [VERIFIED]
- MDN Geolocation API — `watchPosition`, `clearWatch`, secure-context (HTTPS) requirement [CITED]

### Secondary (MEDIUM — corroborating, verified against primary)
- github.com/supabase/supabase-js issue #553 — custom JWT/`accessToken` does not auto-authorize realtime channels; `role:"authenticated"` needed [VERIFIED behavior]
- github.com/supabase/realtime-js issue #274 — channel access token not refreshed after offline/standby (drives the re-`setAuth` + polling requirement) [VERIFIED behavior]
- github.com/supabase/supabase issue #44527 — Realtime JWKS 404 affects **custom Clerk domains** only (scopes A1 risk out for us) [VERIFIED scope]

### Project context
- `.planning/phases/02-rescue-loop/02-SUMMARY.md` + `02-RESEARCH.md` (MapView, repos, server-action pattern, RLS posture)
- Existing code: `schema.ts`, `client.ts`, `repositories/pickups.ts`, `pickupActions.ts`, `MapView(Inner).tsx`, `env.ts`, `constants.ts`, `session.ts`

---

## Metadata
**Confidence breakdown:**
- Clerk↔Supabase native auth (client code, `sub` claim, dashboard steps): HIGH — verified against both vendors' current docs
- Realtime `setAuth` + `role:authenticated` gotchas: HIGH — official authorization docs + two corroborating GitHub issues; these are the phase's highest-value findings
- Postgres Changes channel/filter/publication/quotas: HIGH — official docs, verbatim SQL + signatures
- RLS policy SQL: HIGH (shape) / MEDIUM (exact `(select auth.jwt()->>'sub')` caching idiom is a documented best practice, not a per-line quote)
- Geolocation throttle + Leaflet live marker: HIGH — standard browser/react-leaflet patterns, extending verified Phase 2 code
- Write-path recommendation (server action vs browser INSERT): MEDIUM — a justified refinement of locked D-05; flagged for confirmation (A2)

**Research date:** 2026-06-26
**Valid until:** 2026-08-10 (Clerk/Supabase integration is post-deprecation-stable; re-verify if either ships a v3 client or changes the third-party-auth flow)
