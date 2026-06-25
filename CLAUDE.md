# CLAUDE.md

Project guidance for Claude Code in this repo.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Rajyash Food Rescue**

An end-to-end web application for the Rajyash Foundation's food-rescue program (Food Porter). It connects
surplus-food donors (restaurants, families, event planners) with volunteers/drivers who pick up and deliver
that food to people in need across Ahmedabad, with live pickup→delivery tracking, an admin dashboard for
foundation staff, and a public site for awareness and monetary donations. It is a fresh-start replacement —
the existing 2023 "Rajyash Food Porter" mobile app is not a dependency.

**Core Value:** A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to
people in need — the rescue loop must work end to end. Everything else supports that loop.

### Constraints

- **Stack**: Next.js 15 App Router monolith + Supabase Postgres + Drizzle ORM. Clerk auth, Supabase Realtime
  (live tracking), Leaflet+OSM maps + free geocoding, Resend email, web-push, Inngest jobs, Razorpay payments,
  next-intl i18n (EN/GU/HI), shadcn/Tailwind, RHF+Zod, TanStack Query + Zustand.
- **Hosting**: Cloudflare Pages/Workers (free, commercial-allowed) via `@opennextjs/cloudflare`; Cloudflare
  Cron Triggers for scheduled jobs; free `*.pages.dev` subdomain.
- **Budget**: ZERO — free tiers only. Deferred paid items: SMS/WhatsApp notifications + real domain (when funded).
  Razorpay takes 2% per donation (no upfront cost).
- **Security**: payments verified server-side (webhook HMAC, never trust client callback); every server action
  re-checks session + role + ownership (no IDOR); validate env at boot.
- **Real-time**: live pickup tracking is a v1 core requirement.
- **Single-tenant**: one org, one city — deliberately no multi-tenancy/RLS.
<!-- GSD:project-end -->

## Planning (GSD)

This project is managed with GSD. Canonical planning docs live in `.planning/`:
- `.planning/PROJECT.md` — full context, Key Decisions
- `.planning/REQUIREMENTS.md` — 44 v1 requirements + traceability
- `.planning/ROADMAP.md` — 7 phases
- `.planning/research/` — stack/features/architecture/pitfalls + SUMMARY (note: SUMMARY's host/notif choices were later overridden by PROJECT.md Key Decisions — Cloudflare + free channels win)

Next step: `/gsd-plan-phase 1`. **Razorpay NGO KYC** is a parallel-track blocker — start early, must clear before Phase 5.

## Design system (read before building any UI)

Locked design system, imported from claude.ai/design. Source of truth in `docs/design/`:
- [docs/design/UI-SPEC.md](docs/design/UI-SPEC.md) — the binding contract (color, type, status pills, motion, components).
- [docs/design/design-tokens.css](docs/design/design-tokens.css) — production tokens; Phase 1 drops into `globals.css` + Tailwind `@theme` bridge.
- [docs/design/rajyash-design-system.html](docs/design/rajyash-design-system.html) — full rendered reference (the visual oracle).

Look: warm saffron `#C04E12` + leaf-green `#2E7D46` on cream `#FBF7F0`; Bricolage Grotesque (display) + Mukta/Noto (EN/GU/HI body); light + dark; restrained functional motion (`rj-live` pulse for tracking, `rj-shimmer` skeletons; `prefers-reduced-motion` honoured). Build every screen from these tokens — never invent colors/sizes.

## Rules (read before writing code)

Borrowed + adapted from the Quixera/`kaka` workspace, trimmed to our Next.js + Postgres stack:

- [.claude/rules/frontend-practices.md](.claude/rules/frontend-practices.md) — reuse-first, thin pages, feature modules, forms (RHF+Zod), service/mock parity, adapter+mapper layer, state split.
- [.claude/rules/testing-practices.md](.claude/rules/testing-practices.md) — test only what could really break; Vitest + Testing Library; what NOT to test.
- [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md) — branch naming, conventional commits, definition of done, and what kaka rules we deliberately dropped (RLS, Spring, microservices, Orval, Firebase).

## Self-improving layer (lessons + auto-context)

Replica of the kaka system, made **project-local** (lives in git, shared with the team):

- **Lessons store** — `.claude/lessons/` (`INDEX.md` + topic folders). Capture only NON-obvious fixes that cost real debugging time; never restate conventions. Recall before correction-prone actions.
- **Lessons skill** — `food-rescue-lessons` (`.claude/skills/food-rescue-lessons/SKILL.md`) — the capture/recall engine.
- **Prompt-context hook** — `.claude/hooks/prompt-context.sh`, registered in `.claude/settings.json`. On keyword match it injects the relevant invariant(s) + matching lesson INDEX hits into context automatically.

Division of labour: **conventions/invariants** → `CLAUDE.md` + `.claude/rules/*` (injected by the hook). **Debugging gotchas** → `.claude/lessons/`. Don't duplicate one into the other.

## Contact (foundation)

rajyashfoundation@rajyashgroup.com · +91-9875041206 · Satellite, Ahmedabad 380015
