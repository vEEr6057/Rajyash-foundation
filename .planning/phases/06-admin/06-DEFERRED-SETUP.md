# Phase 6 — Deferred Setup (Admin Portal)

Admin is **internal** — no new external accounts or services. Almost everything is done.

## ✅ Already done
- `partners` table + `partner_type` enum + `profiles.partnerId`/`deactivatedAt` — migration 0004 **applied live** + partners RLS (deny-anon) via Supabase MCP.
- All admin code built + E2E-verified as a real admin.

## ⏳ The one touchpoint: make a real staff member an admin
Admin access is gated on the Clerk session claim `publicMetadata.role === "admin"` (NOT the DB).
To grant it to a foundation staff member (after they've signed up + onboarded):

**Option A — Clerk dashboard (no code):** Users → pick the user → Metadata → Public →
set `{ "role": "admin", "onboardingComplete": true }` → save. They get admin access on
their next sign-in (token refresh).

**Option B — Backend API (scriptable):** `PATCH https://api.clerk.com/v1/users/<userId>/metadata`
with `Authorization: Bearer $CLERK_SECRET_KEY` and body
`{"public_metadata": {"role":"admin","onboardingComplete":true}}`.
(This is how the E2E promoted a test user — see the one-off `scratchpad/promote-admin.mjs`.)

Then **also** set `profiles.role = 'admin'` for that user so the admin user-list shows the
right role (the in-app role mirror) — or just change it once from within the admin Users page
after the first admin exists. The first admin must be seeded via Clerk (chicken-and-egg).

## Notes / carry-over (not Phase 6)
- Soft-deactivate is enforced in `getSession` (DB read per auth) + best-effort Clerk `banUser`.
  Never set this in middleware (no edge DB reads).
- Deferred to v1.5 (review): a **last-admin lockout guard** (block demoting/deactivating the
  final active admin) — today only self-demote/self-deactivate is blocked.
- Donation/revenue reporting is intentionally absent (Phase 5 Payments is PARKED).
- The admin pickups date columns render `en-IN`; full i18n (incl. admin) is Phase 7.
