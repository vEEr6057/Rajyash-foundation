# Case Study — Food Porter

**A production dispatch platform for food rescue, built solo in 10 days on a ₹0 infrastructure budget.**

*Veer Shah · June–July 2026 · [github.com/veersh16](https://github.com/veersh16)*

## The problem

The Rajyash Foundation (Ahmedabad NGO, CSR arm of the Rajyash Group) rescues surplus food —
~200 meals/day since 2023 — coordinated manually over phone calls. They needed what Swiggy
has: post an order, dispatch a driver, track it live, confirm delivery. With an NGO's
budget: zero.

## What I built

An end-to-end web platform running the full rescue loop:

- **Donors** (restaurants, families, event halls) post surplus food in under a minute —
  photo, quantity, pickup window, location via map pin or a pasted Google Maps link.
- **Volunteers** claim pickups from a live board; **drivers** run multi-stop delivery
  runs; recipients' destinations managed by admins.
- **Live GPS tracking** of every active pickup, donor-visible, dispatch-platform style.
- **Admin dashboard** — pickups, runs, users, partners, reports, impact metrics.
- **Online donations** via Razorpay (UPI/cards) with 80G-numbered receipts.
- **Trilingual** (English, Gujarati, Hindi), light/dark, installable PWA with push
  notifications.

## The hard parts

**Dispatch correctness.** The same guarantees the big platforms need, implemented at
NGO scale: atomic claim (two volunteers can't win the same pickup — conditional
`UPDATE … WHERE status='requested'`), a server-enforced status state machine with a
full audit trail (who moved what, when), and idempotent side effects everywhere.

**Money.** Webhook-first payments: the client callback is cosmetic; the only writer of
a "paid" donation is an HMAC-verified (constant-time compare, WebCrypto) Razorpay
webhook whose dedup claim and mutation commit-or-rollback in one transaction — a
transient DB failure can't turn a retry into a lost payment, and out-of-order webhook
delivery can't downgrade a paid donation.

**₹0 infrastructure that behaves like paid infrastructure.** Next.js 15 on Cloudflare
Workers (free tier, commercial-allowed — chosen over Vercel whose free tier isn't),
Supabase Postgres + Drizzle with generated SQL migrations, Supabase Realtime for live
tracking, Leaflet + OpenStreetMap + OSRM for maps/routing/geocoding, Resend for email,
self-hosted web-push (VAPID via WebCrypto — no Node SDKs, everything Workers-runtime
compatible), Inngest for background jobs, Clerk for auth with defence-in-depth
(middleware RBAC + every server action re-checking session, role, and ownership).
Nightly encrypted `pg_dump` backups via GitHub Actions — because the free database tier
has none.

**Operational discipline.** PR-gated CI (typecheck, lint, tests, build), CI-only
deploys, branch protection, feature-flag kill switches (payments/notifications/intake
can each be disabled without a deploy), per-dependency health endpoint, uptime alerting,
an incident runbook with rollback and restore-drill procedures.

## By the numbers

| | |
|---|---|
| v1 build time | **10 days**, solo (first commit → production-ready) |
| Code | ~22,000 lines of TypeScript across 223 source files |
| Tests | 392 passing (Vitest + Testing Library) — behavior-focused, no filler |
| Delivery | 275 commits, 82 pull requests, every one CI-validated |
| Infra cost | **₹0/month** at launch |
| Languages | EN / ગુજરાતી / हिन्दी |

## Outcome & what's next

Adopted by the foundation's co-founders as the organization's official platform,
replacing rajyashfoundation.com — with ownership structured under the foundation
(accounts, secrets, signed attribution) so the NGO could operate it independently if it
ever had to. Development continues: the staged roadmap adds WhatsApp volunteer
coordination (Meta Cloud API), a public live impact dashboard, offline-first driver
flows, and a native Android driver app with background GPS.

*Stack: Next.js 15 · TypeScript · Cloudflare Workers (@opennextjs/cloudflare) · Supabase
Postgres · Drizzle ORM · Clerk · Razorpay · Supabase Realtime · Leaflet/OSM/OSRM ·
Resend · Inngest · web-push · next-intl · Tailwind v4 · shadcn/ui · TanStack Query ·
Zustand · Zod · Vitest · GitHub Actions.*
