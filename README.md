# Rajyash Food Rescue

An end-to-end web app for the **Rajyash Foundation**'s food-rescue program in Ahmedabad. It connects
surplus-food donors (restaurants, families, event planners) with volunteers and rickshaw drivers who pick up
and deliver that food to people in need — with live tracking, a coordinator dispatch console, an admin
analytics dashboard, and a public awareness site.

**Live:** https://rajyash-food-rescue.shahveerkeaten.workers.dev

> Core loop: a donor (or coordinator) posts surplus → a coordinator builds a multi-stop run and assigns a
> driver → the driver works the stops with live GPS + navigate → food is delivered (proof optional) → impact
> is aggregated in reports. Single-org, single-city, zero-budget (free tiers only).

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 15 (App Router, RSC + Server Actions) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` (free `*.workers.dev`) |
| DB / ORM | Supabase Postgres + Drizzle |
| Auth | Clerk (email + phone OTP; roles in `publicMetadata`) |
| Realtime | Supabase Realtime (live pickup/run tracking) |
| Maps | Leaflet + OpenStreetMap, Nominatim geocode, OSRM/haversine ETA, Google Maps deep-link navigate (no paid Maps API) |
| Jobs | Inngest (notification fan-out, cron) |
| Email | Resend |
| UI | shadcn/ui + Radix + Tailwind v4, Recharts (analytics), Sonner (toasts) |
| Forms | React Hook Form + Zod |
| i18n | next-intl — English (authoritative) + Gujarati + Hindi |
| Tests | Vitest + Testing Library (jsdom) |

## Roles

- **Donor** — post surplus, track delivery, see their pickups.
- **Volunteer** — browse the open board (list/map), claim, deliver, optional proof photo.
- **Driver** — work the assigned multi-stop run with live GPS + per-stop navigate.
- **Admin / coordinator** — analytics overview, pickups, dispatch runs, partners, destinations, users, reports.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill Clerk, Supabase, Resend, Inngest keys
pnpm dev                     # http://localhost:3000
```

Env is validated at boot (`src/config/env.ts`, t3-env + Zod) — the app refuses to start on a missing/invalid var.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Local dev server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:run` | Run the Vitest suite once |
| `pnpm db:generate` | Generate a Drizzle migration from schema |
| `pnpm deploy` | Build + deploy to Cloudflare (CI does this on merge to `main`) |

> **Build note:** the OpenNext/Cloudflare build must run on Linux (a Windows esbuild bug breaks it). Locally use
> `pnpm typecheck && pnpm lint && pnpm test:run`; the production build + deploy happen in GitHub Actions on merge.

## Project layout

```
src/
  app/                 # routes: (public) landing, sign-in/up, onboarding, portal/*, admin/*
  components/ui/       # shadcn/Radix primitives (button, table, dialog, sheet, select, chart deps…)
  features/<name>/     # feature modules: components, hooks, services, actions, validations
    admin/  pickups/  runs/  notifications/  auth/  public/  portal/
  server/
    auth/              # Clerk session + requireRole guards (AUTH-05 defence-in-depth)
    db/                # Drizzle schema, pooled client, repositories, migrations
    inngest/ notifications/ storage/
  i18n/messages/       # en / gu / hi catalogs (catalog-parity test enforces key parity)
  config/              # env, constants (routes, roles, statuses, query keys)
.planning/             # GSD planning docs (PROJECT, REQUIREMENTS, ROADMAP, phases/)
docs/design/           # design system, UI-SPEC, UI-AUDIT, UI-SOLUTIONS
```

## Conventions

- **Reuse-first + thin pages** — see `.claude/rules/frontend-practices.md`.
- **Server actions** return a `Result<T>` union; every action re-checks session + role (never trusts middleware alone).
- **Tokens, not hex** — colors/spacing from `globals.css` (`@theme`), light + dark. Brand = leaf-green + gold on cream.
- **Tests** — only meaningful behavior (schemas, mappers, hooks, decision components); see `.claude/rules/testing-practices.md`.
- **Conventional commits**, stacked PRs to `main`, CI builds + deploys on merge.

## Status

v1 (rescue loop) + v2 "Dispatch Bridge" are **live**. Payments (Razorpay) are parked pending NGO KYC.
See `.planning/ROADMAP.md` for phase history and `docs/design/UI-AUDIT.md` for the current UI audit.
