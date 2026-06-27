# Phase 3 — Deferred Setup (Live Tracking)

Most of Phase 3 is **already wired** (unlike a fully-deferred phase). What's done vs what
still needs a dashboard/manual step is listed below.

## ✅ Already done (by the build session)
- `location_pings` table + indexes + FKs — **applied live** via Supabase MCP.
- RLS: enabled + INSERT policy (assigned volunteer, active pickup — fail-closed) + SELECT
  policy (donor/admin) through a `SECURITY DEFINER` helper `private.can_view_pickup_pings`
  (non-exposed schema, so it bypasses the policy-less RLS on `pickups`/`profiles` without
  PostgREST exposure). Verified clean by the security advisor.
- Table added to the `supabase_realtime` publication (required for Postgres-Changes events).
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) added to
  **`.env.local`** (fetched via MCP `get_publishable_keys`).
- E2E-verified (Playwright): capture → polling view → stale → purge, all green.

## ⏳ Still deferred (your touchpoints)

### 1. Clerk ↔ Supabase third-party auth — activates REALTIME PUSH
Until this is wired, the donor/admin live map runs on the **10-second polling fallback**
(works, just not instant). Wiring it upgrades to instant Supabase Realtime push.

**Supabase dashboard** → Authentication → Sign In / Providers → **Third-Party Auth** → add
**Clerk**. Paste your Clerk **Frontend API URL** (a.k.a. issuer/domain, e.g.
`https://viable-louse-83.clerk.accounts.dev`).

**Clerk dashboard** → enable the **Supabase integration** (Configure → Integrations →
Supabase) — this makes Clerk's session token carry the `role: "authenticated"` claim that
Supabase requires. (Equivalent: add a `role: "authenticated"` claim to the session token via
Clerk's session-token customization.)

Why both: the browser builds its Supabase client with `accessToken: () => session.getToken()`
(native, no JWT template — the template flow was deprecated 2025-04-01) and the viewer hook
calls `supabase.realtime.setAuth(token)` after subscribe + on every refresh. RLS then reads
the Clerk user id as `auth.jwt() ->> 'sub'`. Without the `authenticated` role + provider
registration, Supabase rejects the token → channel never authorizes → polling fallback (by
design, not a bug).

**Verify after wiring:** open a pickup that's `en_route` as the donor in one browser and as
the assigned volunteer (sharing location) in another → the donor marker should move within
~1s (badge "Live"), and the badge should NOT say "reconnecting…".

### 2. Production env (Cloudflare) + redeploy
The two public vars are in `.env.local` (dev) but not yet in production:
```
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```
(or set as Workers vars — they're public). Then `pnpm run deploy`
(kill workerd + `rm -rf .open-next` first if EPERM; `rm -rf .next` before the next `pnpm dev`).

## Notes / pre-existing (not Phase 3)
- Security advisor still flags (pre-existing, Phase 1/2): policy-less RLS on
  `pickups`/`profiles`/`status_events` (intentional — app uses the postgres role) and a
  `public.rls_auto_enable()` SECURITY DEFINER function callable by anon. The latter is worth a
  look when you next touch DB security (origin unclear — possibly from the Supabase agent skill).
