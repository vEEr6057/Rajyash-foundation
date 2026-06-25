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

- **Tech stack**: Next.js + PostgreSQL — chosen; full-stack in one app (no microservices).
- **Hosting/budget**: NGO — low-cost managed (Vercel + managed Postgres e.g. Neon/Supabase, free/low tiers). Keep ops light.
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
