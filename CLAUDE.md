# CLAUDE.md

Project guidance for Claude Code in this repo.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Food Porter** (repo: Rajyash-Foundation; product renamed from "Food Rescue" — PR #88, EN/GU/HI)

An end-to-end web application for the Rajyash Foundation's food-rescue program. It connects
surplus-food donors (restaurants, families, event planners) with volunteers/drivers who pick up and deliver
that food to people in need across Ahmedabad, with live pickup→delivery tracking, an admin dashboard for
foundation staff, a public site for awareness and monetary donations, and a public user handbook at `/guide`.
It replaced the 2023 "Rajyash Food Porter" mobile app (not a dependency). Naming rule: the product/brand is
**"Food Porter"**; "rescue" survives only as the verb ("rescue the food") and program description.

**Core Value:** A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to
people in need — the rescue loop must work end to end. Everything else supports that loop.

### Constraints

- **Stack**: Next.js 15 App Router monolith + Supabase Postgres + Drizzle ORM. Clerk auth, Supabase Realtime
  (live tracking), Leaflet+OSM maps + free geocoding, Resend email, web-push, Inngest jobs, Razorpay payments,
  next-intl i18n (EN/GU/HI), shadcn/Tailwind, RHF+Zod, TanStack Query + Zustand.
- **Hosting**: Cloudflare Workers (free, commercial-allowed) via `@opennextjs/cloudflare`; Cloudflare
  Cron Triggers for scheduled jobs. Production domain: **rajyashfoundation.com** (foundation-owned at
  GoDaddy; cutover in progress). Deploys only from CI (`deploy.yml` off `main`) — never from a laptop.
- **Budget**: ZERO — free tiers only. Deferred paid items: SMS/WhatsApp notifications (Stage 2),
  Supabase Pro (Stage 3) — stages defined in [docs/FOOD-PORTER-END-GOAL.md](docs/FOOD-PORTER-END-GOAL.md).
  Razorpay takes 2% per donation (no upfront cost); NGO KYC must be under the foundation's own PAN/bank.
- **Security**: payments verified server-side (webhook HMAC, never trust client callback); every server action
  re-checks session + role + ownership (no IDOR); validate env at boot.
- **Real-time**: live pickup tracking is a v1 core requirement.
- **Single-tenant**: one org, one city — no cross-tenant isolation logic. NOT "no RLS": Supabase
  RLS IS used and load-bearing — it is the only thing gating the public anon key (shipped in the
  client bundle) from every table. RLS on all tables; `authenticated`-scoped SELECT policies on the
  browser-read ping tables; default-deny elsewhere (server uses the service-role key). The RLS
  layer must live in a committed migration (see `.claude/rules/production-discipline.md` §6).
<!-- GSD:project-end -->

## Current status (2026-07) — production-cutover era

The platform is **built and audited** (deep review 2026-07-05: production-grade — atomic claims,
status-event audit, webhook idempotency, IDOR discipline all verified). Co-founders approved
(2026-07-05) launching on **rajyashfoundation.com**, replacing the old WordPress site (which is
compromised — redirecting visitors to scam sites; cleanup in [docs/OWNER-TASKS.md](docs/OWNER-TASKS.md) §F).

Current work is **cutover + ownership handover**, not feature building:
- [docs/production-cutover.md](docs/production-cutover.md) — service inventory (what runs on whose
  account), step-by-step handover plan. Truth for "what exists today".
- [docs/OWNER-TASKS.md](docs/OWNER-TASKS.md) — the foundation's to-do list.
- [docs/RAZORPAY-KYC.md](docs/RAZORPAY-KYC.md) — NGO KYC track (in progress; blocks live payments).
- [docs/runbook.md](docs/runbook.md) — deploy/rollback/incident/smoke/restore procedures.
- Not yet live: Resend still on sandbox sender (real email needs domain verification), Razorpay in
  test mode, Clerk on dev instance — all unblock during cutover.

## Planning (GSD)

This project is managed with GSD. Canonical planning docs live in `.planning/`:
- `.planning/PROJECT.md` — full context, Key Decisions
- `.planning/REQUIREMENTS.md` — 44 v1 requirements + traceability
- `.planning/ROADMAP.md` — v1 (Phases 1–7, **shipped**) + v2.0 "Dispatch Bridge" (Phases 8–12)
- `.planning/research/` — stack/features/architecture/pitfalls + SUMMARY (note: SUMMARY's host/notif choices were later overridden by PROJECT.md Key Decisions — Cloudflare + free channels win)

Caveat: substantial post-v1 work (dispatch, app-wide UI retheme, guide) landed via batch specs
([docs/design/BATCH-1..5](docs/design/)) and direct PRs **outside** the GSD phase flow, so
`.planning/STATE.md` lags reality — trust [docs/production-cutover.md](docs/production-cutover.md) §2
and `git log` for what's actually live before trusting GSD state.

## Design system (read before building any UI)

One brand, two dialects: **green + gold on warm paper, Roboto Slab display**. The saffron/Bricolage
era is retired — do not style from pre-charter docs.

- [docs/design/APP-UI-CHARTER.md](docs/design/APP-UI-CHARTER.md) — **CANONICAL + LOCKED** for every
  screen except `/` (`/portal/*`, `/admin/*`, `/sign-in`, `/staff`, `/onboarding`, shared chrome).
  Laws: paper grounds (`#FAF7F1`); Roboto Slab display at 500/600 (never above 600; Bricolage retired);
  **gold as ink, never fill** (`--gold-ink` for eyebrows/section numbers/focus rings — no gold buttons
  or backgrounds); hairlines over boxes (one elevation level per screen max); **solid green fill =
  interactive only** (buttons, active nav) — state green is always the soft pill, never solid; numbers
  carry provenance (tabular numerals + source/recency); `LeafMark` is the brand glyph; app motion
  frugal (≤200ms, transform+opacity, only `rj-live` pulse + skeleton shimmer loop).
- [docs/design/HOMEPAGE-SPEC.md](docs/design/HOMEPAGE-SPEC.md) (+ HOMEPAGE-STANDARDS.md) — governs `/`
  (editorial voice, generous motion budget). Per-screen batch delta-specs: `docs/design/BATCH-*.md`.
- **Live tokens: [src/app/globals.css](src/app/globals.css)** (`@theme`/`:root`, light + dark). Indic
  display fallbacks: `:lang(gu)` → Baloo Bhai 2, `:lang(hi)` → Baloo 2, at `0.92em` optical correction.
- Motion budgets: [tokens/MOTION.md](tokens/MOTION.md) still binds — app/portal frugal, public generous,
  transform+opacity only, `prefers-reduced-motion` honoured.
- **Historical — do NOT take colors/type from these:** `tokens/globals.css` +
  `docs/design/rajyash-design-system.html` (saffron era), [docs/design/UI-SPEC.md](docs/design/UI-SPEC.md)
  color/type sections (its status-pill tokens remain valid — charter kept them unchanged).

Build every screen from the live tokens/semantic classes — never invent colors/sizes.

## Rules (read before writing code)

Borrowed + adapted from the Quixera/`kaka` workspace, trimmed to our Next.js + Postgres stack:

- [.claude/rules/frontend-practices.md](.claude/rules/frontend-practices.md) — reuse-first, thin pages, feature modules, forms (RHF+Zod), service/mock parity, adapter+mapper layer, state split.
- [.claude/rules/testing-practices.md](.claude/rules/testing-practices.md) — test only what could really break; Vitest + Testing Library; what NOT to test.
- [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md) — branch naming, conventional commits, definition of done, and what kaka rules we deliberately dropped (RLS, Spring, microservices, Orval, Firebase).
- [.claude/rules/production-discipline.md](.claude/rules/production-discipline.md) — **binding NOW** (cutover approved; `main` already protected, CI-only deploys already live): data safety (backups, migrations-not-push, env split, no prod data on laptops), dispatch-correctness patterns (state machine, atomic claims, idempotency, ownership≠role), availability (health, kill switches, degrade-don't-die), change management (protected main, PR CI, CI-only deploys), vendor ownership + free-tier watchlist. End goal it serves: [docs/FOOD-PORTER-END-GOAL.md](docs/FOOD-PORTER-END-GOAL.md).

## Self-improving layer (lessons + auto-context)

Replica of the kaka system, made **project-local** (lives in git, shared with the team):

- **Lessons store** — `.claude/lessons/` (`INDEX.md` + topic folders). Capture only NON-obvious fixes that cost real debugging time; never restate conventions. Recall before correction-prone actions.
- **Lessons skill** — `food-rescue-lessons` (`.claude/skills/food-rescue-lessons/SKILL.md`) — the capture/recall engine.
- **Prompt-context hook** — `.claude/hooks/prompt-context.sh`, registered in `.claude/settings.json`. On keyword match it injects the relevant invariant(s) + matching lesson INDEX hits into context automatically.

Division of labour: **conventions/invariants** → `CLAUDE.md` + `.claude/rules/*` (injected by the hook). **Debugging gotchas** → `.claude/lessons/`. Don't duplicate one into the other.

## Project skills — AUTO-APPLY (no user prompt needed)

These three run **automatically when their trigger fires** — the user does not have to ask.
The prompt-context hook also injects reminders on keyword match; absence of a reminder is not
permission to skip.

| Skill | Fires automatically when |
|---|---|
| `security-review-pass` (`.claude/skills/security-review-pass/`) | before any launch/cutover milestone or enabling live payments; after ANY change touching auth, RLS/policies, payments/webhooks, `src/middleware.ts`, or a new public route |
| `post-deploy-smoke` (`.claude/skills/post-deploy-smoke/`) | after every production deploy or `wrangler rollback`; after re-enabling a kill switch |
| `i18n-parity` (`.claude/skills/i18n-parity/`) | before claiming done on any change touching `src/i18n/messages/` or user-facing strings — run `node .claude/skills/i18n-parity/check.mjs` |

If a trigger fired and the skill was not run, the task is NOT done — say so rather than
reporting complete.

## Contact (foundation)

rajyashfoundation@rajyashgroup.com · +91-9875041206 · Satellite, Ahmedabad 380015
