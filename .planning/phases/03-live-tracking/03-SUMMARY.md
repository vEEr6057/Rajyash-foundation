# Phase 3: Live Tracking — Summary

**Built:** 2026-06-26 (autonomous) · **Branch:** `feature/phase-3-live-tracking` (stacked on phase-2)
**Status:** Code complete + Playwright-E2E verified. DB applied live. One deferred touchpoint (Clerk↔Supabase realtime auth) — polling fallback works without it.

## What was built
Live volunteer tracking on top of the rescue loop: the assigned volunteer's browser pings
its GPS every ~30s while a pickup is `en_route`/`picked_up`; the donor/admin watch the marker
move (Supabase Realtime, **10s polling fallback** on disconnect) with a **stale indicator**;
pings are **purged immediately on delivered/cancelled**.

| Area | Files |
|---|---|
| Schema | `server/db/schema.ts` (+`location_pings` + 2 indexes), migration `0002_*` **applied live** (table + RLS + publication) |
| RLS | INSERT = assigned volunteer of an active pickup (fail-closed); SELECT = donor/admin via `private.can_view_pickup_pings` **SECURITY DEFINER** helper (non-exposed schema → bypasses policy-less RLS on pickups/profiles without PostgREST exposure); table in `supabase_realtime` publication |
| Repo | `server/db/repositories/pings.ts` (insert / latestForPickup / listForPickup / purgeForPickup) |
| Server actions | `recordPing` (volunteer + ownership + active-status + finite-coord guards), `getLatestPing` (donor/admin gated); purge wired into `advancePickup`(→delivered) + `cancelPickup` |
| Browser client | `lib/supabase/browser.ts` — Clerk **native** `accessToken` (no JWT template) + `authorizeRealtime` (`realtime.setAuth`, memoized) |
| Hooks | `useLiveLocation` (watchPosition + 30s throttle + permission + cleanup), `useLivePickupLocation` (postgres_changes subscribe → 10s polling fallback + stale derivation + teardown) |
| UI | `MapViewInner` live mode (marker moves via `setLatLng`, dims when stale, destination marker), `LiveTrackingMap` (donor/admin + freshness badge), `VolunteerTracker` + `SharingLocationBanner` (rj-dot-live); detail page wires by role + active status (admins may now view) |
| Lib/config | `lib/staleness.ts` (pure isStale/formatLastSeen), `config/constants.ts` (+thresholds, QUERY_KEYS.pings), `config/env.ts` (+`NEXT_PUBLIC_SUPABASE_*`) |

## Verification (all green)
`typecheck` ✓ · `lint` ✓ (1 pre-existing font warning) · `test` ✓ **40 passed** (16 new: staleness 9, useLiveLocation 3, pings purge 1, action purge 3) · `next build` ✓ 13 routes.

**Playwright E2E (live, on the dev server, real GPS via `setGeolocation`) — every criterion proven:**
- **TRK-01** capture: volunteer en_route → `recordPing` inserted a ping at the exact set GPS (23.03, 72.58). "Sharing your location" banner shown.
- **TRK-02** view: donor opened the active pickup → `LiveTrackingMap` → polling fallback → "Live · updated 1m ago" + moving marker (realtime correctly degraded to "reconnecting…" — Clerk↔Supabase auth deferred).
- **TRK-03** stale: pings aged >90s → "Location may be outdated · updated Nm ago", marker dimmed.
- **TRK-04** purge: Mark Delivered → pickup `delivered`, `remaining_pings = 0`.
- Gating + Phase 2 regression: delivered pickup shows static map (no live UI); proof gate + status advance still work. **0 console errors throughout.**

## Code review (react-review) → fixed
- **CRITICAL** NaN/Infinity passed coordinate validation (`typeof NaN === "number"`) → switched to `Number.isFinite`.
- **HIGH** `authorizeRealtime` unstable ref → channel re-subscribe loop on parent re-render → wrapped in `useCallback`.
- **MED** `VolunteerTracker` fire-and-forget kept pinging after delivery → now latches `stopped` on `INACTIVE`/`FORBIDDEN`.
- **MED** `pollOnce` ignored `{ok:false}` → stops polling + idles on `UNAUTHORIZED`/`FORBIDDEN`.
- **MED/LOW** clear stale `position` on deactivate; reset `lastWrite` on active toggle.
- **LOW** (noted, not fixed) `recordPing` does a `getById` per ping — fine at NGO scale.
Re-validated after fixes: typecheck + 40 tests + lint green. Verdict moved FIX-FIRST → SHIP.

## Decisions / deviations
- **Ping write path = server action** (not browser anon-write) → write + polling read work today without the deferred Clerk↔Supabase wiring; only realtime PUSH needs it.
- **SECURITY DEFINER helper** for the SELECT policy (referencing RLS-protected pickups/profiles in a policy returns empty otherwise) — Supabase-blessed pattern, kept in a non-exposed `private` schema (no advisor warning).
- Folded formal `gsd-verifier` into this summary — Playwright E2E (the user's required verification) covered every criterion live.
- Admin can now view any pickup detail (required by TRK-02 "donor and admin"); full admin portal is Phase 6.

## Deferred (one touchpoint) — see `03-DEFERRED-SETUP.md`
- **Clerk↔Supabase third-party auth** (two dashboards + `role:"authenticated"` claim) → upgrades the live map from 10s polling to instant realtime push. Until then: polling fallback (verified working).
- Production: set `NEXT_PUBLIC_SUPABASE_*` as Cloudflare vars + redeploy.

## Stacked PR
PR #3 base = `feature/phase-2-rescue-loop`. Rebase up the stack as lower PRs merge.
