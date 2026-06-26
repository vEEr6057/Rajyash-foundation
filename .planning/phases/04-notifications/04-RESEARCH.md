# Phase 4: Notifications - Research

**Researched:** 2026-06-26
**Domain:** Async job orchestration (Inngest) + multi-channel notification delivery (in-app / web push / email) on the **Cloudflare Workers** runtime (opennext)
**Confidence:** HIGH (every load-bearing API verified against npm registry + official docs this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Job infra = **Inngest** (free tier). Server actions emit an Inngest event *after* the DB mutation commits; an Inngest function consumes it and fans out to channels. Keys already in `.env.local` (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`); add to `env.ts` + Cloudflare secrets.
- **D-02** Serve handler at `src/app/api/inngest/route.ts` — must be **PUBLIC** in middleware (Inngest calls it S2S, no Clerk session). Runs on Cloudflare Workers via opennext.
- **D-03** Events: `pickup/created`, `pickup/claimed`, `pickup/status_changed`, `pickup/cancelled`. Emitted from `createPickup`, `claimPickup`, `advancePickup`, `cancelPickup`. Each carries `{ pickupId, eventId, ... }` where `eventId` is a stable id (the `status_events` row id, or `${pickupId}:${toStatus}`) used for dedup.
- **D-04** A `NotificationChannel` interface `{ key: "in_app"|"web_push"|"email"; send(msg, recipient) }` + a **registry** of enabled channels. Dispatcher loops the registry; adding/disabling/replacing a channel is a registry edit, no caller changes. Each channel failure is isolated.
- **D-05** Recipients matrix:
  - `pickup/created` → **all active volunteers** (in-app + web push). NOT email. *(user-locked: city-wide, no geo-filter yet.)*
  - `pickup/claimed` → **donor** (in-app + push + email).
  - `pickup/status_changed` (en_route / picked_up / delivered) → **donor** (in-app + push; email on delivered).
  - `pickup/cancelled` → donor in-app only.
  - "Active volunteer" = `profile.role='volunteer'`.
- **D-06** `notifications` table (`id, user_id, type, title, body, data jsonb, pickup_id, read_at, created_at`). Portal nav unread bell + feed (list, mark-read, mark-all-read). Reads scoped to current user (no IDOR). RLS enabled (app role bypasses).
- **D-07** **VAPID** keypair (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; public also `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Minimal push-only `public/sw.js` (`push` + `notificationclick`). `push_subscriptions` table (`user_id, endpoint UNIQUE, p256dh, auth, created_at`). **Send must run on Workers** → classic `web-push` may not work; RESEARCH must confirm a Workers-compatible approach. Expired/410 subs pruned.
- **D-08** **Resend** via REST over `fetch`. `RESEND_API_KEY`. From `onboarding@resend.dev` until a domain is verified (**deferred**). Simple HTML templates.
- **D-09** Retry = Inngest built-in per-step retries. Dedup = `notification_deliveries` table with **UNIQUE (event_id, recipient_id, channel)**; each channel send does an idempotent insert first — on conflict, skip. Combined with `step.run` memoization, a replay never double-sends.

### Claude's Discretion
- Exact channel `send()` signature shape, dispatcher internals, notification copy builder structure.
- Library choice for Workers web push (research recommends below).
- Whether dedup-insert sits inside or wrapping each channel step.
- Inngest function granularity (one fan-out function vs per-event functions).

### Deferred Ideas (OUT OF SCOPE)
- Resend custom domain (emails only reach the account owner's address until then).
- SMS/WhatsApp (NOT-06/07, v2). Notification preferences, quiet hours, digests (v2).
- Geo-filtered volunteer alerts (v2). i18n notification copy (Phase 7). Full PWA (Phase 7 — this phase ships only the minimal push SW).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOT-01 | In-app notifications | `notifications` table + repo + bell/feed; written inside the in-app channel (§D, §E) |
| NOT-02 | Web push | `@block65/webcrypto-web-push` on Workers + VAPID + SW + subscribe flow (§B) |
| NOT-03 | Email via Resend | Resend REST API over `fetch` on Workers (§C) |
| NOT-04 | Single channel-abstracted layer | `NotificationChannel` interface + registry + isolated dispatcher (§D) |
| NOT-05 | Auto-retry + never double-send | Inngest per-step retries + function-level `idempotency` + `notification_deliveries` UNIQUE constraint (§A, §D, §E) |
</phase_requirements>

## Summary

Four moving parts, three of which run **inside the Cloudflare Workers runtime** (opennext) and therefore must use **Web Crypto + `fetch`, never Node `crypto`/`https`**. (1) **Inngest** orchestrates: server actions `inngest.send()` an event after the DB commit; one Inngest function consumes it, builds the recipient list, and fans out to channels with per-step retries. (2) **In-app** is a DB insert + a bell/feed UI. (3) **Web push** is the one genuine risk — the classic `web-push` npm package **does NOT work on Workers** (verified: it calls `crypto.createECDH`, which `node:crypto` under `nodejs_compat` does not implement, plus `https.request` is unsupported). The verified replacement is **`@block65/webcrypto-web-push`**, which builds the encrypted VAPID payload with Web Crypto and hands you a plain `{method,headers,body}` object to send with your own `fetch` — exactly what we want on Workers. (4) **Email** is a `POST https://api.resend.com/emails`.

Exactly-once (NOT-05) is achieved with **two independent guards**: Inngest function-level `idempotency: "event.data.eventId"` (one execution per logical event, even on duplicate delivery) *and* a `notification_deliveries` row with `UNIQUE(event_id, recipient_id, channel)` inserted before each send (on conflict → skip). Either alone would mostly work; together they are airtight against Inngest replays *and* concurrent duplicate events.

**Primary recommendation:** Install `inngest@4` + `@block65/webcrypto-web-push@1` (no Node `web-push`, no Resend SDK — Resend over raw `fetch`). Client `new Inngest({ id, eventKey, signingKey })` with keys read explicitly from env. Serve `{ GET, POST, PUT }` from `inngest/next` at a **public** `/api/inngest`. One Inngest fan-out function per the four events, dedup-insert-then-send per channel, prune push subs on 404/410.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Emit domain event | API / Server Action (Workers) | — | Fired after the DB mutation commits, inside the existing action |
| Orchestrate fan-out + retry | Inngest Cloud + `/api/inngest` (Workers) | — | Durable execution, per-step retry, idempotency — not the request thread |
| Build recipient list | Inngest function (Workers) | DB (profiles) | Needs `profiles`/`pickups` reads; runs in the durable function, not the emitter |
| In-app notification | DB insert (Workers) | Bell/feed (client) | Persisted row; UI reads scoped to current user |
| Web push encryption + send | Workers runtime (Web Crypto + `fetch`) | Push service (FCM/Mozilla/Apple) | Must be Web-Crypto; classic `web-push` is Node-only and breaks here |
| Push subscribe | Browser (Service Worker + PushManager) | Server action (save sub) | Permission + subscription is a browser-only API; persistence is server-side |
| Email send | Workers runtime (`fetch` → Resend REST) | Resend | Fetch-based; no Node SDK needed |
| Dedup / exactly-once | DB unique constraint (Workers) | Inngest idempotency | DB is the hard guarantee; Inngest idempotency is the cheap first line |

---

## A. Inngest on Next 15 App Router + Cloudflare Workers (opennext)

### Decision
- **Serve handler:** export `{ GET, POST, PUT }` from `inngest/next` at `src/app/api/inngest/route.ts`. This is a **standard Next App Router route handler** — opennext runs it on the Workers runtime unchanged. **Do NOT** use `inngest/cloudflare` (that's for raw Workers/Pages Functions, not a Next route handler) and **do NOT** add `export const runtime = "edge"` (we run on the default opennext Workers/`nodejs_compat` runtime — there is no edge export in this project). `[VERIFIED: inngest@4.11.0 npm, 2026-06-26]` `[CITED: inngest.com/docs/getting-started/nextjs-quick-start, accessed 2026-06-26]`
- **Client:** `new Inngest({ id, eventKey, signingKey })`. The SDK auto-reads `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` from `process.env`, but **pass them explicitly** to dodge opennext's env-timing ambiguity (see Pitfall P2). `[CITED: inngest.com/docs/learn/serving-inngest-functions, accessed 2026-06-26]`
- **`inngest.send()` from a Server Action** works on Workers — it's an HTTPS POST to the Inngest Event API over `fetch`. `[CITED: inngest.com/docs/getting-started/nextjs-quick-start, accessed 2026-06-26]`
- **Local dev:** `npx inngest-cli@latest dev` runs the dev server on `http://localhost:8288` and discovers functions at `/api/inngest`. **Do not start it until the route exists** — see Pitfall P1 (the dev-flood lesson). `[CITED: inngest.com/docs/getting-started/nextjs-quick-start, accessed 2026-06-26]` `[VERIFIED: .claude/lessons/general/inngest-dev-flood-corrupts-next.md]`
- **Production sync:** Inngest auto-syncs the app **on each deploy** when it can reach the endpoint with a valid `INNGEST_SIGNING_KEY`. With opennext there is no deploy webhook, so the robust path is a **manual sync after `pnpm deploy`**: in the Inngest Cloud dashboard, "Sync new app" → URL `https://<app>.workers.dev/api/inngest` (or trigger a `PUT` to that URL). `[CITED: inngest.com/docs/learn/serving-inngest-functions, accessed 2026-06-26]` `[ASSUMED]` that no auto-deploy hook exists for Cloudflare Workers (Inngest documents auto-sync for Vercel specifically) — treat the manual sync as the reliable path.
- **Retries + idempotency (NOT-05):** per-function `retries: N` (default 4 → 5 attempts); **each `step.run()` retries independently** and a completed step's result is **memoized** on replay. Add **function-level `idempotency: "event.data.eventId"`** so a duplicate event executes the function once. `[CITED: inngest.com/docs/reference/functions/step-run + /docs/patterns/flash-sales-and-bursty-workflows, accessed 2026-06-26]`

### Minimal code
```ts
// src/server/inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import { env } from "@/config/env";

type Events = {
  "pickup/created":        { data: { pickupId: string; eventId: string } };
  "pickup/claimed":        { data: { pickupId: string; eventId: string } };
  "pickup/status_changed": { data: { pickupId: string; eventId: string; toStatus: string } };
  "pickup/cancelled":      { data: { pickupId: string; eventId: string } };
};

export const inngest = new Inngest({
  id: "rajyash-food-rescue",
  eventKey: env.INNGEST_EVENT_KEY,       // explicit — see Pitfall P2
  signingKey: env.INNGEST_SIGNING_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});
```
```ts
// src/app/api/inngest/route.ts  (PUBLIC route — add to middleware allowlist)
import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { notifyOnPickupEvent } from "@/server/inngest/functions/notify";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [notifyOnPickupEvent],
});
```
```ts
// emit from a server action — AFTER the mutation + statusEvents.record (Pitfall P6)
await inngest.send({
  name: "pickup/claimed",
  data: { pickupId: id, eventId: statusEvent.id },  // statusEvents row id = stable dedup key
});
```
```ts
// src/server/inngest/functions/notify.ts (shape)
export const notifyOnPickupEvent = inngest.createFunction(
  {
    id: "notify-on-pickup-event",
    retries: 4,
    idempotency: "event.data.eventId",     // NOT-05 first guard: one run per logical event
  },
  [
    { event: "pickup/created" },
    { event: "pickup/claimed" },
    { event: "pickup/status_changed" },
    { event: "pickup/cancelled" },
  ],
  async ({ event, step }) => {
    const recipients = await step.run("resolve-recipients", () =>
      resolveRecipients(event)          // reads profiles/pickups → [{recipientId, channels, msg}]
    );
    for (const r of recipients) {
      for (const channelKey of r.channels) {
        // one step per (recipient, channel) → independent retry + memoization
        await step.run(`send-${channelKey}-${r.recipientId}`, () =>
          dispatchToChannel(channelKey, r, event.data.eventId)
        );
      }
    }
  },
);
```

---

## B. Web Push on the Workers runtime (the riskiest area)

### Decision — `web-push` will NOT work; use `@block65/webcrypto-web-push`
The classic **`web-push@3.6.7`** (last published 2024-01-16) is **Node-only and fails on Workers**. Three independent blockers, all verified: (1) it uses `Buffer`; (2) `https.request` is unsupported on Workers (must use `fetch`); (3) the hard stopper — `crypto.createECDH is not a function`, because `node:crypto` under `nodejs_compat` does **not** implement `createECDH`. `[VERIFIED: github.com/web-push-libs/web-push/issues/718, accessed 2026-06-26]` `[CITED: Cloudflare community + developers.cloudflare.com/workers/runtime-apis/nodejs/crypto, accessed 2026-06-26]`

**Use `@block65/webcrypto-web-push@1.0.2`** — npm description: *"Send notifications using Web Push Protocol and Web Crypto APIs (works with NodeJS, Cloudflare Workers, Bun and Deno)."* It does **not** send for you: `buildPushPayload()` returns a plain `{ method, headers, body }` object (VAPID-signed ES256 JWT + `aesgcm`-encrypted body) that you pass to **your own `fetch(endpoint, payload)`** — ideal for Workers and lets us read the response status to prune. `[VERIFIED: npm @block65/webcrypto-web-push@1.0.2 + its bundled README/dist .d.ts, 2026-06-26]`

> Note: the library emits the older **`aesgcm`** (ECE draft-03) content-encoding. That is "the most widely supported" encoding and is accepted by FCM (Chrome/Android), Mozilla autopush (Firefox), and Apple's Web Push — fine for v1. `[CITED: pushpad.xyz web-push errors + MDN, accessed 2026-06-26]` `[ASSUMED]` Apple Web Push acceptance of aesgcm (not separately tested this session) — low risk; Chrome/Firefox cover the volunteer base.

> ESM note: the package is ESM with `exports`. Project already uses Next's bundler resolution, so import works directly. `[VERIFIED: package.json exports field]`

### VAPID generation (one-time, deferred setup)
Generate the keypair **once**, store as secrets. Easiest generator is the `web-push` CLI run **locally on Node** (only used at gen time, never deployed): `npx web-push generate-vapid-keys`. Output → `VAPID_PUBLIC_KEY` (base64url, also exposed to client as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` = `mailto:rajyashfoundation@rajyashgroup.com`. `[ASSUMED]` web-push CLI key format is compatible with `@block65` (both emit standard P-256 base64url VAPID keys per RFC 8292) — verify once at setup by sending a test push.

### Send (Workers)
```ts
// src/server/notifications/push.ts
import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import { env } from "@/config/env";

const vapid: VapidKeys = {
  subject: env.VAPID_SUBJECT,            // "mailto:rajyashfoundation@rajyashgroup.com"
  publicKey: env.VAPID_PUBLIC_KEY,
  privateKey: env.VAPID_PRIVATE_KEY,
};

/** Returns "sent" | "pruned" (caller deletes the sub row on "pruned"). */
export async function sendWebPush(
  sub: PushSubscription,                 // { endpoint, expirationTime, keys: { p256dh, auth } }
  payload: { title: string; body: string; url?: string },
): Promise<"sent" | "pruned"> {
  const push = await buildPushPayload(
    { data: JSON.stringify(payload), options: { ttl: 60 } },
    sub,
    vapid,
  );
  const res = await fetch(sub.endpoint, push); // push = { method:"post", headers, body:Uint8Array }
  if (res.status === 404 || res.status === 410) return "pruned"; // expired/unsubscribed → delete row
  if (!res.ok) throw new Error(`push ${res.status}`);            // transient → let Inngest retry
  return "sent";
}
```

### Client subscribe flow (Next App Router)
```ts
// register the SW + subscribe, then save the sub via a server action
const reg = await navigator.serviceWorker.register("/sw.js");
const perm = await Notification.requestPermission();
if (perm !== "granted") return;
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
});
const j = sub.toJSON(); // { endpoint, keys: { p256dh, auth } }
await savePushSubscription({ endpoint: j.endpoint!, p256dh: j.keys!.p256dh!, auth: j.keys!.auth! });
```
`urlBase64ToUint8Array` is the standard VAPID helper (decode base64url → Uint8Array). `[CITED: developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe, accessed 2026-06-26]`

### Minimal `public/sw.js` (push-only; full PWA = Phase 7)
```js
self.addEventListener("push", (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.title || "Food Rescue", {
      body: d.body || "",
      data: { url: d.url || "/portal/dashboard" },
      icon: "/icon-192.png",
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/portal/dashboard"));
});
```

### Pruning (404/410)
On send, a `404` (invalid endpoint) or `410 Gone` (expired/unsubscribed) means the subscription is dead → **delete that `push_subscriptions` row**. Any other non-2xx → throw so Inngest retries the step. `[CITED: pushpad.xyz/blog/web-push-errors-explained + MDN 410 Gone, accessed 2026-06-26]`

---

## C. Resend email via `fetch` on Workers

### Decision
Send via the **REST API over raw `fetch`** — no `resend` SDK needed (the SDK is fetch-based too, but raw `fetch` keeps the dep count down and is unambiguously Workers-safe). `POST https://api.resend.com/emails`, `Authorization: Bearer ${RESEND_API_KEY}`. `[VERIFIED: resend@6.14.0 npm; CITED: resend.com/docs/api-reference/emails/send-email, accessed 2026-06-26]`

**Domain constraint (deferred):** without a verified domain, `from` **must** be `onboarding@resend.dev`, **and Resend will only deliver to the account owner's own email address** — all other recipients are silently dropped in sandbox. So email is effectively a no-op for real volunteers/donors until a domain is verified. Ship the channel, gate it behind env, and treat real delivery as **Deferred setup**. `[CITED: resend.com/docs + github.com/resend/resend-node#454, accessed 2026-06-26]`

### Minimal code
```ts
// src/server/notifications/email.ts
import { env } from "@/config/env";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Rajyash Food Rescue <onboarding@resend.dev>", // until domain verified
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`); // transient → Inngest retries
}
```

---

## D. Channel abstraction + dispatcher shape (NOT-04)

### Decision
A `NotificationChannel` interface, a **registry** keyed by channel, and a dispatcher that — **per (recipient, channel)** — does the **dedup insert first**, and only sends on a fresh insert. Put the dedup insert **inside** the dispatcher (not inside each channel), so every channel gets exactly-once for free and channels stay pure "how to send" units. Each channel send is its own Inngest `step.run` (§A) so one channel failing/retrying never blocks another (NOT-04 isolation).

### Minimal code
```ts
// src/server/notifications/types.ts
export type ChannelKey = "in_app" | "web_push" | "email";
export interface NotificationMessage {
  type: string;            // event type, e.g. "pickup/claimed"
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  pickupId?: string;
}
export interface Recipient { userId: string; email: string | null; }
export interface NotificationChannel {
  key: ChannelKey;
  send(msg: NotificationMessage, to: Recipient): Promise<void>;
}
```
```ts
// src/server/notifications/registry.ts  — adding/removing a channel is ONE edit here (NOT-04)
import { inAppChannel } from "./channels/inApp";
import { webPushChannel } from "./channels/webPush";
import { emailChannel } from "./channels/email";
import type { ChannelKey, NotificationChannel } from "./types";

export const CHANNELS: Record<ChannelKey, NotificationChannel> = {
  in_app: inAppChannel,
  web_push: webPushChannel,
  email: emailChannel,
};
```
```ts
// src/server/notifications/dispatch.ts  — dedup-then-send (NOT-05 second guard)
import { CHANNELS } from "./registry";
import { deliveriesRepo } from "@/server/db/repositories/deliveries";
import type { ChannelKey, NotificationMessage, Recipient } from "./types";

export async function dispatchToChannel(
  channelKey: ChannelKey, eventId: string, msg: NotificationMessage, to: Recipient,
): Promise<void> {
  const fresh = await deliveriesRepo.claim(eventId, to.userId, channelKey); // INSERT ... ON CONFLICT DO NOTHING
  if (!fresh) return;                       // already delivered this (event,recipient,channel) → skip
  await CHANNELS[channelKey].send(msg, to); // throw → Inngest retries the step; row already claimed
}
```
> Note the trade-off: claiming the row *before* the send means a send that throws leaves the row claimed, so an Inngest retry would skip it. For a notification app this is the right default (better a missed retry than a double-send). If at-least-once matters more for one channel, claim *after* a successful send for that channel — but then rely on Inngest idempotency + the unique constraint to catch concurrent dupes. Recommendation: **claim-before-send** (favor no-double-send), since Inngest's function-level idempotency already covers the common replay case.

The **in-app channel's `send` is itself the `notifications` table insert** — so an in-app "delivery" both records the bell item and is deduped by the same constraint.

---

## E. Schema (Drizzle)

Match existing conventions in `schema.ts`: **`text` PK via `crypto.randomUUID()`**, `timestamp(..., { withTimezone: true })`, FK → `profiles.id` / `pickups.id`.

```ts
// append to src/server/db/schema.ts

// ── Notifications (Phase 4) ──────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => profiles.id),
    type: text("type").notNull(),                 // "pickup/claimed" etc.
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data"),                          // import jsonb from drizzle-orm/pg-core
    pickupId: text("pickup_id").references(() => pickups.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.readAt), // unread bell count
  ],
);
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => profiles.id),
    endpoint: text("endpoint").notNull().unique(), // dedup + upsert key
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

