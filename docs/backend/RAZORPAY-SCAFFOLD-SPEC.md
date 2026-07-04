# Razorpay donation scaffold — dark behind a flag (build contract)

Status: LOCKED. Builds Phase 5 (PAY-01..04) code-complete but INERT — no live keys, KYC not cleared. Everything gates on a feature flag defaulting OFF, so this ships to prod dark and lights up later with zero code change. Hard constraint: payments verified server-side via webhook HMAC; the client callback NEVER creates a record.

## 0. Feature flag (master switch)
- Server env `PAYMENTS_ENABLED` (z.coerce.boolean, default false) + client `NEXT_PUBLIC_PAYMENTS_ENABLED` (same, default false) in src/config/env.ts (+ experimental__runtimeEnv entry for the public one).
- Razorpay creds OPTIONAL (read only when enabled): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (server, .optional()), `NEXT_PUBLIC_RAZORPAY_KEY_ID` (client, optional). Do NOT make them required — app must boot with them unset.
- Flag OFF: /donate → notFound(); createDonationOrder → {ok:false, code:"DISABLED"}; webhook route → 404. No donate entry point renders.

## 1. Schema (migration committed, NOT applied)
- `donations` table: id (uuid pk), razorpayOrderId text unique, razorpayPaymentId text unique nullable, amount integer (paise), currency text default 'INR', status text (created|paid|failed), donorName text nullable, donorEmail text nullable, receiptNumber text unique nullable, createdAt/updatedAt. Indexes on razorpayOrderId, razorpayPaymentId.
- `webhook_events` ledger: eventId text pk (Razorpay x-razorpay-event-id), processedAt timestamp.
- drizzle-kit generate the migration; COMMIT the .sql + meta; DO NOT apply to any DB.

## 2. Server flow — webhook-first, HMAC-verified
- src/features/donations/actions/donationActions.ts → createDonationOrder({amount, name?, email?}): flag-gated; Zod-validate amount (min 1000 paise = ₹10, sane max ceiling e.g. 10000000 paise); call Razorpay Orders API via fetch (Basic auth key_id:key_secret, base64) — NOT the Node SDK; insert donations row status:'created'; return {ok:true, orderId, amount, keyId}. NEVER marks paid here.
- src/app/api/razorpay/webhook/route.ts (POST, flag-gated, add to isPublicRoute in middleware, force-dynamic):
  1. Read RAW body (await req.text()) BEFORE any JSON parse (HMAC needs exact bytes).
  2. Verify x-razorpay-signature = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET) via WebCrypto (crypto.subtle.importKey 'HMAC' SHA-256 + sign; hex-encode; constant-time compare — mirror src/server/notifications/push.ts WebCrypto usage). Invalid → 400, logger.warn("razorpay webhook bad sig"), no side effects.
  3. Idempotency: INSERT INTO webhook_events (eventId) ON CONFLICT DO NOTHING; 0 rows (replay) → 200 {ok:true, dedup:true}, no side effects.
  4. payment.captured → update matching donations row (by razorpayOrderId from payload) to status:'paid', set razorpayPaymentId, generate receiptNumber (e.g. RJ-FY<year>-<short id>); emit Inngest 'donation/captured' (best-effort try/catch) → receipt email. payment.failed → status:'failed'. Unknown event → 200 no-op.
  5. Always 200 on validly-signed + idempotent-handled so Razorpay stops retrying.
- New Inngest fn sendDonationReceipt (register in src/app/api/inngest/route.ts): 80G-style receipt email via existing Resend infra (donor name, amount ₹, receiptNumber, date, NGO name + placeholder 80G line from a config constant NGO_80G_NUMBER that is EMPTY by default with a TODO(owner) — never invent a real number).

## 3. Client (rendered only when flag on)
- /donate page (public, (public) group, own --rj-* editorial styling matching src/app/(public)/privacy/page.tsx): amount presets + custom, optional name/email, Donate button → createDonationOrder → load Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js) via a dynamically-injected script; add checkout.razorpay.com + api.razorpay.com to CSP script-src + frame-src in middleware (ONLY those; keep the rest of the CSP untouched). Open widget with orderId; the client callback shows a "thank you — your receipt is on its way" screen that makes NO truth claim about the payment (webhook is source of truth).
- Donate CTA/link in public header/footer, flag-gated (hidden when off).
- i18n: new `donate` namespace EN + GU + HI (faithful; register in src/i18n/request.ts; catalog-parity test must pass).

