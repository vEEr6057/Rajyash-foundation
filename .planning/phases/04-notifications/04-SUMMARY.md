# Phase 4: Notifications — Summary

**Built:** 2026-06-26 (autonomous) · **Branch:** `feature/phase-4-notifications` (stacked on phase-3)
**Status:** Code complete + Playwright-E2E verified (in-app + push subscribe + dedup, via the real Inngest dev runtime). DB applied live. Deferred: Inngest prod sync, Resend domain/key.

## What was built
Rescue-loop events fan out to **in-app + web-push + email** through **one channel-abstracted dispatcher**, orchestrated + retried by **Inngest**, exactly-once per (event, recipient, channel).

| Area | Files |
|---|---|
| Schema | `schema.ts` (+`notifications`, `push_subscriptions` [endpoint UNIQUE], `notification_deliveries` [UNIQUE(event_id,recipient_id,channel)]); migration `0003` **applied live + RLS** (deny-anon) |
| Repos | `notifications` (feed/unread/markRead/markAllRead), `pushSubs` (upsertByEndpoint/listForUser/deleteByEndpoint/**deleteForUser**), `deliveries` (**claim**/**release**) |
| Pure core | `events.buildEventId`, `inngest/recipients.resolveRecipients` (D-05 matrix), `notifications/copy.buildCopy` — all unit-tested |
| Channels (NOT-04) | `types.NotificationChannel` + `registry.CHANNELS` + `dispatch.dispatchToChannel` (claim→send→release-on-throw); `channels/{inApp,webPush,email}`; `push.ts` (@block65 + fetch, prune 404/410), `email.ts` (Resend fetch, escaped HTML) |
| Inngest | `client.ts` (v4, explicit keys), `functions/notify.ts` (1 fan-out fn, `idempotency: event.data.eventId`, per-(recipient,channel) `step.run`), `recipients.planRecipients` (async resolver), `app/api/inngest/route.ts` (public serve), middleware allowlist; 4 emits + repost emit in `pickupActions.ts` (after-commit, best-effort) |
| In-app UI (NOT-01) | `notificationActions` (6, session-scoped), `useNotifications`, `NotificationBell` + `NotificationFeed`, bell in dashboard header |
| Web push (NOT-02) | `public/sw.js` (push + notificationclick + skipWaiting/claim), `lib/push.urlBase64ToUint8Array`, `usePushSubscription` (register→ready→subscribe→save), `PushOptIn` on dashboard |
| App wiring | `app/providers.tsx` (**QueryClientProvider**) + layout |

## Verification (all green)
`typecheck` ✓ · `lint` ✓ (1 pre-existing font warning) · `test` ✓ **63 passed** (+23 new) · `build` ✓ 14 routes (incl `/api/inngest`).

**Playwright E2E (live, with the real `inngest-cli dev` executing functions):**
- **NOT-01**: `pickup/created` event → Inngest fn → volunteer in-app notification; bell badge "2"; feed deep-links; mark-all-read clears badge (DB unread→0).
- **Emit path**: donor *repost* (real server action) → `inngest.send` → dev server → fn → volunteer notified.
- **NOT-04**: in_app + web_push dispatched via the registry per recipient.
- **NOT-05 dedup**: re-sending the identical event kept the notification count at 1 (idempotency + unique ledger).
- **NOT-02**: PushOptIn → real **FCM subscription** created + persisted to `push_subscriptions`; UI → "Notifications on".
- 0 console errors after fixes.

## Bugs found + fixed (E2E)
1. **No `QueryClientProvider`** → dashboard 500 (first client `useQuery` in the app) → added `app/providers.tsx`.
2. **`pushManager.subscribe` before SW active** ("no active Service Worker") → `await navigator.serviceWorker.ready` (+ 10s timeout).
3. **`repostPickup` didn't emit `pickup/created`** → volunteers weren't alerted on repost → added the emit.

## Code review (react-review) → fixed
- **CRIT** claim-before-send loss: a send throwing left the delivery row claimed → Inngest retry skipped it (lost notification). Fix: `deliveries.release` on throw → retry re-claims + re-sends (exactly-once preserved). Test added.
- **HIGH** `deletePushSubscription` IDOR → owner-scoped `deleteForUser`.
- **HIGH** `listVolunteerIds` notified not-yet-onboarded volunteers → added `onboardingComplete = true`.
- **HIGH** misleading eventId comment ("claimed" vs DB "accepted") → clarified.
- **MED** push `ttl` 60s→24h (was dropping pushes for briefly-offline users); email HTML escaped; SW-ready timeout; NotificationFeed a11y (interactive elements).
- **LOW** PushOptIn checks the actual subscription (granted-permission ≠ subscribed); SW `skipWaiting`/`clients.claim`.
- Deferred (noted, low-risk): query-invalidation flicker (MED-03), panel Escape/click-outside (LOW-02), N+1 email-profile fetch (LOW-03).

## Decisions / deviations
- Inngest **v4** API: `createFunction(options, handler)` (triggers + idempotency in options), `EventSchemas` removed → events untyped, validated by the pure resolver/copy units.
- `web-push` is broken on Workers → **`@block65/webcrypto-web-push`** (WebCrypto + own `fetch`).
- Local dev needs **`INNGEST_DEV=1`** (`.env.local`) to talk to `inngest-cli dev`; the explicit signing key otherwise puts the SDK in prod mode. **Must NOT be set in production.**
- The Inngest keys were in `.env.local` as bare `EVENT_KEY`/`SIGNING_KEY` → renamed to `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`. VAPID keypair generated locally; `RESEND_API_KEY` is a placeholder (email deferred).

## Deferred (see `04-DEFERRED-SETUP.md`)
Inngest prod app-sync + real keys as Cloudflare secrets; Resend domain + real key (email only reaches the owner until then); VAPID keys as prod secrets; **never set `INNGEST_DEV` in prod**.

## Stacked PR
PR #4 base = `feature/phase-3-live-tracking`. Phase 5 (Payments) is PARKED; **Phase 6 (Admin) is next**.
