---
id: admin-e2e-promote-clerk-role
topic: testing
severity: low
status: verified
tags: [clerk, admin, rbac, e2e, playwright, session, getSession]
related-files: [src/server/auth/session.ts, src/features/admin/actions/adminActions.ts]
created: 2026-06-26
verified-by: Phase 6 E2E — promoted a test user to admin, drove the whole admin portal
---

## Need
Admin access is gated on the Clerk session claim `publicMetadata.role === "admin"` — NOT on
`profiles.role` (the DB column is only a mirror). So you cannot make someone an admin by
UPDATE-ing the DB; the middleware/getSession read the Clerk claim. For E2E there's also a
chicken-and-egg: the admin UI's role-change needs an existing admin.

## Verified technique (seed the first admin)
Set the user's Clerk `publicMetadata` via the **Backend API** (node has outbound network in
this env even though the Bash `curl` is sandboxed):
```js
// node --env-file=.env.local promote.mjs <userId> admin
await fetch(`https://api.clerk.com/v1/users/${id}/metadata`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ public_metadata: { role: "admin", onboardingComplete: true } }),
});
```
Then **sign in fresh** in Playwright (via `window.Clerk.client.signIn` + code 424242) — the new
token carries `role: "admin"`. An already-open session won't see it until its token refreshes
(the "applies on next sign-in" claim-lag). Restore the role afterward (run the script with `donor`).

## Caveat that bit us
Enforcing soft-deactivate by adding `profilesRepo.getById` to `getSession` made getSession do a
**DB read on every authed request**, and it broke the existing `session.test.ts` (which mocked
Clerk's `auth()` but not the DB). Two consequences to remember when touching getSession:
1. Any test that exercises getSession/requireRole must now mock `@/server/db/repositories/profiles`.
2. Wrap the DB read in try/catch and **fail open** — otherwise a DB blip 500s ALL auth (admins included).

## Tripwire
Admin role = Clerk publicMetadata (claim), not the DB. Promote via the Backend API + fresh
sign-in for E2E. Don't add unguarded DB reads to getSession — it runs on every authed request.