import { unique } from "drizzle-orm/pg-core"; // add to imports
export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull(),          // statusEvents.id or `${pickupId}:${toStatus}`
    recipientId: text("recipient_id").notNull(),  // profiles.id (not FK'd — keep insert cheap/atomic)
    channel: text("channel").notNull(),           // "in_app" | "web_push" | "email"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("notif_delivery_unique").on(t.eventId, t.recipientId, t.channel)], // NOT-05
);
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
```

**`deliveriesRepo.claim`** = `INSERT ... ON CONFLICT (event_id, recipient_id, channel) DO NOTHING RETURNING id`; a returned row means "fresh, go send", empty means "already sent, skip". Drizzle: `.onConflictDoNothing().returning()` then `rows.length > 0`.

**RLS note:** the app talks to Postgres as the `postgres` role via postgres-js → **bypasses RLS** (mirrors Phase 2/3). Still **enable RLS with no anon policy** on all three tables so the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`/PostgREST cannot read them (no policy = deny for anon). Apply via Supabase MCP migration, same as `location_pings` in Phase 3. `[VERIFIED: 03-SUMMARY.md RLS pattern + client.ts uses postgres role]`

---

## F. Pitfalls (this stack)

### P1: `inngest-cli dev` floods the app before `/api/inngest` exists
**What goes wrong:** running `npx inngest-cli dev` while the route is missing → thousands of probe requests to `/api/inngest`, `/x/inngest`, etc.; each hits middleware → `/sign-in` recompile thrash → corrupts dev `.next` → `Cannot find module vendor-chunks/@clerk` → Server Actions silently return `{ok:false}` (look like a hang). **Avoid:** create `src/app/api/inngest/route.ts` **first**, only then start `inngest-cli dev`; if hit, stop the CLI + `rm -rf .next` + restart. `[VERIFIED: .claude/lessons/general/inngest-dev-flood-corrupts-next.md]`

