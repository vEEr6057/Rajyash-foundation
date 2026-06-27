# Phase 4: Notifications - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Key rescue-loop events automatically notify the right people across **three channels —
in-app, web push, and email (Resend)** — through **one channel-abstracted dispatcher**, fanned
out and retried by **Inngest**, with **exactly-once-per-(event,recipient,channel)** delivery.

Requirements: **NOT-01** (in-app), **NOT-02** (web push), **NOT-03** (email/Resend),
**NOT-04** (single channel-abstracted layer; disabling/replacing one channel doesn't affect
others), **NOT-05** (auto-retry on failure; never send the same notification twice to the same
recipient for the same event).

**Out of scope** (v2 / later): SMS (NOT-06, MSG91 — needs DLT + funding), WhatsApp (NOT-07),
user notification preferences/quiet-hours, digests, full PWA (Phase 7 — Phase 4 ships only a
minimal push service worker), i18n of notification copy (Phase 7).
</domain>

<decisions>
## Implementation Decisions

### Orchestration = Inngest (LOCKED by user)
- **D-01:** Job infra = **Inngest** (free tier). Server actions **emit an Inngest event** after
  the DB mutation commits; an Inngest function consumes it and fans out to channels. Decouples
  delivery from the request (async + retry). Keys already in `.env.local`
  (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`); add to `env.ts` + Cloudflare secrets.
- **D-02:** Serve handler at `src/app/api/inngest/route.ts` (must be PUBLIC in middleware —
  Inngest calls it server-to-server; no Clerk session). Runs on Cloudflare Workers via opennext.
- **D-03:** **Events:** `pickup/created`, `pickup/claimed`, `pickup/status_changed`,
  `pickup/cancelled`. Emitted from the existing actions (createPickup, claimPickup, advancePickup,
  cancelPickup) — each carries `{ pickupId, eventId, ... }` where `eventId` is a stable id
  (e.g. the `status_events` row id, or `${pickupId}:${toStatus}`) used for dedup.

### Channel abstraction (NOT-04)
- **D-04:** A `NotificationChannel` interface `{ key: "in_app"|"web_push"|"email"; send(msg, recipient) }`
  and a **registry** of enabled channels. The dispatcher loops the registry — adding, disabling,
  or replacing a channel is a registry edit, **no caller changes**. Each channel failure is
  isolated (one channel erroring doesn't block the others; Inngest retries that step).

### Recipients matrix (NOT-01..03 + user's new-pickup-alert)
- **D-05:**
  - `pickup/created` → **all active volunteers** (in-app + web push). NOT email (noise + Resend
    domain limits). *(user-locked: alert all active volunteers city-wide, no geo-filter yet.)*
  - `pickup/claimed` → **donor** (in-app + push + email): "your pickup was claimed".
  - `pickup/status_changed` (en_route / picked_up / delivered) → **donor** (in-app + push; email
    on delivered).
  - `pickup/cancelled` → donor in-app only (pre-claim, no volunteer involved).
- "Active volunteer" = profile.role='volunteer' (+ later: has a push subscription / opted in).

### In-app (NOT-01)
- **D-06:** `notifications` table (`id, user_id, type, title, body, data jsonb, pickup_id, read_at,
  created_at`). Portal nav gets an **unread bell** + a feed (list, mark-read, mark-all-read).
  Reads via server action/component scoped to the current user (no IDOR). RLS enabled (app role
  bypasses; mirrors Phase 2/3).

### Web push (NOT-02)
- **D-07:** **VAPID** keypair (env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`;
  public key also `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Minimal **push-only service worker**
  `public/sw.js` (handle `push` + `notificationclick`; full PWA is Phase 7).
  `push_subscriptions` table (`user_id, endpoint UNIQUE, p256dh, auth, created_at`). Client:
  permission prompt → `pushManager.subscribe` → save via server action. **Send must run on the
  Workers runtime** → the classic `web-push` npm lib uses Node crypto and may not work on
  Workers; RESEARCH must confirm a Workers-compatible Web Push (Web Crypto VAPID signing via
  `fetch`). Expired/410 subscriptions are pruned on send.

### Email (NOT-03)
- **D-08:** **Resend** via its REST API over `fetch` (Workers-compatible; no Node SDK needed).
  `RESEND_API_KEY` env. From `onboarding@resend.dev` until a domain is verified (**deferred** —
  Resend only delivers to the account owner's address without a domain). Simple HTML templates.

### Retry + exactly-once (NOT-05)
- **D-09:** **Retry** = Inngest's built-in per-step retries. **Dedup** = a
  `notification_deliveries` table with a **UNIQUE (event_id, recipient_id, channel)** constraint;
  each channel send does an idempotent insert first — on conflict, skip (already sent). Combined
  with Inngest `step.run` memoization, a replay/duplicate event never double-sends.

### Reuse from Phase 1/2/3
- Emit events from the existing server actions (after the mutation + statusEvents.record).
- Mirror repo + RLS patterns (`notificationsRepo`, `pushSubsRepo`); `requireRole`/ownership on
  all reads; design tokens for the bell/feed; `force-dynamic` where needed.
</decisions>

<canonical_refs>
## Canonical References
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (NOT-*), `.planning/ROADMAP.md` §"Phase 4".
- `.planning/phases/03-live-tracking/03-SUMMARY.md` (latest patterns: server-action + RLS + MCP migrations).
- `.claude/rules/*` (frontend/testing/git). `.claude/lessons/INDEX.md` — esp.
  **inngest-dev-flood-corrupts-next** (don't run inngest-cli dev until /api/inngest exists).
- Existing code: `src/features/pickups/actions/pickupActions.ts` (emit points),
  `src/server/db/schema.ts`, `src/middleware.ts` (make /api/inngest public),
  `src/config/{env,constants}.ts`.
</canonical_refs>

<code_context>
## Existing Code Insights
- `pickupActions.ts` actions (createPickup, claimPickup, advancePickup, cancelPickup) are the
  natural emit points — call `inngest.send(...)` after the successful mutation + statusEvents.record.
- `statusEvents` rows give a stable per-transition id for the dedup `event_id`.
- Repos under `src/server/db/repositories/`; RLS-on tables applied via Supabase MCP.
- Middleware is a Clerk matcher — `/api/inngest` must be excluded/public (S2S, no session).

## Integration Points
- New deps: `inngest` (+ its Next serve), a Workers-compatible web-push approach (TBD by research),
  `web-push` types maybe. Resend + Inngest via `fetch`/SDK.
- New env: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (in .env.local already), `RESEND_API_KEY`,
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- New tables: `notifications`, `push_subscriptions`, `notification_deliveries` (+ RLS).
</code_context>

<specifics>
## Specific Ideas
- Channel isolation is the testable heart of NOT-04: a unit test proving one channel throwing
  doesn't stop the others, and the dedup constraint proving NOT-05.
- Keep notification copy in one place (a builder per event type) — single source of truth.
- Bell + feed: frugal motion, design tokens, mobile-first.
</specifics>

<deferred>
## Deferred Ideas
- Resend custom domain (emails only reach the owner's address until then).
- SMS/WhatsApp (NOT-06/07, v2). Notification preferences, quiet hours, digests (v2).
- Geo-filtered volunteer alerts (v2). i18n notification copy (Phase 7).
</deferred>

---

*Phase: 4-Notifications*
*Context gathered: 2026-06-26*
