# B3 — Notifications reliability + coverage (build contract)

**Status:** LOCKED (Fable audit, 2026-07-04).
**Audit verdict on the existing stack: excellent.** Claim→send→release-on-failure gives true
exactly-once per (event, recipient, channel); Inngest function idempotency on `eventId` + per-send
`step.run` isolation + 5 attempts; web-push prunes dead subscriptions; email escapes HTML; the
recipient matrix deliberately keeps volunteer fan-out off email (Resend free-tier quota safe).
This batch fills four gaps — it does NOT restructure the machinery.

## 1. Run/dispatch notifications (the coverage gap)

The v2 dispatch loop is silent: a driver assigned to a run learns nothing; coordinators get nothing
on completion. Add two events end-to-end, reusing the existing machinery exactly (constants →
emit → recipients matrix → copy → same dispatch/claim path):

- `run/assigned` — emitted from `assignDriver`, from `createRun` when it creates with a driver, and
  from `editRun` when the driver CHANGES (new driver only). Recipient: the driver —
  `["in_app", "web_push", "email"]` (email OK: ~2 runs/day). `eventId` = `assigned:<runId>:<driverId>`
  (driver-qualified so re-assignment to a NEW driver notifies, while Inngest idempotency still kills
  duplicates of the SAME assignment).
- `run/completed` — emitted where a run reaches `completed` (`markStopDone` auto-complete,
  `overrideStopStatus` auto-complete, `setRunStatus`). Recipients: all active admins —
  `["in_app"]` only. `eventId` = `run_completed:<runId>`.

Implementation notes: extend `NOTIFICATION_EVENTS`; new profilesRepo helper `listAdminIds()` (or
reuse `listByRole` from B2 if merged — check main first); extend the recipients matrix + `buildCopy`
with the two events (run context: slot label + date in the body; keep copy short); either extend
`notifyOnPickupEvent`'s triggers (rename id → keep the SAME Inngest `id` string to preserve function
identity — if renaming is required for clarity, note the redeploy implication) or add a sibling
`notifyOnRunEvent` function — prefer the sibling (pickup event data shape stays untouched). Emits are
after-commit best-effort try/catch like every existing emit. Tests: recipients-matrix cases + emit
presence per action (mock inngest like runActions.test.ts does).

## 2. Scheduled hygiene sweeper (no cron exists today — trails/tables grow on edge cases)

One Inngest **cron** function (`{ cron: "TZ=Asia/Kolkata 30 3 * * *" }` — 03:30 IST daily; Inngest
cron runs fine on Workers, no Cloudflare Cron Trigger needed):
- location ping trails older than **24h** (stuck-active safety net — normal purge is event-driven on
  delivered/cancelled/completed): `pings` + `run_pings` by `created_at`.
- in-app `notifications`: read ones older than **90d**, unread older than **180d**.
- `notification_deliveries` (dedup claims) older than **90d** (dedup window ≫ retry window).
Each purge = its own `step.run` with a count logged via `logger.info`. New repo methods
(`purgeOlderThan(cutoff)` style) with unit tests following pings.test.ts's mock style.

## 3. Recipient-locale notification copy (GU/HI users currently get English)

- Migration: `profiles.locale text NOT NULL DEFAULT 'en'` (drizzle schema + generated SQL migration
  file committed; **do NOT apply to the live DB** — application happens at merge, note it in the PR).
- Capture: `setLocale` server action ALSO writes `profiles.locale` when a session exists (fire-and-
  forget, non-blocking); `completeOnboarding` stamps the current locale.
- `buildCopy(eventName, ctx, locale)` becomes locale-aware. Copy lives in `copy.ts` as a small
  3-locale record (en/gu/hi) — do NOT wire next-intl into the Inngest runtime; 6 events × title+body
  is a hand-sized table. GU/HI translations faithful, same register as the app catalogs.
- `planRecipients` already fetches profiles for email — extend to always fetch the profile (it needs
  locale now) — this is one query per recipient, same as today's email path; acceptable at this
  fan-out (≤ ~20 recipients/event). Fallback `'en'` when profile missing.

## 4. Failure visibility

`onFailure` handler on BOTH notify functions (fires after final retry): `logger.error` with event
name, eventId, recipient count + insert one in-app notification to all admins
("A notification failed to deliver — check the Inngest dashboard"), guarded by its own
try/catch (a failing failure-handler must not throw). No email, no external service.

## Out of scope

Restructuring dispatch/channels/registry · digest/batching · SMS/WhatsApp (funded-later constraint) ·
localizing EXISTING stored in-app notifications (only new ones) · Cloudflare Cron Triggers ·
applying the migration to the live DB.

## Validation bar

`tsc` + `eslint` (changed files, explicit) + `vitest --run` zero new failures (8 known env-flaky).
New tests: run-event recipient matrix, emit-per-action, sweeper repo methods, locale-aware copy
(gu/hi snapshots of title strings are fine here — small, stable). Conventional commits, no
Co-Authored-By, no local build, PR to main, do not merge. Migration file committed but NOT applied.
