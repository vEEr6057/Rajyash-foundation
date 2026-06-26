---
id: clerk-programmatic-test-signin
topic: testing
severity: low
status: verified
tags: [clerk, playwright, e2e, sign-in, test-mode, geolocation]
related-files: []
created: 2026-06-26
verified-by: Phase 3 E2E — signed in as volunteer + donor programmatically; drove full flow
---

## Problem
Driving Clerk's hosted `<SignIn>` UI in Playwright is fragile (element refs go stale after
hydration) and painful when an E2E needs to **switch accounts** several times (donor ↔ volunteer).

## Verified technique (Clerk test mode, email-code strategy, code `424242`)
Sign in via the `window.Clerk` client API in `browser_evaluate` — no UI clicks:
```js
const si = await window.Clerk.client.signIn.create({ identifier: 'vol+clerk_test@example.com' });
const f = si.supportedFirstFactors.find(x => x.strategy === 'email_code');
await si.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f.emailAddressId });
const res = await si.attemptFirstFactor({ strategy: 'email_code', code: '424242' });
if (res.status === 'complete') await window.Clerk.setActive({ session: res.createdSessionId });
```

## Gotchas
- **`signIn.create` throws "You're already signed in"** if a session exists. Call
  `await window.Clerk.signOut()` first — but signOut **navigates** (destroys the JS execution
  context), so the very next `evaluate` may error with "Execution context was destroyed";
  just `browser_navigate` to `/sign-in` again and proceed.
- After `setActive`, `window.Clerk.user` may briefly be null even though sign-in completed —
  navigate to a protected route to confirm (it'll land there if authed).
- Geolocation for the volunteer GPS path: `browser_run_code_unsafe` →
  `page.context().grantPermissions(['geolocation'], {origin}); page.context().setGeolocation({latitude,longitude})`.
  Permissions are per-origin — re-grant if the dev server port changes (e.g. 3000 vs 3001).
- For deterministic DB-side assertions (ping inserted, purge ran, stale state), drive the UI
  then assert via the Supabase MCP `execute_sql`; age rows with `created_at = now() - interval '4 minutes'`.

## Tripwire
Don't fight the Clerk UI in E2E — use `window.Clerk.client.signIn` + test code `424242`, and
always `signOut` before switching accounts.
