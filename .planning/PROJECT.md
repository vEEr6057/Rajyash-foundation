# Rajyash Food Rescue

## What This Is

An end-to-end web application for the Rajyash Foundation's food-rescue program (Food Porter). It connects
surplus-food donors (restaurants, families, event planners) with volunteers/drivers who pick up and deliver
that food to people in need across Ahmedabad, with live pickup→delivery tracking, an admin dashboard for
foundation staff, and a public site for awareness and monetary donations. It is a fresh-start replacement —
the existing 2023 "Rajyash Food Porter" mobile app is not a dependency.

## Core Value

A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to people in need —
the rescue loop must work end to end. Everything else supports that loop.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public visitors can learn about the program and its impact
- [ ] Visitors can donate money online (Razorpay/UPI), verified server-side
- [ ] Users can sign up / sign in via email + phone OTP, with role-based access
- [ ] Food donors can create a pickup request (food type, quantity, location, time window)
- [ ] Volunteers/drivers can browse and claim available pickups
- [ ] Volunteers/drivers can progress a pickup through statuses (requested → accepted → picked up → delivered)
- [ ] Live tracking of an in-progress pickup on a map for relevant parties
- [ ] Notifications on status changes across in-app, email, SMS/WhatsApp, and push
- [ ] Admin/foundation staff can manage pickups, users, partners, and view reporting
- [ ] Public impact dashboard (meals served, food rescued)

### Out of Scope

- Native iOS/Android apps — web-first (responsive); the old native app is being left behind. Revisit post-v1.
- Recipient self-service accounts — recipients are served via volunteers/admin, not self-registering users.
- Multi-city / multi-org tenancy — single org (Rajyash), single city (Ahmedabad) for v1. No RLS/multi-tenant layer.
- Animal rescue / plantation / education / Anand Mela programs — this app is Food Porter only.
- Migrating data from the old Food Porter app — fresh start.

## Context

- **Org:** Rajyash Foundation, Ahmedabad NGO, CSR arm of Rajyash Group (real estate). Food Porter started 2023,
  feeds ~200 people/day. (Full org research in Claude memory + earlier session report.)
- **Existing app:** "Rajyash Food Porter" (For Achiever Inc, iOS/Android, last updated 2023-07). Ignored — fresh build.
- **Conventions already established** (borrowed/adapted from the kaka/Quixera workspace, in `.claude/rules/`):
  feature-module layout, RHF+Zod forms, service/mock parity + adapter/mapper layer, TanStack Query (server) +
  Zustand (UI) state split, behavior-only testing, conventional commits + branch naming.
- **Self-improving layer** in `.claude/` (lessons store + `food-rescue-lessons` skill + prompt-context hook).
- **Geography/users:** Ahmedabad. India context → phone OTP and SMS/WhatsApp matter; likely EN + Gujarati/Hindi i18n.

## Constraints

- **Tech stack**: Next.js 15 App Router monolith + Supabase Postgres + Drizzle ORM. Clerk auth, Supabase Realtime tracking, Leaflet+OSM maps, Resend email, web-push, Inngest jobs, Razorpay payments, next-intl i18n, shadcn/Tailwind, RHF+Zod, TanStack Query + Zustand.
- **Budget**: ZERO — foundation gives no funds. Free tiers only. Only deferred paid items: SMS/WhatsApp notifications (when funded), real domain (when funded). Razorpay takes 2% per donation (no upfront cost).
- **Hosting**: Cloudflare Pages/Workers (free, commercial-allowed) via @opennextjs/cloudflare; Cloudflare Cron Triggers for scheduled jobs. Free `*.pages.dev` subdomain.
- **Security**: payments verified server-side (webhook/signature, never trust client callback); authorize on
  server-side role, never a client-sent role; validate env at boot.
- **Real-time**: live pickup tracking is a v1 core requirement, not a later add-on.
- **Single-tenant**: one organization — deliberately no multi-tenancy/RLS complexity.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh-start web app, ignore old mobile app | Old app stale (2023), no source access, web-first reaches all roles | — Pending |
| Next.js + PostgreSQL monolith | One stack for public site + portal + API; low ops for an NGO | — Pending |
| Email + phone OTP auth | Phone OTP fits India; email/password for staff | — Pending |
| Online money donations in v1 (Razorpay/UPI) | Foundation needs funds; payment is a primary public CTA | — Pending |
| Live tracking in v1 (not deferred) | Central to the donor/volunteer experience and trust | — Pending |
| Low-cost managed hosting (Vercel + Neon/Supabase) | NGO budget; minimal DevOps | — Pending |
| Single-tenant, no RLS | One org, one city — multi-tenancy is needless complexity | — Pending |
| Borrow kaka frontend conventions, drop backend/infra rules | ~90% of React patterns transfer; Spring/RLS/microservices don't | ✓ Good |
| Zero budget — free tiers only | Foundation provides no funds; we self-fund nothing | — Pending |
| Host on Cloudflare Pages/Workers (not Vercel) | Vercel Hobby bans commercial use; Cloudflare free allows it, no surprise bills; Next.js via @opennextjs/cloudflare | — Pending |
| Supabase Postgres + Drizzle + Supabase Realtime | Free tier covers DB + live tracking + storage; Realtime dodges serverless WebSocket limit | — Pending |
| Clerk auth (free 10K MAU) | Phone OTP first-class; Clerk absorbs auth-OTP SMS cost (no DLT needed) | — Pending |
| v1 notifications = email + web push + in-app only | SMS (MSG91) and WhatsApp (Meta, ~₹0.13/msg since Jul 2025) are not free; dispatcher built channel-abstracted so they slot in when funded | — Pending |
| Maps = Leaflet + OSM (display) + free geocoding | Zero billing risk for an NGO; Google Maps billing blowup avoided | — Pending |
| Free `*.pages.dev` subdomain for v1 | No domain spend; buy real domain when funded | — Pending |
| Private repo on developer's personal GitHub | No org cost; transfer to foundation later | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-25 after initialization*
