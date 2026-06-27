# Session: Phases 3, 4, 6 ship — E2E + stacked PRs

Date: 2026-06-27 01:10
Status: completed
Owner: HP
Model: Claude Opus 4.8
Session-Id: 5c73d169-5a57-48f4-a918-44ed2699973c
Tags: #session #backend #frontend #maps-tracking #notifications #admin #inngest #playwright #e2e #supabase #clerk

> Continuation of session `5c73d169` (same id). The earlier checkpoint — Phase 1 deploy + Phase 2 rescue loop — is recorded in `2026-06-26-0339-phase1-deploy-phase2-kickoff.md`. This note covers the second work block (Phases 3, 4, 6) so neither record is lost.

## Objective

Run the full GSD pipeline autonomously for Phase 3 (Live Tracking), Phase 4 (Notifications), and Phase 6 (Admin + Reporting) — each built, Playwright-E2E-verified, reviewed, and shipped as a stacked PR. Front-load Phase 4/5/6 decisions first; park Phase 5 (Payments) pending the foundation's call. Solve and document any blocker rather than pausing.

## Starting Context

- Branch: feature/phase-6-admin (stacked: main ← phase-1 ← phase-2 ← phase-3 ← phase-4 ← phase-6)
- Module(s): c:/Users/HP/Desktop/Rajyash-Foundation
- Related notes: 2026-06-26-0339-phase1-deploy-phase2-kickoff.md (Phases 1–2)
- Ticket/Issue/PR: PR #3 (Phase 3 → phase-2), PR #4 (Phase 4 → phase-3), PR #5 (Phase 6 → phase-4)

## Session Metrics

| Metric | Value |
|--------|-------|
| Files edited | ~70 (P3+P4+P6) |
| Commands run | ~120 |
| Context used | N/A (multiple compactions) |
| Session cost | N/A |
| Duration | N/A |
| Lines added | N/A |
| Lines removed | N/A |

## Usage Breakdown

- Cost: N/A
- Duration: N/A
- Lines added: N/A
- Lines removed: N/A

## Work Summary

