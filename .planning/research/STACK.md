# Stack Research

**Domain:** Food-rescue / surplus-food-donation logistics web app (NGO, India)
**Researched:** 2026-06-25
**Confidence:** HIGH (most choices verified via official docs / Context7; India SMS pricing MEDIUM)

---

## Decided: Not re-litigated here

| Decision | Choice |
|----------|--------|
| Framework | Next.js 15 App Router |
| Database engine | PostgreSQL |
| Hosting | Vercel + managed Postgres |
| Forms + validation | React Hook Form + Zod v4 |
| Client server-state | TanStack Query v5 |
| UI state | Zustand |
| Component system | shadcn/ui + Radix + Tailwind CSS |

---

## Recommended Stack — Detailed

### 1. Database: Neon (managed Postgres)

**Recommendation: Neon over Supabase Postgres**

Neon is a pure serverless Postgres service; Supabase bundles Postgres with Auth, Storage, and Realtime.
We are NOT using Supabase Auth, Supabase Storage, or Supabase Realtime (see below for those decisions),
so paying for a bundled platform we don't use makes no sense.

| Dimension | Neon | Supabase Postgres |
|-----------|------|-------------------|
| Free tier | 0.5 GB storage, 100 CU-hours compute/month | 500 MB DB, pauses after 7 days inactivity |
| Scale to zero | Yes (all tiers) | Free tier only |
| Vercel integration | Native (Vercel Postgres = Neon under the hood) | Manual env wiring |
| Branching | Database branching for preview deploys | Not available |
| Serverless driver | `@neondatabase/serverless` (HTTP + WebSocket) | `postgres` package |
| Cold-start penalty | Minimal (compute wakes in ~100ms) | Free tier cold start is slow |

Neon's scale-to-zero avoids idle billing — critical for an NGO that may have quiet nights.
Its branching feature integrates with Vercel preview deploys cleanly.

**Confidence: HIGH** — verified via Neon and Supabase official docs.

---

### 2. ORM + Migrations: Drizzle ORM + drizzle-kit

**Recommendation: Drizzle over Prisma**

| Dimension | Drizzle | Prisma |
|-----------|---------|--------|
| Bundle size | ~7.4 KB gzip | ~1.6 MB (even post-Prisma 7) |
| Serverless/edge | Excellent (`neon-http` driver, no TCP) | Improved with Prisma 7 but still heavier |
| Neon native driver | `drizzle-orm/neon-http` is the recommended pattern | Works but requires additional adapter config |
| Migration workflow | `drizzle-kit generate` + `drizzle-kit migrate` (SQL files committed, explicit) | Auto-migration (less transparent) |
| Learning curve | Requires SQL familiarity (good for team using Postgres directly) | More abstract, gentler onboarding |
| Type safety | Instant type updates on schema edit | Requires `prisma generate` step |

For a single-developer/small-team NGO app on Vercel serverless, the ~7.4 KB vs 1.6 MB bundle
difference matters on cold-start latency. Drizzle's SQL-like API also keeps queries transparent.

**Install:**
```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

**drizzle.config.ts:**
```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

**Neon HTTP driver (serverless-safe):**
```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
export const db = drizzle(neon(process.env.DATABASE_URL!));
```

drizzle-kit version pinned at `0.31.x` (latest as of research date per Context7).
drizzle-orm at `^0.39.x`.

**Confidence: HIGH** — verified via Context7 `/drizzle-team/drizzle-orm` and official Neon docs.

---

### 3. Authentication: Clerk

**Recommendation: Clerk over Auth.js / NextAuth v5 / Supabase Auth / custom**

Rationale:
- **Phone OTP is first-class in Clerk** — built-in SMS OTP via Clerk's managed delivery
  (no need to wire an OTP provider separately for auth). Works globally including India.
- **DLT compliance for India SMS:** Clerk routes auth SMS through its own infrastructure;
  for v1 with low auth volume this is acceptable. If Indian DLT compliance or cost at scale
  becomes a concern, Clerk allows custom SMS providers — wire MSG91 as the backend later
  without changing your auth code.
- **Free tier: 10,000 Monthly Active Users** (MAU). Rajyash Foundation has donors,
  volunteers, and a small admin staff — well within the free tier for v1.
- **App Router native:** `@clerk/nextjs` has first-party middleware, `auth()` helper,
  and `<ClerkProvider>` that all work correctly in Next.js 15 App Router.