### P2: Inngest keys missing at runtime on opennext → `inngest.send` fails silently
**What goes wrong:** opennext's `process.env` population at runtime is documented ambiguously (the official issue is still "waiting for feedback"); if `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` aren't seen, `inngest.send()` can no-op or 401 without surfacing in the action's happy path. **Avoid:** (a) add all six+ env vars to `src/config/env.ts` (boot validation refuses to start without them); (b) pass `eventKey`/`signingKey` **explicitly** to `new Inngest(...)` rather than relying on auto-read; (c) set them as **Cloudflare secrets** (`wrangler secret put`) for production, not just `.env.local`; (d) with `nodejs_compat` (already on), server-side `process.env.X` is populated at runtime — but the explicit pass removes all doubt. `[VERIFIED: opennext issue #596 unresolved; CITED: opennext.js.org/cloudflare/howtos/env-vars + bindings, accessed 2026-06-26]`

### P3: middleware blocks `/api/inngest`
**What goes wrong:** the current `clerkMiddleware` matcher includes `/(api|trpc)(.*)`, and any non-public route with no session redirects to `/sign-in`. Inngest calls the endpoint **server-to-server with no Clerk session** → every call 307s to sign-in → functions never run. **Avoid:** add `/api/inngest(.*)` to `isPublicRoute` in `src/middleware.ts` (return `NextResponse.next()` early). Auth is unnecessary — Inngest authenticates via the **signing-key signature** on the request, which `serve()` verifies. `[VERIFIED: src/middleware.ts; CITED: inngest.com/docs/learn/serving-inngest-functions, accessed 2026-06-26]`

