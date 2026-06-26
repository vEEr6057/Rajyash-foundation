---
id: inngest-dev-flood-corrupts-next
topic: general
severity: medium
status: verified
tags: [inngest, dev-server, next, vendor-chunks, clerk, server-actions, e2e, recompile]
related-files: [src/features/pickups/actions/pickupActions.ts, src/middleware.ts]
created: 2026-06-26
verified-by: Phase 3 E2E — stuck "Updating…"; resolved by stopping inngest-cli + rm -rf .next + restart
---

## Symptom
During Playwright E2E, a Server Action (advancePickup) hung — button stuck on "Updating…",
status never changed, but the POST eventually returned **200** (not an error). Console showed
0 errors. Pings (recordPing) had worked minutes earlier on the same server.

## Root cause (two compounding)
1. **`inngest-cli dev` was running** and auto-probing the app for an Inngest endpoint —
   `/api/inngest`, `/x/inngest`, `/.netlify/functions/inngest`, `/.redwood/functions/inngest`
   — **thousands** of requests. Those paths don't exist yet (Inngest is a later phase), so
   middleware redirected each to `/sign-in`, triggering a `/sign-in` **recompile every time**.
   13k+ requests → constant recompile thrashing.
2. That thrashing corrupted the dev `.next` at runtime →
   `Error: Cannot find module './vendor-chunks/@clerk+nextjs@...js'`. With the Clerk chunk
   unloadable, `requireRole()`/`auth()` inside the server action **threw**, the action caught it
   and returned `fail("FORBIDDEN")` → a **200 with `{ok:false}`** → the UI's loading state
   resolved to nothing visible. A silent auth failure that looks like a hang.

## Verified fix
- Stop the Inngest probe flood (don't run `inngest-cli dev` until the `/api/inngest` route
  exists — once it does, Inngest discovers it and stops scanning the other paths).
- `rm -rf .next` then restart `pnpm dev` (clears the corrupted chunks).
- Re-run the action on the fresh server → completes in ~1s.

## Tripwire
A Server Action that "hangs" (stuck loading) but returns **200**, plus
`Cannot find module './vendor-chunks/@clerk+nextjs...'` in the dev log = the dev server is
corrupted, NOT a code bug. Suspect recompile thrashing (an external poller / probe flood) and
a stale `.next`. Fix the environment before touching code. Related: [[stale-next-after-opennext-build]].
