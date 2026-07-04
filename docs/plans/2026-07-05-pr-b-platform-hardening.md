# PR-B — Platform hardening (dispatch-grade patterns)

Branch: `fix/platform-hardening` → `main`. App-code changes; every task = one commit with
its test. Findings source: Fable deep review 2026-07-05 (see session notes).

## Task 1 — Ship the recordFailed paid-clobber fix (ALREADY IN WORKING TREE)

[donations.ts](../../src/server/db/repositories/donations.ts) `recordFailed` now guards
`ne(donations.status, "paid")`; test added in donations.test.ts ("never downgrades a paid
donation"). Commit as `fix(payments): late payment.failed can no longer downgrade a paid donation`.
Why it's real: one Razorpay order commonly sees several payment attempts (UPI timeout →
retry → success); each failed attempt emits its own `payment.failed` with its own event id;
delivery order is not guaranteed.

## Task 2 — Amount verification on capture (reconciliation-grade)

In the webhook route, read `payment.entity.amount` (paise). After a successful
`recordCapture`, compare against `result.donation.amount`; on mismatch `logger.error`
with both values + ids (donation stays paid — Razorpay captured what it captured; the log
is the reconciliation trail). No schema change. Test: mismatch logs, match doesn't.

## Task 3 — Receipt financial year in IST, not UTC

[razorpay.ts](../../src/server/payments/razorpay.ts) `financialYear()`: 80G receipts are
Indian tax documents; a donation at 00:30 IST on Apr 1 currently stamps the PRIOR FY
(UTC is 19:00 Mar 31). Fix: `const ist = new Date(date.getTime() + 5.5 * 3600_000)` then
use the existing UTC getters on `ist`. Test the boundary: Mar 31 18:29 UTC → old FY,
Mar 31 18:30 UTC (= Apr 1 00:00 IST) → new FY.

## Task 4 — setProofPhoto status guard

[pickups.ts](../../src/server/db/repositories/pickups.ts) `setProofPhoto`: add
`inArray(pickups.status, ["picked_up", "delivered"])` to the WHERE (proof makes sense only
once food is in hand). Action's FORBIDDEN message covers the 0-row case already. Test it.

## Task 5 — Kill switches: NOTIFICATIONS_ENABLED, INTAKE_ENABLED

Follow the exact `PAYMENTS_ENABLED` pattern in [env.ts](../../src/config/env.ts) (zod
enum, default on — note: payments defaults OFF, these default ON):
- `NOTIFICATIONS_ENABLED` — checked at the TOP of the dispatch layer
  (`src/server/notifications/dispatch.ts`): off → log `notifications disabled, skipping`
  and return. One choke point, all channels.
- `INTAKE_ENABLED` — checked in `createPickup` after auth: off →
  `fail("DISABLED", "New pickups are paused right now.")`. Board/portal keep working.
Set via `wrangler secret put` (flip without redeploy — secrets update live).
Tests: flag off → skip/DISABLED; flag on → normal path.

## Task 6 — Stale-claimed escalation (the missing half of the B4 sweeper)

The sweeper already counts stale claimed pickups (`countStaleClaimed`) and logs. Extend:
when count > 0, emit one Inngest event (`NOTIFICATION_EVENTS`-style, eventId keyed on
DATE so it fires at most once/day) that notifies admins ("N claimed pickups are past
their window — needs a human"). Notification content via the existing dispatch layer.

## Task 7 — Post→delivery time in admin reports

Reports repo: add avg + p90 `delivered_at - created_at` (interval → minutes) over the
report window, surfaced in the admin reports page as "avg rescue time". This is the
food-safety SLA number and the headline CSR metric.

## Task 8 — Sentry (SPIKE FIRST — 30 min timebox)

Goal: client + server error capture, free tier. Risk: `@sentry/nextjs` on the
opennext-cloudflare Workers runtime is historically finicky. Spike: try
`@sentry/cloudflare` for the Worker side + `@sentry/nextjs` client-only for browser
errors. If either fights the build, FALL BACK to: a tiny `window.onerror`/
`onunhandledrejection` handler POSTing to a new `/api/client-error` route that
`logger.error`s (Workers Logs already retains 3 days). Do not burn more than the timebox
on Sentry proper — the fallback covers the actual need (visibility).

## WhatsApp seam (design note — NO CODE in this PR)

The dispatch layer (`src/server/notifications/dispatch.ts`) is already channel-shaped
(push + email). Stage-2 WhatsApp = a third sender module (`whatsapp.ts`) called from
dispatch behind `WHATSAPP_ENABLED` + per-user opt-in (profiles gains `whatsappOptIn` +
uses existing `phone`). Template messages via Meta Cloud API (utility category,
~₹0.115/msg). Locale-aware templates already solved (profiles.locale, B3). Nothing to
build until the foundation funds Stage 2 — this note is the contract.

## Definition of done

Each task: test green. Whole PR: typecheck + lint + test:run + build green; smoke:
donate flow (test mode), claim → advance → deliver, admin reports render.