## 4. Tests (security-critical matter most)
- HMAC verify: valid sig passes, tampered body/sig fails (deterministic WebCrypto vectors).
- Idempotency: same eventId twice → one mutation, second is dedup no-op.
- Flag gating: action + webhook + page all inert when PAYMENTS_ENABLED false.
- Amount validation: below-min / non-integer / over-ceiling rejected.
- Client-callback-never-creates: createDonationOrder sets status:'created' only; only the webhook flips to 'paid'.

## Validation bar
tsc + eslint (changed files explicit) + vitest --run zero new failures (8 known env-flaky: Postgres-auth "HP", LanguageSwitcher/NotificationBell). App MUST boot with all Razorpay envs unset. Conventional commits, no Co-Authored-By, no local build, migration committed-not-applied.

---

## Implementation notes (as-built)

These record how the LOCKED contract above was realized and the one deliberate deviation.

- **Files added:** `src/server/payments/razorpay.ts` (HMAC verify + Orders API + receipt
  numbering), `src/server/db/repositories/donations.ts`, `src/features/donations/**`
  (validations, actions, components), `src/app/api/razorpay/webhook/route.ts`,
  `src/server/inngest/functions/donations.ts`, `src/app/(public)/donate/page.tsx`,
  `src/i18n/messages/{en,gu,hi}/donate.json`, migration `0012_add_donations.sql`.
- **Boolean flag semantics (hardened):** both `PAYMENTS_ENABLED` and
  `NEXT_PUBLIC_PAYMENTS_ENABLED` use an explicit-truthy parse
  `z.string().optional().transform((v) => v === "1" || v === "true")` — NOT
  `z.coerce.boolean()`, which treats the string `"false"` as `true`
  (`Boolean("false") === true`), an unsafe footgun for a payment kill-switch. Now ONLY
  `"1"` or `"true"` enables; UNSET / `"false"` / `"0"` / `""` / anything-else → `false`.
  Go-live still sets `=1`; setting `=false` to be explicit is also safe.
- **Webhook idempotency is ATOMIC:** the `webhook_events` claim and the donation mutation
  commit or roll back together inside a single `db.transaction` (`donationsRepo.recordCapture`
  / `recordFailed`). A transient failure during the mutation rolls back the claim, so a
  Razorpay re-delivery re-processes rather than being deduped away into a lost payment. The
  Inngest receipt event is emitted OUTSIDE the transaction, only after it commits with
  outcome `paid`.
- **CSP:** only `checkout.razorpay.com` + `api.razorpay.com` were added to `script-src`
  and `frame-src`; the rest of the report-only CSP is untouched. `connect-src` already
  allowed `https:` so the widget's XHR to `api.razorpay.com` needs no further change.
- **Receipt number:** `RJ-FY<financial-year>-<6 hex>`, e.g. `RJ-FY2026-27-9F3AC1`. The DB
  `receipt_number` UNIQUE constraint is the real uniqueness guard.
- **80G line:** omitted from the receipt email while `NGO_80G_NUMBER` is empty. No number
  is ever invented.

## Owner go-live checklist

1. Clear Razorpay NGO KYC (parallel-track blocker — start early).
2. Paste live keys into the environment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. In the Razorpay dashboard, register the webhook URL `https://<host>/api/razorpay/webhook`
   for `payment.captured` + `payment.failed`, set a signing secret, and put that same value
   in `RAZORPAY_WEBHOOK_SECRET`.
4. Apply the committed migration `0012_add_donations.sql` to the database
   (`pnpm db:migrate`, run locally against `DIRECT_URL` — never from the Worker).
5. Set `NGO_80G_NUMBER` in `src/config/constants.ts` to the Foundation's real 80G number.
6. Flip the flags: `PAYMENTS_ENABLED=1` and `NEXT_PUBLIC_PAYMENTS_ENABLED=1`. Redeploy.