### P4: using Node `web-push` on Workers → `crypto.createECDH is not a function`
Covered in §B. **Avoid:** never import `web-push`; use `@block65/webcrypto-web-push` + your own `fetch`. `[VERIFIED: web-push issue #718]`

### P5: Resend silently delivers nothing in sandbox
**What goes wrong:** without a verified domain, Resend only delivers to the **account owner's** address; all other `to:` are dropped with a 200 (no error). Tests "pass" but volunteers/donors get nothing. **Avoid:** treat email as deferred-real; in dev, send only to the owner address; document the domain-verify step. `[CITED: resend.com/docs, accessed 2026-06-26]`

### P6: emitting the Inngest event BEFORE the DB commit
**What goes wrong:** if `inngest.send()` runs before the mutation commits (or inside a not-yet-committed transaction), the function can fire and read stale/absent data (e.g. resolve recipients for a pickup that isn't visible yet). **Avoid:** emit **after** `pickupsRepo.*` + `statusEventsRepo.record()` succeed (these are separate awaited statements today, already committed), and use the returned `statusEvents.id` as `eventId`. `[VERIFIED: pickupActions.ts ordering + statusEvents repo returns the row]`

### P7: double-send on Inngest retry without the unique constraint
**What goes wrong:** Inngest retries a failed step; if the channel send isn't deduped, the recipient gets the notification twice. **Avoid:** the `notification_deliveries` UNIQUE + claim-before-send (§D/§E) **plus** function-level `idempotency` (§A). Both, not either. `[CITED: inngest.com/docs/reference/functions/step-run, accessed 2026-06-26]`

### P8: service-worker scope / path
**What goes wrong:** `sw.js` placed under a subpath only controls that subpath; push won't fire app-wide. **Avoid:** serve it from the **root** as `public/sw.js` → `navigator.serviceWorker.register("/sw.js")` (root scope). Don't reuse a Phase-7 PWA SW; ship a minimal push-only one now. `[CITED: developer.mozilla.org Service Worker scope, accessed 2026-06-26]`

### P9: per-request DB client (opennext) — don't module-cache a connection
The existing `getDb()` wraps the connection in React `cache()` (one per request) because Workers can't reuse connections across requests. New repos (`notificationsRepo`, `pushSubsRepo`, `deliveriesRepo`) **must** call `getDb()` inside each method, exactly like `pingsRepo`/`statusEventsRepo` — never hoist a module-level `db`. `[VERIFIED: src/server/db/client.ts + repositories/pings.ts]`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID ES256 signing + aes128gcm/aesgcm body encryption | A hand-rolled Web-Crypto web-push encryptor | `@block65/webcrypto-web-push` `buildPushPayload()` | ECE encryption + VAPID JWT are subtle and security-sensitive; this lib is Workers-tested |
| Job retries / backoff / replay memoization | A custom queue + retry loop | Inngest `retries` + `step.run` | Durable execution is the whole reason Inngest is the locked choice (D-01) |
| Exactly-once delivery | An in-memory "seen" set | DB `UNIQUE(event_id,recipient_id,channel)` + Inngest `idempotency` | Workers are stateless across requests; only the DB constraint is authoritative |
| Email transport (MIME, TLS) | Raw SMTP / nodemailer | Resend REST over `fetch` | SMTP needs raw sockets (unavailable on Workers); Resend is a single HTTPS POST |
| base64url ↔ Uint8Array for applicationServerKey | Ad-hoc atob loop scattered around | One shared `urlBase64ToUint8Array` helper in `src/lib` | One source of truth; the MDN snippet is the canonical form |

**Key insight:** on Workers, "use a Node library" is the trap — every notification primitive must be Web-Crypto + `fetch`. The two libraries chosen (`inngest`, `@block65/webcrypto-web-push`) are precisely the ones that are runtime-correct; everything else is `fetch`.

## Code Examples
All verified snippets are inline in §A–§E above (client, route, emit, function, push send, subscribe, sw.js, email, schema, dispatcher).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `web-push` npm on the server | `@block65/webcrypto-web-push` (Web Crypto) on Workers | Workers/edge era | `web-push` is unusable on Workers (`createECDH`) |
| Resend Node SDK | Resend REST over `fetch` (SDK optional, also fetch-based) | n/a | Either works on Workers; raw fetch = fewer deps |
| Inngest v3 | **Inngest v4** (`4.11.0`, 2026-06-23) | 2026 | `triggers: [...]` array + multi-event functions; v4 is `latest` |
| `export const runtime = "edge"` for route handlers | Default opennext Workers runtime (`nodejs_compat`) | this project | No edge export needed; route handlers already run on Workers |

**Deprecated/outdated:** `web-push` for this runtime; any `node:https`/`node:net` transport; relying on Inngest auto-sync for non-Vercel deploys (do a manual sync).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No Cloudflare deploy hook → Inngest must be **manually synced** after `pnpm deploy` | §A | If auto-sync works, the manual step is harmless redundancy; if it doesn't and we skip it, functions never register → silent no-fire. **Confirm at first deploy.** |
| A2 | `aesgcm` (draft-03) encoding from `@block65` is accepted by all target push services incl. Apple Web Push | §B | If a service rejects it, those subs get a 4xx (not 410) → step retries then fails; Chrome/Firefox (the volunteer base) are confirmed-fine. |
| A3 | `web-push` CLI VAPID keys are format-compatible with `@block65` | §B | If not, the first test push 401s; regenerate with the lib's own helper. **Verify with one test push at setup.** |
| A4 | With `nodejs_compat` on, server-side `process.env.<secret>` is populated at runtime under opennext | §A/P2 | Mitigated by passing keys explicitly + boot validation; if env is empty at runtime, `env.ts` fails fast rather than silently. |
| A5 | Email is effectively undeliverable to real users until a Resend domain is verified | §C/P5 | None for the build (channel still ships + dedups); only real-world email reach is blocked — already a locked Deferred item. |

## Open Questions

1. **`eventId` for `pickup/created`** — `createPickup` does **not** write a `status_events` row (it only creates the pickup at status `requested`). What's the stable dedup id?
   - What we know: claimed/advanced/cancelled go through `statusEventsRepo.record()` → a row id exists.
   - What's unclear: `created` has no status-event row.
   - Recommendation: use `eventId = ${pickupId}:created` (the CONTEXT D-03 fallback). Deterministic and unique per pickup. Apply the same `${pickupId}:${toStatus}` pattern uniformly if you'd rather not depend on `statusEvents.id`.

2. **Fan-out volume for `pickup/created`** — "all active volunteers" city-wide could be hundreds; each is (in_app + web_push) = 2 steps. Inngest free-tier step limits apply.
   - Recommendation: resolve recipients in one `step.run`, then fan out; if volume grows, switch to Inngest `step.sendEvent` batching or a single bulk in-app insert + a loop only for push. Fine at current NGO scale (~tens of volunteers).

3. **`requireRole` import for the in-app read paths** — bell/feed reads must be user-scoped (no IDOR), mirroring `getLatestPing`. Use `getSession()` + filter by `userId`; admin sees only their own bell (notifications are personal). No new auth primitive needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `inngest` (npm) | A — orchestration | ✗ (to install) | `4.11.0` latest | none — locked infra |
| `@block65/webcrypto-web-push` | B — web push | ✗ (to install) | `1.0.2` latest | hand-rolled Web-Crypto VAPID (avoid) |
| Resend account + API key | C — email | partial | — | sandbox `onboarding@resend.dev` (owner-only) until domain |
| Inngest account + keys | A | ✓ keys in `.env.local` | — | — |
| `nodejs_compat` flag | B/C — Web Crypto + fetch baseline | ✓ | `compatibility_date 2025-05-05` | — |
| VAPID keypair | B | ✗ (generate once) | — | none — must generate |
| Resend verified domain | C (real delivery) | ✗ | — | none — deferred (owner-only sandbox) |

**Missing dependencies with no fallback (deferred setup):** VAPID keypair generation; Resend domain verification; Inngest production app sync.
**Missing with fallback:** real email delivery → sandbox to owner address only until a domain is verified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + Testing Library (jsdom) |
| Config file | present (Phase 3 added 40 tests; `src/test/setup.ts`) |
| Quick run command | `pnpm test:run` (`vitest --run`) |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOT-04 | one channel throwing does NOT stop the others | unit | `pnpm test:run notifications/dispatch` | ❌ Wave 0 |
| NOT-05 | second send for same (event,recipient,channel) is skipped (dedup) | unit | `pnpm test:run notifications/dispatch` | ❌ Wave 0 |
| NOT-05 | claim returns fresh once, then empty (repo on conflict) | unit | `pnpm test:run repositories/deliveries` | ❌ Wave 0 |
| D-05 | recipient resolver maps each event → correct {recipients,channels} | unit | `pnpm test:run notifications/recipients` | ❌ Wave 0 |
| NOT-02 | sendWebPush returns "pruned" on 404/410, throws on other non-2xx | unit | `pnpm test:run notifications/push` (fetch mocked) | ❌ Wave 0 |
| NOT-01 | bell shows unread count; mark-all-read clears it | component | `pnpm test:run notifications/bell` | ❌ Wave 0 |

> Do NOT test (per testing-practices.md): the `sw.js` itself, Resend/Inngest SDK internals, the registry barrel, schema/types, "renders without throwing". Test the **decisions**: isolation, dedup, pruning logic, recipient mapping, unread derivation.

### Sampling Rate
- **Per task commit:** `pnpm test:run <path>` for the touched module.
- **Per wave merge:** `pnpm test:run` (full) + `pnpm typecheck` + `pnpm lint`.
- **Phase gate:** full suite green + `next build` before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/server/notifications/dispatch.test.ts` — NOT-04 isolation + NOT-05 dedup (mock channels + a fake deliveriesRepo)
- [ ] `src/server/notifications/recipients.test.ts` — D-05 matrix
- [ ] `src/server/notifications/push.test.ts` — 404/410 prune vs throw (mock `fetch` + stub `buildPushPayload`)
- [ ] `src/server/db/repositories/deliveries.test.ts` — claim on-conflict semantics (or fold into dispatch with a fake)
- [ ] `src/features/notifications/components/NotificationBell.test.tsx` — unread count + mark-all-read

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `/api/inngest` is intentionally unauthenticated by Clerk but authenticated by **Inngest signing-key signature** (verified in `serve()`); never expose it without the key check |
| V3 Session Management | no | no new sessions |
| V4 Access Control | yes | bell/feed reads **must** be user-scoped (`getSession()` + `userId` filter) — no IDOR (mirror `getLatestPing`); save/delete push sub scoped to the owner |
| V5 Input Validation | yes | validate coords/payloads already; validate `endpoint`/`p256dh`/`auth` shape on save (zod) before insert |
| V6 Cryptography | yes | **never hand-roll** VAPID/ECE — delegate to `@block65/webcrypto-web-push` (Web Crypto) |
| V9 Communications | yes | all egress over HTTPS `fetch` (push endpoint, Resend, Inngest) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged calls to `/api/inngest` | Spoofing | Inngest signing-key signature verification (built into `serve()`); keep `INNGEST_SIGNING_KEY` a secret |
| Reading another user's notifications | Info disclosure (IDOR) | server-side `userId` scoping on every read + RLS-deny for anon |
| Notification flooding / dup sends | DoS / annoyance | dedup constraint + Inngest idempotency; recipient resolver bounded to role=volunteer/donor |
| Secret leakage (VAPID private, Resend, signing key) | Info disclosure | server-only env, Cloudflare secrets, `env.ts` server block (never `NEXT_PUBLIC_` except the VAPID **public** key) |
| Anon read via PostgREST/anon key | Info disclosure | enable RLS with no anon policy on all 3 tables (deny-by-default) |

## Files to Create / Modify (for the planner)

**Create**
- `src/app/api/inngest/route.ts` — serve `{GET,POST,PUT}` (PUBLIC)
- `src/server/inngest/client.ts` — typed Inngest client (explicit keys)
- `src/server/inngest/functions/notify.ts` — fan-out function (idempotency + per-channel steps)
- `src/server/inngest/recipients.ts` — `resolveRecipients(event)` (D-05 matrix; reads profiles/pickups)
- `src/server/notifications/types.ts` — `NotificationChannel`, `NotificationMessage`, `Recipient`, `ChannelKey`
- `src/server/notifications/registry.ts` — `CHANNELS` map (the one NOT-04 edit point)
- `src/server/notifications/dispatch.ts` — `dispatchToChannel` (dedup-then-send)
- `src/server/notifications/channels/{inApp,webPush,email}.ts` — three `NotificationChannel`s
- `src/server/notifications/push.ts` — `sendWebPush` (`@block65` + fetch + prune)
- `src/server/notifications/email.ts` — `sendEmail` (Resend REST)
- `src/server/notifications/copy.ts` — per-event title/body builder (single source of truth)
- `src/server/db/repositories/{notifications,pushSubs,deliveries}.ts` — repos (call `getDb()` per method)
- `src/features/notifications/` — `components/NotificationBell.tsx`, `NotificationFeed.tsx`; `actions/notificationActions.ts` (list/markRead/markAllRead, `savePushSubscription`, `deletePushSubscription`); `hooks/`; barrel `index.ts`
- `src/features/notifications/components/PushOptIn.tsx` — permission prompt + subscribe
- `public/sw.js` — minimal push SW
- `src/lib/push.ts` — `urlBase64ToUint8Array` helper
- Wave 0 test files (above)

**Modify**
- `src/middleware.ts` — add `/api/inngest(.*)` to `isPublicRoute`
- `src/config/env.ts` — add server: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `RESEND_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`; client: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (+ runtimeEnv entry)
- `src/server/db/schema.ts` — `notifications`, `push_subscriptions`, `notification_deliveries` (+ `jsonb`, `unique` imports)
- `src/features/pickups/actions/pickupActions.ts` — `inngest.send(...)` after commit in createPickup/claimPickup/advancePickup/cancelPickup
- `src/config/constants.ts` — `QUERY_KEYS.notifications`, `ROUTES` for the feed if a dedicated page; notification `type` constants
- portal nav component — mount `<NotificationBell/>`
- Supabase migration (via MCP) — create 3 tables + enable RLS (deny anon), like Phase 3's `0002`
- `.env.example` — add the new keys (placeholder values)

## Deps to add
```bash
pnpm add inngest @block65/webcrypto-web-push
# Resend: REST over fetch — NO package needed. web-push: do NOT install (Node-only, breaks on Workers).
```
- `inngest@^4.11.0` `[VERIFIED: npm latest 2026-06-23]`
- `@block65/webcrypto-web-push@^1.0.2` `[VERIFIED: npm latest 2024-12-15]`

## Env to add
| Var | Scope | Notes |
|-----|-------|-------|
| `INNGEST_EVENT_KEY` | server | in `.env.local`; add to env.ts + CF secret |
| `INNGEST_SIGNING_KEY` | server | in `.env.local`; add to env.ts + CF secret |
| `RESEND_API_KEY` | server | new — Resend dashboard |
| `VAPID_PUBLIC_KEY` | server | generate once |
| `VAPID_PRIVATE_KEY` | server | generate once (secret) |
| `VAPID_SUBJECT` | server | `mailto:rajyashfoundation@rajyashgroup.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client | same value as VAPID_PUBLIC_KEY; inlined at build → also a CF build var |

## Deferred setup
1. **VAPID keypair** — `npx web-push generate-vapid-keys` (local Node, gen only) → set 4 vars (3 server + 1 public) locally and as CF secrets/build vars. Verify with one test push.
2. **Resend domain** — verify a sending domain; until then `from: onboarding@resend.dev` and only the account-owner address receives mail.
3. **Inngest production sync** — after `pnpm deploy`, in Inngest Cloud "Sync app" → `https://<app>.workers.dev/api/inngest`; set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` as CF secrets.
4. **CF secrets/vars** — `wrangler secret put` for all server secrets; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as a build var (it's inlined at build).

## Open risks
- **R1 (A1):** Inngest non-Vercel auto-sync unconfirmed → mitigate with manual sync at deploy.
- **R2 (A3):** VAPID key cross-lib compatibility → one test push at setup confirms it.
- **R3:** opennext runtime `process.env` for secrets is documented ambiguously → mitigated by explicit key passing + boot validation (P2).
- **R4:** `aesgcm` is the older encoding → acceptable for Chrome/Firefox; revisit only if a service 4xxs (A2).
- **R5:** email is a build-complete but real-world-inert channel until the domain is verified (by design).

## Sources

### Primary (HIGH)
- npm registry (versions/dates, 2026-06-26): `inngest@4.11.0`, `resend@6.14.0`, `web-push@3.6.7`, `@block65/webcrypto-web-push@1.0.2` (+ its bundled README and dist `.d.ts` read locally)
- Inngest docs — getting-started/nextjs-quick-start; learn/serving-inngest-functions; reference/functions/step-run; patterns/flash-sales (idempotency); examples/middleware/cloudflare-workers-environment-variables — accessed 2026-06-26
- Resend docs — api-reference/emails/send-email — accessed 2026-06-26
- Cloudflare — workers/runtime-apis/nodejs/crypto; workers/runtime-apis/web-crypto — accessed 2026-06-26
- MDN — PushManager.subscribe; HTTP 410 Gone — accessed 2026-06-26
- Repo: `package.json`, `wrangler.jsonc`, `open-next.config.ts`, `src/middleware.ts`, `src/config/{env,constants}.ts`, `src/server/db/{schema,client}.ts`, `src/server/db/repositories/{pings,statusEvents}.ts`, `src/features/pickups/actions/pickupActions.ts`, `.claude/lessons/general/inngest-dev-flood-corrupts-next.md`, `03-SUMMARY.md`

### Secondary (MEDIUM, verified against above)
- github.com/web-push-libs/web-push/issues/718 (web-push Workers incompatibility — `createECDH`, `https.request`, Buffer) — accessed 2026-06-26
- opennext.js.org/cloudflare — howtos/env-vars, bindings, get-started — accessed 2026-06-26
- pushpad.xyz — web-push errors by status code (404/410 pruning) — accessed 2026-06-26
- github.com/resend/resend-node/issues/454 (sandbox owner-only delivery) — accessed 2026-06-26

### Tertiary (LOW, flagged)
- github.com/opennextjs/opennextjs-cloudflare/issues/596 (process.env-at-runtime ambiguity, "waiting for feedback") — informs P2/R3, not a settled source

## Metadata
**Confidence breakdown:**
- Standard stack (inngest, @block65, Resend REST): HIGH — versions + APIs verified against registry + official docs + the package's own type declarations.
- Web-push-on-Workers decision: HIGH — incompatibility of `web-push` and viability of `@block65` both verified from multiple sources.
- Inngest opennext env/sync specifics: MEDIUM — official docs are Vercel-centric; mitigations (explicit keys, manual sync) are documented and low-risk (A1, A4).
- aesgcm acceptance + VAPID cross-lib: MEDIUM — Chrome/Firefox confirmed; one test push closes A2/A3.

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (inngest moves fast — re-check the major before a later phase; the rest is stable)
