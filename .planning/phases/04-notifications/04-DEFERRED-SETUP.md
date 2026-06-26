# Phase 4 — Deferred Setup (Notifications)

What's already done vs your remaining touchpoints.

## ✅ Already done (build session)
- `notifications`, `push_subscriptions`, `notification_deliveries` tables + RLS (deny-anon) — **applied live** via Supabase MCP (migration 0003).
- Inngest keys present in `.env.local` (renamed from your bare `EVENT_KEY`/`SIGNING_KEY` → `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`).
- **VAPID keypair generated** locally + in `.env.local` (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
- `INNGEST_DEV=1` in `.env.local` (local only — talks to `inngest-cli dev`).
- E2E-verified locally (in-app pipeline, dedup, real FCM push subscribe) with `npx inngest-cli dev`.

## ⏳ Still deferred (your touchpoints)

### 1. Inngest — production sync
Local dev uses `inngest-cli dev` (`npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`).
For production:
- Set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` (your real Inngest Cloud keys) as Cloudflare secrets:
  `wrangler secret put INNGEST_EVENT_KEY` / `wrangler secret put INNGEST_SIGNING_KEY`.
- **Do NOT set `INNGEST_DEV` in production** (it forces dev mode). It lives only in `.env.local`.
- After deploy, sync the app in the Inngest dashboard with the prod URL
  `https://<app>.workers.dev/api/inngest` (or it auto-syncs on deploy via the signing key).

### 2. Resend — real key + verified domain (email currently inert)
- `RESEND_API_KEY` in `.env.local` is a **placeholder**. Add your real `re_...` key (dev + Cloudflare secret).
- Without a verified domain, Resend's sandbox (`onboarding@resend.dev`) only delivers to the
  **account owner's** address. Verify a domain in Resend → then change the `from` in
  `src/server/notifications/email.ts` to your domain address to email arbitrary donors.

### 3. VAPID + Supabase public vars as Cloudflare secrets/vars + redeploy
- `wrangler secret put VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT` (+ the public key as a
  Worker var `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Then `pnpm run deploy`.
- The VAPID keypair generated this session is fine to keep, or regenerate for prod
  (`npx web-push generate-vapid-keys`) — if you regenerate, existing subscriptions are invalidated.

## How to run the full pipeline locally (for future testing)
1. `pnpm dev` (with `INNGEST_DEV=1` in `.env.local`).
2. `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest --no-discovery`.
3. Post/claim a pickup → watch notifications appear (Inngest dashboard on http://localhost:8288).
   ⚠️ Running `inngest-cli dev` WITHOUT `/api/inngest` existing floods the app (lesson:
   inngest-dev-flood-corrupts-next) — the route exists now, so it's fine.

## Channel matrix (who gets what) — for reference
- new pickup → all onboarded volunteers (in-app + web push)
- claimed → donor (in-app + push + email)
- en_route / picked_up → donor (in-app + push); delivered also emails
- cancelled → donor (in-app only)