- **Avoids building auth:** Zero sessions, JWT rotation, password-reset flows, or MFA
  code to maintain. For an NGO with no dedicated backend engineer, this is decisive.
- **Role-based access:** Clerk metadata supports `role: 'admin' | 'volunteer' | 'donor'`
  stored in `publicMetadata`, readable in middleware and server actions.

| Auth option | Phone OTP | App Router native | Free tier | Ops burden |
|-------------|-----------|-------------------|-----------|------------|
| Clerk | Yes (built-in) | Yes | 10K MAU | Zero |
| Auth.js v5 | No (needs custom provider) | Yes (beta) | Unlimited (OSS) | Medium |
| Supabase Auth | Yes | Requires adapter | 50K MAU | Low |
| Firebase Auth | Yes | Requires adapter | 10K/month SMS verifications | Low-Medium |
| Custom + MSG91 | Build it yourself | Yes | Pay per SMS only | High |

**What NOT to use:**
- **Auth.js/NextAuth v5** for this project: phone OTP requires rolling a custom credentials
  provider, a TOTP/SMS service, and rate-limit middleware. Too much custom plumbing for an NGO app.
- **Supabase Auth** if you're already on Neon (splitting your Postgres between two platforms
  is confusing and creates a dependency on Supabase's free tier pause behavior).

**Install:**
```bash
pnpm add @clerk/nextjs
```

**Confidence: HIGH** — Clerk docs verified for App Router, phone OTP, India support.

---

### 4. Payments: Razorpay

**Recommendation: Razorpay (already decided; confirming integration pattern)**

Razorpay is the standard for Indian UPI/card/wallet payments. No alternative needed.

**Integration pattern (security-first):**
1. Server Action creates Razorpay order via `razorpay.orders.create()` — never client-side.
2. Client loads Razorpay checkout script, passes `order_id`.
3. On success callback, client posts `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` to a Server Action.
4. Server Action verifies HMAC-SHA256 signature before recording donation in DB.
5. Razorpay Webhook (POST `/api/webhooks/razorpay`) handles async events (captures, refunds) — verify webhook signature before processing; make handler idempotent.

**Install:**
```bash
pnpm add razorpay
```

Use `razorpay` npm package (official SDK). Current version `^2.9.x`.
Load the checkout script lazily in a client component (`<Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />`).

**Confidence: HIGH** — Official Razorpay Node.js SDK + multiple verified integration guides.

---

### 5. Real-time (Live Pickup Tracking): Pusher Channels

**Recommendation: Pusher Channels over Supabase Realtime, Ably, or self-hosted sockets**

| Option | Free tier | Ops | Latency | Fit |
|--------|-----------|-----|---------|-----|
| Pusher Channels | 200K msgs/day, 100 concurrent | Zero | Low | Best for NGO v1 |
| Ably | 6M msgs/month, 100 peak connections | Zero | Low | Better guarantees, $50/mo paid |
| Supabase Realtime | 50K MAU | Low | Low | Fine if using Supabase — we're not |
| Postgres LISTEN/NOTIFY | Free (self-hosted) | High (persistent connection) | Low | Not Vercel-compatible |
| Socket.io self-hosted | Free | High (separate server) | Low | Doesn't fit Vercel serverless |

Pusher's 200K messages/day free tier is sufficient for Rajyash Foundation's scale in Ahmedabad
(~200 meals/day, each rescue produces ~5-10 events). The 100-connection limit is fine for v1
concurrent active pickups.

**Upgrade path:** If volume grows, Pusher Starter plan at $49/month adds 5M messages/month and
1000 connections. Or migrate to Ably at that point.

**Pattern for live tracking:**
- Server Action / API route publishes to a Pusher channel (`pickup-{id}`) when status changes.
- Client subscribes via `pusher-js` on the tracking page.
- Volunteer's location updates can go through the same channel (volunteer posts location every N seconds via a Server Action that publishes to Pusher).

**Install:**
```bash
pnpm add pusher pusher-js
```

`pusher` = server SDK; `pusher-js` = browser client.

**Confidence: MEDIUM** — Pusher pricing verified; architecture pattern from community sources.

---

### 6. Maps, Geocoding, Routing: Mapbox GL JS

**Recommendation: Mapbox over Google Maps for this NGO**

