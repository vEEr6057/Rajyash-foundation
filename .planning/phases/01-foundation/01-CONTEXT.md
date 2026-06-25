# Phase 1: Foundation - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the project foundation: a runnable Next.js 15 (App Router) app on Cloudflare,
with Clerk auth (email + phone OTP, rate-limited), role-based access control for
donor/volunteer/admin (wrong-role routes → 403), server-action authorization, a validated
Drizzle/Supabase schema, env-boot validation, the design system + motion wired in, and a
green Cloudflare deploy pipeline. Razorpay NGO KYC is submitted as an external parallel track.

Requirements: AUTH-01..06. This phase builds the shell + auth + DB foundation only — no
donor/volunteer/pickup features (those are Phase 2+).
</domain>

<decisions>
## Implementation Decisions

### Role assignment & RBAC
- **D-01:** Roles are `donor`, `volunteer`, `admin`. User picks **donor or volunteer at onboarding** (not at signup). **Admin is assigned manually** (Clerk `publicMetadata`, seeded/elevated by an existing admin) — never self-selectable.
- **D-02:** Role lives in Clerk user metadata (e.g. `publicMetadata.role`); middleware reads it for route protection, and **every server action independently re-checks session + role + resource ownership** (AUTH-05 — middleware alone is never trusted).
- **D-03:** Route groups gate access: `(public)` open, `(portal)` requires auth + onboarding-complete, `(admin)` requires `role=admin`. Wrong-role access returns 403.

### Auth UI
- **D-04:** Use **Clerk's prebuilt components** (`<SignIn/>`, `<SignUp/>`, OTP flows) themed via Clerk's `appearance` API to our saffron design tokens — not fully custom forms. Rationale: robust OTP/rate-limit/error handling out of the box, zero-budget speed; revisit custom forms later if theming falls short. Auth screens must still visually match the design system.

### Onboarding
- **D-05:** After first signup, a **one-step onboarding**: role-select (donor/volunteer) + minimal profile (name; city defaults to Ahmedabad; phone if not already from OTP). Persist an **onboarding-complete flag** (Clerk metadata); the `(portal)` is gated behind it — incomplete users are redirected to onboarding.

### Env & boot
- **D-06:** Validate all required env vars at boot via Zod (`src/config/env.ts`); the app **refuses to start** on any missing/malformed var (AUTH-06 / our env-validation convention).

### Claude's Discretion
- **Postgres-from-Workers driver/pooler** — user deferred to the **phase researcher**. Decide between Cloudflare Hyperdrive vs Supabase pooler (port 6543, PgBouncer transaction mode) + serverless driver. Default lean: Supabase pooler now, Hyperdrive only if latency/connection limits bite. Migrations use the direct connection (port 5432), not the pooler.
- Project scaffold specifics (create-next-app flags, src/ layout reconciling App Router route groups with `src/features/<name>/`), shadcn init, fonts via `next/font` vs `<link>`, hex→HSL token conversion for opacity modifiers — all Claude/planner discretion, follow `.claude/rules/` + `docs/design/UI-SPEC.md`.
- Cloudflare deploy via `@opennextjs/cloudflare`; cron via Cloudflare Cron Triggers (not needed until later phases).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & scope
- `.planning/PROJECT.md` — project context, Key Decisions (zero-budget, Cloudflare, free notif channels, single-tenant).
- `.planning/REQUIREMENTS.md` — AUTH-01..06 are this phase's requirements.
- `.planning/ROADMAP.md` §"Phase 1: Foundation" — goal + 5 success criteria.
- `.planning/research/SUMMARY.md` — resolved stack + Phase-1 implications + the Postgres-from-Workers research flag.

### Conventions (binding)
- `.claude/rules/frontend-practices.md` — feature-module layout, thin pages, RHF+Zod, service/mock parity, adapter/mapper, state split, env validation.
- `.claude/rules/testing-practices.md` — behavior-only tests; what not to test.
- `.claude/rules/git-workflow.md` — branch naming, conventional commits, done-criteria.

### Design system (binding for any UI — auth screens, app shell, onboarding)
- `docs/design/UI-SPEC.md` — design contract.
- `tokens/globals.css` — canonical color/type tokens (drop into `src/app/globals.css`; Clerk `appearance` themes to these). Caveat: raw hex → opacity modifiers need HSL.
- `tokens/motion.css` + `tokens/motion.ts` + `tokens/MOTION.md` — motion (wire `.rj-route-shell` on `app/template.tsx`).
- `docs/design/rajyash-design-system.html`, `docs/design/rajyash-motion-system.html` — visual oracles.

### Self-improving layer
- `.claude/lessons/INDEX.md` — recall before correction-prone work; capture non-obvious fixes.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tokens/` — design tokens (color/type/motion) ready to wire; not yet imported into an app.
- `.claude/rules/*` + `.claude/skills/food-rescue-lessons` + `.claude/hooks/prompt-context.sh` — conventions + lessons + auto-context already in place.

### Established Patterns
- No application code yet (greenfield). Phase 1 establishes the scaffold patterns every later phase follows: route groups `(public)/(portal)/(admin)`, `src/features/<name>/`, `src/server/` (DB client + repositories, server-only), service+mock+adapter, server actions for mutations.

### Integration Points
- Clerk ↔ Next middleware ↔ server actions (auth/role). Drizzle ↔ Supabase (pooled). Design tokens ↔ Tailwind `@theme` ↔ shadcn ↔ Clerk `appearance`.
</code_context>

<specifics>
## Specific Ideas

- Auth screens, onboarding, and app shell must visually match the saffron+leaf design system (the user is design-led — design system was custom-built in claude.ai/design).
- Field users are on mid-range Android / patchy 3G → mobile-first, the motion "app budget" (frugal) applies to portal/auth, not the public "generous" budget.
</specifics>

<deferred>
## Deferred Ideas

- SMS/WhatsApp notifications (NOT-06/07) and DLT registration — v2/when-funded, not Phase 1.
- Public marketing site, i18n translations (GU/HI), PWA — Phase 7.
- Razorpay payment integration — Phase 5 (only the **KYC submission** is a Phase-1 parallel external track, no code).
- Foundation-supplied inputs (logo, real content, translations, legal/FSSAI, privacy policy) — tracked outside the build; chase in parallel.

None of these are in Phase 1 scope.
</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-25*