**Phase 3 — Live Tracking (PR #3 → phase-2).** Built `location_pings` (migration 0002, RLS, applied live via Supabase MCP). Browser `watchPosition` capture from the volunteer side; donor live view via Supabase Realtime (Postgres Changes) with a **10s polling fallback** when Clerk↔Supabase third-party auth isn't wired yet. react-leaflet live marker updated in place (`setLatLng`, no remount); stale-position indicator; pings purged on delivery. Review fixes: `Number.isFinite` coord guard (NaN passed the old `typeof number` check), `useCallback` to stabilize the realtime authorize ref, latch the INACTIVE watch loop, stop polling on UNAUTHORIZED/FORBIDDEN.

**Phase 4 — Notifications (PR #4 → phase-3).** In-app + web push + email, dispatched via **Inngest** (migration 0003: `notifications`, `push_subscriptions`, `notification_deliveries`). Channel-abstracted dispatcher (registry + claim-then-send + release-on-throw → exactly-once). Web push via `@block65/webcrypto-web-push` (the standard `web-push` lib is broken on Workers); VAPID; push-only service worker. Email via Resend REST `fetch`. Fan-out alerts all active (onboarded) volunteers on a new pickup. Added `src/app/providers.tsx` (QueryClientProvider — this phase introduced the first client `useQuery`).

**Phase 5 — Payments: PARKED.** Decisions pre-banked for if/when the foundation greenlights donations: Razorpay Standard Checkout (Orders API + modal, server-side webhook HMAC verify), custom amount only, auto 80G receipt (PAN optional), one-time. No code written.

**Phase 6 — Admin + Reporting (PR #5 → phase-4).** Partners CRM (org entity + linked donors), user management (role change, soft deactivate/reactivate), impact report (servings + kg shown separately) with CSV export (migration 0004: `partners` + `partner_type` enum + `profiles.partnerId`/`deactivatedAt`). ADM-01..06. CSV-injection guard (neutralize `^[=+\-@\t\r]` then RFC-4180 quote). Review fixes: partner-delete FK violation → clean CONFLICT message (HIGH-01), role change DB-mirror-first-then-Clerk to avoid drift (HIGH-02), `getSession` deactivate DB-read wrapped try/catch fail-open (MED-01).

Every phase: typecheck + lint + 92 tests + production build green; Playwright MCP E2E driven on the user's host with Clerk test creds (code 424242), 0 real console errors; react-review with HIGH/MED/LOW fixes applied; ROADMAP + STATE updated; lessons + handoff captured. Test data cleaned and the promoted test user's Clerk role restored to `donor` after E2E.

## Files Touched

- (working tree clean — all committed) Key files this block:
  - P3: src/server/db/{schema,repositories/locationPings}.ts, src/features/tracking/** (VolunteerTracker, LiveMap, realtime hook), migration 0002, app/portal tracking routes.
  - P4: src/server/db/{schema,repositories/{notifications,pushSubscriptions,deliveries}}.ts, src/server/notifications/** (channel registry, dispatcher, push/email/in-app channels), src/inngest/** (client + functions), src/app/providers.tsx, public service worker, migration 0003.
  - P6: src/server/db/{schema,repositories/{pickups,profiles,partners}}.ts, src/server/auth/session.ts, src/features/admin/** (actions, validations, lib/csv, components ×8), src/app/admin/** (dashboard/pickups/users/partners/reports + pickups/export route), migration 0004.
  - Cross: .claude/lessons/** (4 new), .planning/phases/{03,04,06}/**, .planning/{ROADMAP,STATE}.md, .remember/remember.md.

## Git Diff Summary

```
(working tree clean — no uncommitted changes)
```

## Recent Commits

```
1c3de02 feat(admin): admin portal + reporting — pickups/users/partners, impact + CSV
67fdf72 docs(06): create Admin Portal + Reporting phase plan
b598306 feat(notifications): in-app + web push + email via Inngest, channel-abstracted, exactly-once
bb6bf8f feat(tracking): live volunteer location — pings, realtime+polling, stale, purge
ffd4db8 chore: ignore .playwright-mcp artifacts; refresh session log
```

## Commands Run

```bash
# Supabase MCP: apply_migration 0002 (location_pings+RLS), 0003 (notifications/push/deliveries+RLS), 0004 (partners+enum+profile cols+RLS); list_tables; get_advisors
SKIP_ENV_VALIDATION=1 pnpm typecheck; pnpm lint; pnpm test:run (92); pnpm build (19 routes)
INNGEST_DEV=1 npx inngest-cli@latest dev   # local Inngest dev server (NEVER set INNGEST_DEV in prod)
node --env-file=.env.local scratchpad/promote-admin.mjs <userId> admin|donor   # seed/restore admin via Clerk Backend API
rm -rf .next                                # recover from inngest-cli probe flood + stale vendor-chunk
# Playwright MCP: navigate/snapshot/click/fill_form/file_upload/run_code_unsafe + geolocation grant across P3/P4/P6 E2E
gh pr create --base feature/phase-2-rescue-loop --head feature/phase-3-... (#3); --base phase-3 (#4); --base phase-4 (#5)
```

## Problems and Fixes

- Problem: Inngest v4 API mismatch — `EventSchemas` removed, `createFunction` is 2-arg.
  - Fix: `createFunction(options, handler)` with triggers + `idempotency: "event.data.eventId"` in options; rewrote client + functions.
- Problem: Inngest SDK in prod mode locally ("Cannot deploy localhost"); bare `EVENT_KEY`/`SIGNING_KEY`.
  - Fix: `INNGEST_DEV=1` for local dev only; renamed to `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`.
- Problem: Dashboard 500 — missing QueryClientProvider once a client `useQuery` was introduced.
  - Fix: added src/app/providers.tsx wrapping the tree.
- Problem: Exactly-once notification loss — claim happened before send, lost on throw.
  - Fix: `deliveries.release()` on throw (claim-then-send-then-confirm); push-delete made user-scoped (IDOR); push TTL 60→86400.
- Problem: `pushManager.subscribe` before the service worker was active.
  - Fix: `await navigator.serviceWorker.ready` first.
- Problem: E2E "stuck Updating…" — inngest-cli probe flood + stale `.next` corrupted the dev server (Clerk vendor-chunk error); server actions silently 200-failed.
  - Fix: stop inngest-cli; `rm -rf .next`; restart.
- Problem: Partner delete with linked donors → raw FK violation crash.
  - Fix: detect FK error → return CONFLICT with a clear message.
- Problem: Role change wrote Clerk first → drift risk if DB write failed.
  - Fix: DB-mirror-first-then-Clerk.
- Problem: Adding `profilesRepo.getById` to `getSession` made it a per-request DB read and broke session.test.ts.
  - Fix: try/catch fail-open + mock profilesRepo in the test; added a deactivated-user test.
- Problem: Admin RBAC chicken-and-egg for E2E (role lives in Clerk publicMetadata, not the DB).
  - Fix: promote a test user via Clerk Backend API (node has outbound net here) + fresh sign-in; restore to donor after.

## Decisions

- Phase 3: Realtime via Clerk↔Supabase third-party auth, with a polling fallback so tracking works before that dashboard wiring exists; purge pings immediately on delivery.
- Phase 4: Inngest as the job runner; alert all active volunteers on a new pickup; channel-abstracted dispatcher for exactly-once.
- Phase 5: PARKED — payments need a foundation decision; decisions banked so it can un-park fast.
- Phase 6: partners = both the org entity and linked donors; impact shows servings and kg separately; admin role = Clerk claim, not the DB column.
- Kept stacked-PR-per-phase; Phase 6 stacks on phase-4 (not a parked phase-5).
- Build code now, set up external accounts last; never set INNGEST_DEV in prod.

## Open Tasks

1. Phase 7 (Public Site + i18n + PWA) — the last v1 phase. Ask first: public landing via claude.ai/design import vs. existing tokens? GU/HI translations professional vs. machine-draft-for-review?
2. Production touchpoints: Inngest prod keys as Cloudflare secrets + app sync; Resend real key + verified domain; VAPID + NEXT_PUBLIC_SUPABASE_* as Cloudflare vars; redeploy.
3. Wire Clerk↔Supabase third-party auth (upgrades P3 from polling → instant push).
4. Seed the first real admin: Clerk publicMetadata.role="admin" (dashboard or Backend API).
5. Razorpay NGO KYC — only if Phase 5 un-parks.
6. Rebase the stack onto main + retarget bases as lower PRs merge.
7. Deferred to v1.5: last-admin lockout guard; pre-existing advisor `public.rls_auto_enable()` SECURITY DEFINER callable by anon.

## Resume Checklist

1. Re-open this note (and `.remember/remember.md`).
2. Verify branch: `git checkout feature/phase-6-admin` (or start Phase 7 off it).
3. Run first validation command: `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm test:run`
4. Continue from Open Tasks — Phase 7 first (ask the 2 design/i18n questions), or un-park Phase 5.

## Next Session Prompt

Use this in chat: "check last session" or "open session phases-3-4-6-ship-e2e-stacked-prs".