| Dimension | Mapbox | Google Maps |
|-----------|--------|-------------|
| Free tier | 50,000 map loads/month + 100K direction requests/month | Free usage caps (replaced $200 credit March 2025) |
| India geocoding quality | Good | Excellent |
| Routing for India | Good (OpenStreetMap data) | Excellent (local data) |
| Style customizability | Very high (custom map styles) | Limited without premium |
| React integration | `react-map-gl` wrapper | `@vis.gl/react-google-maps` |
| Cost at NGO scale | ~0 (within free tier) | Risky after March 2025 pricing changes |
| Nonprofit program | No specific discount published | Unpublished; requires application |

Mapbox's 50,000 free map loads/month and 100,000 free directions requests/month cover Rajyash
Foundation's expected usage comfortably at zero cost. Google Maps' 2025 repricing (replaced
flat $200 credit with per-feature caps) makes budgeting less predictable for an NGO.

**What to use:**
- `mapbox-gl` + `react-map-gl` for map rendering and live marker updates
- Mapbox Geocoding API for address search (donor creating pickup location)
- Mapbox Directions API for estimated routes (optional v1 feature)

**India geocoding caveat (MEDIUM confidence):** Google Maps has higher India-specific geocoding
accuracy (local business names, street addresses). Mapbox uses OpenStreetMap which is generally
good for Ahmedabad. If geocoding quality is a complaint in early user testing, add a Google
Geocoding API call as a fallback (it's ~$0.005/request, the free tier covers 40K/month).

**Install:**
```bash
pnpm add mapbox-gl react-map-gl
pnpm add -D @types/mapbox-gl
```

**Confidence: MEDIUM** — Mapbox pricing verified; India geocoding quality assessment is based on community reports.

---

### 7. Email Notifications: Resend + React Email

**Recommendation: Resend**

- Free tier: 3,000 emails/month — more than enough for an NGO at current scale.
- Built by the React Email team — email templates are React components (`react-email`).
- Native `next.js` integration via Server Actions.
- API is clean: `resend.emails.send({to, from, subject, react: <MyTemplate />})`.

**What NOT to use:**
- SendGrid: free tier deprecated (100/day is not reliable), complex API.
- AWS SES: too much IAM/configuration overhead for a low-ops project.
- Nodemailer: raw SMTP config — more setup, less reliability than a managed API.

**Install:**
```bash
pnpm add resend react-email @react-email/components
```

**Confidence: HIGH** — Resend pricing and Next.js integration verified on official docs.

---

### 8. SMS + WhatsApp Notifications (India): MSG91

**Recommendation: MSG91 over Twilio, Gupshup**

| Provider | India SMS cost | WhatsApp | DLT support | NGO-fit |
|----------|---------------|----------|-------------|---------|
| MSG91 | ₹0.15–0.20/SMS | Yes (Meta rates, no markup) | Yes (managed) | Best |
| Gupshup | ~₹0.20–0.28/SMS | Yes (+₹0.08/msg markup) | Yes | OK |
| Twilio | ~₹0.63/SMS | Yes | Limited India DLT | Expensive |
| 2Factor.in | ~₹0.10–0.15/SMS | No | Yes | OTP-only |

**Critical India-specific requirement — DLT compliance:** TRAI mandates all commercial SMS
in India be sent via DLT-registered templates (Distributed Ledger Technology platform). MSG91
manages DLT registration assistance and template whitelisting as part of its onboarding. Any
provider you use MUST support DLT; Twilio's India DLT support is limited and requires extra setup.

**What to use from MSG91:**
- **OTP API** for phone number verification (if rolling custom OTP outside Clerk, or for in-app
  re-verification flows)
- **Transactional SMS API** for status-change notifications (pickup accepted, picked up, delivered)
- **WhatsApp Business API** (via MSG91 Hello) for WhatsApp notifications — many Ahmedabad users
  prefer WhatsApp over SMS

**MSG91 free credits:** MSG91 offers free credits on signup for testing. No always-free tier for
production — factor ₹0.15–0.20/SMS into operating costs (a 200-meal/day operation with ~3-4 SMS
notifications per rescue = ~₹120-160/day max, ~₹3,600-4,800/month, which is affordable).

**Install:** HTTP API only — no official npm package. Use `fetch` from a Server Action.
```bash
pnpm add axios  # or just use native fetch in Server Actions
```

Build a thin `src/lib/msg91.ts` wrapper for `sms.send()` and `whatsapp.send()`.

**Confidence: MEDIUM** — MSG91 pricing from official pricing page and community comparisons. DLT requirement verified as TRAI mandate.

---

### 9. Web Push Notifications: `web-push` (self-hosted VAPID)

**Recommendation: Self-hosted VAPID push via `web-push` npm package**

No third-party service needed. The Web Push Protocol is a browser standard; `web-push` handles
VAPID key signing and pushing to browser push services (FCM for Chrome, APNs for Safari 16.4+).

**Flow:**
1. Generate VAPID key pair once: `npx web-push generate-vapid-keys`
2. Service worker registered in `/public/sw.js` listens for `push` events.
3. User grants permission → browser returns `PushSubscription` object → POST to `/api/push/subscribe` → store in DB.
4. On pickup status change, Server Action calls `webpush.sendNotification(subscription, payload)`.

**Cost:** Free. No third-party dependency or per-notification cost.

**Caveat:** iOS Safari push requires iOS 16.4+ AND the user must have added the site to their
home screen (PWA installation). For Indian Android users (majority of volunteers), Chrome push
works immediately with no PWA requirement.

**Install:**
```bash
pnpm add web-push
pnpm add -D @types/web-push
```

**Confidence: HIGH** — W3C Web Push standard; `web-push` is the canonical npm package.

---

### 10. Background Jobs + Scheduled Tasks: Inngest

**Recommendation: Inngest over BullMQ, Trigger.dev**

| Option | Vercel-compatible | Free tier | Ops burden |
|--------|-------------------|-----------|------------|
| Inngest | Yes (native) | 50,000 runs/month | Zero |
| Trigger.dev | Yes (managed infra) | Limited | Low |
| BullMQ + Redis | No (needs persistent worker) | Redis cost ~$15-50/mo | Medium |
| Vercel Cron | Yes | 2 cron jobs free | Limited (no durable workflows) |

Inngest deploys as a Next.js route handler — no separate server. Functions are durable (survive
serverless timeouts). 50,000 free runs/month covers notification fan-out for Rajyash's scale many
times over.

**Use cases in this app:**
- Notification fan-out: when pickup status changes → send email + SMS + WhatsApp + push (each
  as a separate Inngest step so one failure doesn't block others)
- Scheduled reporting: daily/weekly impact stats aggregation
- Webhook retry logic for failed Razorpay webhook deliveries

**Install:**
```bash
pnpm add inngest
```

Register functions in `src/inngest/` and expose via `app/api/inngest/route.ts`.

**Confidence: HIGH** — Inngest pricing and Vercel integration verified on official docs.

---

### 11. File / Image Storage: Cloudflare R2

**Recommendation: Cloudflare R2 over Vercel Blob, Supabase Storage**

| Option | Free tier | Egress cost | NGO-fit |
|--------|-----------|-------------|---------|
| Cloudflare R2 | 10 GB storage, zero egress | $0 egress | Best |
| Supabase Storage | 1 GB, 5 GB egress | Paid after 5 GB | OK if using Supabase |
| Vercel Blob | Limited (quota varies by plan) | Paid | OK |
| AWS S3 | 5 GB/12 months (new accounts only) | $0.09/GB | Overkill |

Zero egress fee is decisive for an NGO. Food rescue photos (donor uploads, proof of delivery)
are frequently served. R2 is S3-compatible — use the `@aws-sdk/client-s3` with R2's endpoint.

**Install:**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Use presigned URLs for client-side direct uploads (volunteer uploads delivery photo from phone).
Store only the R2 public URL in the database.

**Confidence: HIGH** — Cloudflare R2 pricing verified on official docs.

---

### 12. i18n: next-intl

**Recommendation: next-intl over next-i18next, i18next**

next-intl was built specifically for Next.js App Router and React Server Components. It avoids
the hydration overhead that older i18n libraries carry. It uses ICU message format (pluralization,
gender, variables work out of the box).

**Locale plan:** `en` (default) + `gu` (Gujarati) + `hi` (Hindi). Gujarati and Hindi are standard
Unicode locales — any ICU-based library handles them; this is not a differentiator. The differentiator
is App Router compatibility and zero-config Server Component support.

**Install:**
```bash
pnpm add next-intl
```

**App Router setup:**
- `src/i18n/routing.ts` — defines `locales: ['en', 'gu', 'hi']`, `defaultLocale: 'en'`
- `src/i18n/request.ts` — `getRequestConfig` loads message JSON from `messages/{locale}.json`
- Middleware for locale detection and routing
- `[locale]` route group wraps all app routes

**Confidence: HIGH** — verified via Context7 `/amannn/next-intl` official docs.

---

## Full Stack at a Glance

| Layer | Choice | Version | Cost tier |
|-------|--------|---------|-----------|
| Framework | Next.js App Router | 15.x | Vercel free/hobby |
| Database | Neon (PostgreSQL) | Postgres 16 | Free (0.5 GB) |
| ORM | Drizzle ORM | 0.39.x | Free |
| Migrations | drizzle-kit | 0.31.x | Free |
| Auth | Clerk | latest | Free (10K MAU) |
| Payments | Razorpay | 2.9.x | % per transaction |
| Real-time | Pusher Channels | 8.x (server) / 8.x (client) | Free (200K/day) |
| Maps | Mapbox GL JS + react-map-gl | 3.x / 7.x | Free (50K loads/mo) |
| Email | Resend + React Email | 4.x / 0.0.x | Free (3K/mo) |
| SMS/WhatsApp | MSG91 | HTTP API | ~₹0.15-0.20/SMS |
| Web Push | web-push (VAPID) | 3.x | Free |
| Background jobs | Inngest | 3.x | Free (50K runs/mo) |
| File storage | Cloudflare R2 | S3-compat. | Free (10 GB) |
| i18n | next-intl | 3.x | Free |
| Forms | React Hook Form + Zod | 7.x / 3.x | Free |
| Server state | TanStack Query | 5.x | Free |
| UI state | Zustand | 5.x | Free |
| UI components | shadcn/ui + Radix + Tailwind | latest | Free |

**Estimated monthly cost at Rajyash v1 scale:**
- Infrastructure: ~$0 (all within free tiers)
- MSG91 SMS/WhatsApp: ~₹3,000–5,000/month (depends on rescue volume)
- Razorpay: 2% per successful transaction (no fixed cost)

---

## Installation — Core Additions (beyond shadcn/RHF/TanStack already set up)

```bash
# Database + ORM
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Auth
pnpm add @clerk/nextjs

# Payments
pnpm add razorpay

# Real-time
pnpm add pusher pusher-js

# Maps
pnpm add mapbox-gl react-map-gl
pnpm add -D @types/mapbox-gl

# Email
pnpm add resend react-email @react-email/components

# Web push
pnpm add web-push
pnpm add -D @types/web-push

# Background jobs
pnpm add inngest

# File storage (uses AWS SDK w/ R2 endpoint)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# i18n
pnpm add next-intl
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Postgres hosting | Neon | Supabase Postgres | Supabase bundles services we don't use; Neon's scale-to-zero + Vercel integration is cleaner |
| ORM | Drizzle | Prisma | ~220x larger bundle; Drizzle better for Neon's serverless HTTP driver |
| Auth | Clerk | Auth.js v5 | Auth.js requires custom phone OTP provider; Clerk has it built-in at zero extra cost |
| Auth | Clerk | Firebase Auth | Firebase requires GCP setup; Clerk is pure Next.js, simpler integration |
| Real-time | Pusher | Supabase Realtime | Already chose Neon over Supabase; mixing Supabase only for Realtime adds a dependency |
| Real-time | Pusher | Ably | Ably is better at scale; Pusher free tier is sufficient here; upgrade path exists |
| Maps | Mapbox | Google Maps | Google's 2025 pricing change removed the $200 credit; Mapbox free tier is more predictable |
| Email | Resend | SES | SES requires SES Identity + IAM + DNS setup; Resend is one API key |
| SMS | MSG91 | Twilio | Twilio India SMS is 3x more expensive; no DLT assistance |
| Jobs | Inngest | BullMQ | BullMQ needs a persistent Redis server; incompatible with Vercel serverless |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma on Vercel serverless | 1.6 MB bundle → slow cold starts; extra `prisma generate` step | Drizzle ORM |
| TypeORM | Unmaintained activity; no native serverless driver; decorator-heavy | Drizzle ORM |
| Auth.js/NextAuth for phone OTP | Phone OTP requires custom credential provider + SMS wiring + rate limiting — too much glue | Clerk |
| Supabase Auth | Ties you to Supabase's platform (and their free tier's pause-on-inactivity) when using Neon | Clerk |
| Self-hosted Socket.io | Needs a persistent Node.js server — incompatible with Vercel's serverless model | Pusher Channels |
| Postgres LISTEN/NOTIFY for real-time | Requires a persistent TCP connection — breaks on Vercel serverless | Pusher Channels |
| Twilio (India) | ₹0.63/SMS vs ₹0.15-0.20 with MSG91; limited DLT assistance | MSG91 |
| SendGrid | Free tier deprecated to 100/day (unreliable); complex API | Resend |
| BullMQ | Needs Redis + persistent worker process — not Vercel-compatible | Inngest |
| next-i18next | Pages Router library; App Router support added only in v16 (March 2026); ecosystem still catching up | next-intl |
| AWS S3 | Egress costs accumulate; IAM setup overhead | Cloudflare R2 |
| Vercel Blob | Paid egress; tighter free quota than R2 | Cloudflare R2 |

---

## India-Specific Notes

1. **DLT Registration is mandatory for SMS.** Register your entity on the TRAI DLT portal
   (trai.gov.in) and whitelist message templates before going live. MSG91 provides onboarding
   assistance. Timeline: 7–14 business days. Do this in Phase 1 infrastructure setup.

2. **WhatsApp Business API requires Facebook Business Manager verification.** Apply early —
   Meta's verification takes 1–5 business days but can stall. MSG91 acts as a BSP (Business
   Solution Provider) and manages the WABA setup.

3. **Razorpay KYC for NGO.** Razorpay requires NGO/trust registration docs (12A, 80G
   certificates). The foundation likely has these. Payout accounts need a verified bank account.
   Factor 3–5 business days for KYC during Phase 1.

4. **Phone number format.** India numbers are 10 digits, always stored with `+91` prefix in DB.
   Clerk handles this; validate with Zod: `z.string().regex(/^\+91[6-9]\d{9}$/)`.

5. **UPI as primary payment method.** Razorpay's checkout supports UPI natively — no extra config.
   Most Indian donors prefer UPI over card. Ensure the checkout renders the UPI option first.

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| drizzle-orm | ^0.39.x | @neondatabase/serverless ^0.10.x | Use `drizzle-orm/neon-http` import path |
| drizzle-kit | ^0.31.x | drizzle-orm ^0.39.x | Must match major version |
| @clerk/nextjs | ^6.x | Next.js 15 | v6 required for App Router + Next.js 15 compatibility |
| react-map-gl | ^7.x | mapbox-gl ^3.x | v7 drops legacy class API; uses hooks |
| next-intl | ^3.x | Next.js 15 | v3.x has full App Router + Server Components support |
| inngest | ^3.x | Next.js 15 | Route handler pattern (not legacy `/pages/api`) |
| pusher-js | ^8.x | Browser + React 18 | Use `usePusher` pattern via context or custom hook |

---

## Sources

- Drizzle ORM docs (Context7 `/drizzle-team/drizzle-orm`) — Neon HTTP driver, migrations
- Neon official docs (neon.com/docs) — serverless driver, free tier, branching
- Supabase vs Neon comparison (bytebase.com, designrevision.com) — free tier verified
- Clerk docs (clerk.com/docs) — App Router, phone OTP, pricing
- Razorpay docs (razorpay.com/docs) — Node.js SDK, webhooks, HMAC verification
- Pusher pricing (pusher.com/channels/pricing) — sandbox limits verified
- Mapbox pricing (mapbox.com/pricing) — 50K free map loads, 100K directions verified
- MSG91 India pricing (msg91.com/in/pricing) — SMS/WhatsApp rates
- Resend pricing (resend.com/pricing) — 3K free emails/month verified
- Inngest pricing (inngest.com/pricing) — 50K free runs/month verified
- Cloudflare R2 pricing (developers.cloudflare.com/r2/pricing) — 10 GB free, zero egress verified
- next-intl docs (Context7 `/amannn/next-intl`) — App Router setup, Server Components
- DLT mandate (smsgatewayhub.com/dlt-registration) — TRAI DLT requirement for India SMS

---

*Stack research for: Rajyash Foundation — Food Rescue web app*
*Researched: 2026-06-25*
