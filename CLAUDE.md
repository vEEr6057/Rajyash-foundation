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

Locked design system, imported from claude.ai/design.
- [tokens/globals.css](tokens/globals.css) — **CANONICAL color/type tokens** (Tailwind v4 + shadcn, `.dark`, `@theme` mapped). Phase 1 → `src/app/globals.css`. ([tokens/tailwind.config.js](tokens/tailwind.config.js) = v3 fallback, [tokens/README.md](tokens/README.md) = notes.)
- **Motion:** [tokens/MOTION.md](tokens/MOTION.md) (spec) + [tokens/motion.css](tokens/motion.css) (tokens/keyframes/CSS interactions/reduced-motion — import AFTER globals.css) + [tokens/motion.ts](tokens/motion.ts) (Motion `motion/react` variants + `useCountUp`). Two budgets: app/portal frugal, public generous. Transform+opacity only.
- [docs/design/UI-SPEC.md](docs/design/UI-SPEC.md) — the binding contract (color, type, status pills, motion, components).
- [docs/design/rajyash-design-system.html](docs/design/rajyash-design-system.html) + [docs/design/rajyash-motion-system.html](docs/design/rajyash-motion-system.html) — full rendered references (visual oracles).
- Caveat: color tokens are raw hex → Tailwind opacity modifiers (`bg-primary/50`) need HSL conversion (decide in Phase 1).

Look: warm saffron `#C04E12` + leaf-green `#2E7D46` on cream `#FBF7F0`; Bricolage Grotesque (display) + Mukta/Noto (EN/GU/HI body); light + dark; restrained functional motion (`rj-live` pulse for tracking, `rj-shimmer` skeletons; `prefers-reduced-motion` honoured). Build every screen from these tokens — never invent colors/sizes.

## Rules (read before writing code)

Borrowed + adapted from the Quixera/`kaka` workspace, trimmed to our Next.js + Postgres stack:

- [.claude/rules/frontend-practices.md](.claude/rules/frontend-practices.md) — reuse-first, thin pages, feature modules, forms (RHF+Zod), service/mock parity, adapter+mapper layer, state split.
- [.claude/rules/testing-practices.md](.claude/rules/testing-practices.md) — test only what could really break; Vitest + Testing Library; what NOT to test.
- [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md) — branch naming, conventional commits, definition of done, and what kaka rules we deliberately dropped (RLS, Spring, microservices, Orval, Firebase).
- [.claude/rules/production-discipline.md](.claude/rules/production-discipline.md) — **binding once we serve rajyashfoundation.com**: data safety (backups, migrations-not-push, env split, no prod data on laptops), dispatch-correctness patterns (state machine, atomic claims, idempotency, ownership≠role), availability (health, kill switches, degrade-don't-die), change management (protected main, PR CI, CI-only deploys), vendor ownership + free-tier watchlist. End goal it serves: [docs/FOOD-PORTER-END-GOAL.md](docs/FOOD-PORTER-END-GOAL.md).

## Self-improving layer (lessons + auto-context)

Replica of the kaka system, made **project-local** (lives in git, shared with the team):

- **Lessons store** — `.claude/lessons/` (`INDEX.md` + topic folders). Capture only NON-obvious fixes that cost real debugging time; never restate conventions. Recall before correction-prone actions.
- **Lessons skill** — `food-rescue-lessons` (`.claude/skills/food-rescue-lessons/SKILL.md`) — the capture/recall engine.
- **Prompt-context hook** — `.claude/hooks/prompt-context.sh`, registered in `.claude/settings.json`. On keyword match it injects the relevant invariant(s) + matching lesson INDEX hits into context automatically.

Division of labour: **conventions/invariants** → `CLAUDE.md` + `.claude/rules/*` (injected by the hook). **Debugging gotchas** → `.claude/lessons/`. Don't duplicate one into the other.

## Contact (foundation)

rajyashfoundation@rajyashgroup.com · +91-9875041206 · Satellite, Ahmedabad 380015
