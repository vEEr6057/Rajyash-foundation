---
phase: "07"
plan: "02"
subsystem: public-site
tags: [landing-page, pwa, impact-counter, volunteer-signup, i18n, cached-data, theme-toggle, scroll-reveal, motion]
dependency_graph:
  requires:
    - "07-01"  # next-intl scaffold, LanguageSwitcher, i18n messages
    - "01"     # Clerk sign-up + onboarding, design tokens
    - "06"     # pickupsRepo.impactReport
  provides:
    - public-landing-page      # src/app/(public)/page.tsx + feature components
    - cached-impact-report     # src/server/db/repositories/impact.ts
    - pwa-manifest             # src/app/manifest.ts
    - volunteer-prefill        # defaultRole prop in OnboardingForm
    - theme-toggle             # next-themes ThemeProvider + ThemeToggle (light/dark via .dark)
    - scroll-reveal            # RevealOnScroll component (IntersectionObserver fade+slide)
  affects:
    - "07-03"  # portal i18n — needs to know global header was removed; ThemeProvider now app-wide
tech_stack:
  added:
    - "next-themes@0.4.6 — class-strategy light/dark toggle driving <html class=dark>"
  patterns:
    - unstable_cache wrapping a repository function for public aggregate data
    - Route group (public) for layout isolation without URL change
    - Server Component async sub-functions for inline sections
    - useCountUp from @tokens/motion for animated counter (client island in server page)
    - next-themes ThemeProvider (attribute=class) mapping to globals.css .dark @custom-variant
    - Client RevealOnScroll wrapping server-rendered children (RSC children pattern) for scroll motion
key_files:
  created:
    - src/server/db/repositories/impact.ts
    - src/server/db/repositories/impact.test.ts
    - src/app/manifest.ts
    - src/app/manifest.test.ts
    - src/app/(public)/page.tsx
    - src/features/public/components/LandingPage.tsx
    - src/features/public/components/ImpactCounter.tsx
    - src/features/public/components/HowItWorks.tsx
    - src/features/public/components/PublicHeader.tsx
    - src/features/public/components/PublicFooter.tsx
    - src/features/public/components/ThemeToggle.tsx
    - src/features/public/components/RevealOnScroll.tsx
  modified:
    - src/app/layout.tsx               # removed global header
    - src/app/providers.tsx            # added next-themes ThemeProvider
    - src/app/onboarding/page.tsx      # added searchParams.role
    - src/features/auth/components/OnboardingForm.tsx  # added defaultRole prop
    - src/features/public/index.ts     # added new component exports
  deleted:
    - src/app/page.tsx                 # replaced by (public)/page.tsx
decisions:
  - "Landing i18n keys: used actual flat keys from en/landing.json (heroTitle, statMeals, etc.) rather than the nested shape shown in plan interfaces (hero.headline, counter.servings) — the actual file created in 07-01 uses flat keys"
  - "Global header in root layout removed as specified; PublicHeader in public page handles nav + LanguageSwitcher + ThemeToggle for the landing"
  - "FinalCtaSection inline styles use var(--color-primary) not hardcoded hex per CLAUDE.md"
  - "ImpactCounter refs typed as RefObject<HTMLElement> to satisfy @tokens/motion useCountUp signature"
  - "Theme: used next-themes + our .dark class (NOT the design's [data-theme]/localStorage) per task brief — next-themes handles SSR no-flash + persistence; globals.css already maps .dark via @custom-variant"
  - "RevealOnScroll uses a callback ref (not RefObject) so one component supports div/section/li element semantics without a union-type ref error"
metrics:
  duration: "~55 minutes (incl. theme toggle + scroll-reveal follow-up)"
  completed: "2026-06-27"
  tasks_completed: 2
  follow_up_features: 2
  files_count: 18
---

# Phase 7 Plan 02: Public Landing Page Scaffold Summary

**One-liner:** Full public landing page (hero + impact counter + 3-step how-it-works + two-ways-to-help + about + footer) with cached DB aggregate counter via `unstable_cache`, volunteer CTA pre-filling `defaultRole=volunteer` in onboarding, and Next.js PWA manifest at `/manifest.webmanifest`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Cached impact repository + manifest route handler | c954398 | impact.ts, impact.test.ts, manifest.ts, manifest.test.ts |
| 2 | Public landing page scaffold + volunteer signup wiring | 63dd6a8 | 10 files — see key_files |
| fix | Remove hardcoded hex from FinalCtaSection | 0c5193a | LandingPage.tsx |
| follow-up A | In-page theme toggle (next-themes, class strategy) | a11e541 | providers.tsx, ThemeToggle.tsx, PublicHeader.tsx, index.ts, package.json |
| follow-up B | Scroll-reveal motion on landing sections | 68e4cfd | RevealOnScroll.tsx, LandingPage.tsx, HowItWorks.tsx, index.ts |

## What Was Built

### PUB-01: Public Landing Page
`src/app/(public)/page.tsx` is the new root `/` route (route group, no URL change). It composes:
- `PublicHeader` — sticky nav with brand, anchors (#how #impact #about #contact), `LanguageSwitcher`, Sign in + Become a volunteer CTAs
- `LandingPage` — hero (live badge, h1, dual CTAs), ImpactCounter, HowItWorks, WaysToHelp, AboutSection (with blockquote + 3 stats), FinalCtaSection
- `PublicFooter` — brand tagline, Explore nav, Contact (email + phone + address), language switcher, rights

The old `src/app/page.tsx` placeholder was deleted via `git rm` before `(public)/page.tsx` was created to avoid the Next.js parallel-page error. All text uses `landing.*` and `common.*` i18n keys — no hardcoded English strings in components.

### PUB-02: Live Impact Counter
`getCachedImpactReport()` in `src/server/db/repositories/impact.ts` wraps `pickupsRepo.impactReport(new Date(0), new Date(9999, 0, 1))` with `unstable_cache(["impact-report-all-time"], { revalidate: 300 })`. Returns `{ servings, kg, count }` aggregate only (T-7-02-01: no PII). Server Component passes numbers as props to `ImpactCounter` client component which animates them via `useCountUp` from `@tokens/motion`. DB is currently near-empty (counts ~0) — correct behavior.

### PUB-03: Volunteer Signup Wiring
`ROUTES.becomeVolunteer` (`/sign-up?role=volunteer`) links from hero and volunteer card. `src/app/onboarding/page.tsx` reads `searchParams.role`, validates it against `['volunteer', 'donor']` allowlist (T-7-02-02), and passes `defaultRole` prop to `OnboardingForm`. The form pre-selects the role card. `completeOnboarding` server action is unchanged (AUTH-05 path still validates server-side, T-7-02-03).

### PUB-04: PWA Manifest
`src/app/manifest.ts` exports a `MetadataRoute.Manifest` with `name: "Rajyash Food Rescue"`, `display: "standalone"`, `theme_color: "#C04E12"` (saffron), `background_color: "#FBF7F0"` (cream), and 3 icon entries (192, 512, 512-maskable). Served by Next.js at `/manifest.webmanifest` automatically.

### Header Reconciliation
The global sticky header (with bare `LanguageSwitcher`) added in 07-01 to `src/app/layout.tsx` was removed as specified. The landing page now has its own `PublicHeader` with full nav. Portal/admin pages will add their own chrome in plan 07-03.

### Follow-up A: In-page Theme Toggle (next-themes)
Two design features from the imported `landing.dc.html` (and the original task brief items 3 & 5) were initially omitted and added in follow-up commits.

- Installed `next-themes@0.4.6`. `src/app/providers.tsx` now wraps the app in `ThemeProvider` (`attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `disableTransitionOnChange`). This toggles `<html class="dark">`, which our `src/app/globals.css` already maps via `@custom-variant dark (&:is(.dark *))` + a full `.dark` token block.
- `src/features/public/components/ThemeToggle.tsx` is a `"use client"` sun/moon pill button in `PublicHeader` next to the `LanguageSwitcher`. It is **mount-guarded** (renders a stable `aria-hidden` placeholder of identical size until mounted) to avoid hydration mismatch, since the server has no resolved theme. `aria-label`/`aria-pressed`/`title` reflect the current theme using `landing` keys `themeLight`/`themeDark`. Styling is fully token-based (`border-strong`, `surface`, `surface-2`).
- The design's `[data-theme]` + localStorage mechanism was deliberately NOT used — next-themes (class strategy) is the chosen approach per the task brief; it handles SSR no-flash + persistence. `<html suppressHydrationWarning>` (next-themes requirement) was already present in `layout.tsx` from 07-01.
- Dark mode visibly flips all tokens (background, surface, foreground, borders) because every component uses token classes, not hardcoded colors.

### Follow-up B: Scroll-reveal Motion (generous budget)
- `src/features/public/components/RevealOnScroll.tsx` is a `"use client"` wrapper using `IntersectionObserver` (threshold 0.15, `rootMargin "0px 0px -10% 0px"`) to animate children in: opacity `0→1` + `translateY(20px)→0`, **transform + opacity only**, 500ms with `var(--ease-out)`, optional `delay` prop (mirrors the design's `data-delay`).
- **Progressive enhancement:** children render fully visible on the server and until mounted (`armed` state gates the hidden style), so no-JS / SSR always shows content. Only after client mount does it hide-then-reveal on scroll. Honors `prefers-reduced-motion` two ways — it early-returns before arming (content stays visible, no animation) AND carries a `motion-reduce:!opacity-100 motion-reduce:!transform-none` utility belt-and-suspenders.
- Applied at section level (not over-wrapped) across the landing: hero (staggered badge → title → sub → CTAs → trust), how-it-works (heading + 3 steps via `as="li"`), ways-to-help (heading + 3 cards), about (heading / quote / 3-stat grid), and final CTA — matching the design's `data-reveal`/`data-delay` cascade.
- Uses a **callback ref** (not a `RefObject`) so one component can render as `div` / `section` / `li` without a union-type ref error.

## Test Results

```
src/server/db/repositories/impact.test.ts  3 tests — PASS
src/app/manifest.test.ts                   4 tests — PASS
Plan-specific tests: 7, 0 failures

Full suite (SKIP_ENV_VALIDATION=1 pnpm test:run): 22 files, 119 tests — ALL PASS
SKIP_ENV_VALIDATION=1 pnpm typecheck — clean
pnpm lint — 0 errors, 1 warning (pre-existing layout.tsx custom-font, out of scope)
```

No new tests were added for ThemeToggle or RevealOnScroll: per `.claude/rules/testing-practices.md`, mount-guarded presentational components and IntersectionObserver-driven motion (browser API, no real branching logic worth asserting) fall under "don't test" — a test could only fail on a typo, not a real regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RefObject<HTMLSpanElement | null> incompatible with useCountUp**
- **Found during:** Task 2 typecheck
- **Issue:** `useRef<HTMLSpanElement>(null)` returns `RefObject<HTMLSpanElement | null>` but `tokens/motion.ts useCountUp` expects `RefObject<HTMLElement>` (not nullable). TypeScript error: "Type 'null' is not assignable to type 'HTMLElement'."
- **Fix:** Changed refs to `useRef<HTMLElement>(null) as React.RefObject<HTMLElement>`
- **Files modified:** `src/features/public/components/ImpactCounter.tsx`
- **Commit:** 63dd6a8

**2. [Rule 2 - Missing critical] Hardcoded hex fallback in FinalCtaSection**
- **Found during:** Post-commit acceptance check (#16)
- **Issue:** `style={{ color: "var(--color-primary, #C04E12)" }}` included raw hex as CSS fallback, violating CLAUDE.md "no hardcoded hex when a token exists"
- **Fix:** Changed to `var(--color-primary)` — token always defined in our globals.css
- **Files modified:** `src/features/public/components/LandingPage.tsx`
- **Commit:** 0c5193a

### i18n Key Shape Deviation
The plan's `<interfaces>` block described nested keys (`t("hero.headline")`, `t("counter.servings")`). The actual `landing.json` created in plan 07-01 uses **flat keys** (`t("heroTitle")`, `t("statMeals")`). Implementation uses the actual file's flat key structure — the design aligns with what exists, not the plan's pseudocode.

### Scope Addition: Theme Toggle + Scroll-Reveal (follow-up)
The original task brief (`<how_to_implement_the_design>` items 3 & 5, `<structure>` listing `ThemeToggle` + `RevealOnScroll`) specified these two design features; they were omitted in the first pass and added in follow-up commits `a11e541` and `68e4cfd`. New dependency: `next-themes@0.4.6`. No structural rework of existing components — additive only (ThemeToggle slotted into PublicHeader; RevealOnScroll wraps existing section markup as RSC children).

### Pre-existing Out-of-Scope Test Failures
Two test files — `src/features/pickups/actions/pickupActions.purge.test.ts` and `src/server/inngest/recipients.test.ts` — fail when `pnpm test:run` runs **without** `SKIP_ENV_VALIDATION=1`, because they import `src/config/env.ts` which throws on missing `DATABASE_URL`. Confirmed pre-existing (they fail identically on a clean tree with my changes stashed) and unrelated to this plan. With `SKIP_ENV_VALIDATION=1` (the flag the plan's verification commands specify) all 22 files / 119 tests pass. Logged here per the deviation-rule SCOPE BOUNDARY; not fixed in this plan.

## Known Stubs

None. The landing page is fully wired to real data (DB aggregate via cached query). If the DB is empty, counts show 0 (correct behavior for a new deployment).

## Threat Flags

No new threat surface beyond what was in the plan's threat model. All three mitigations implemented:
- T-7-02-01: `getCachedImpactReport` returns aggregate only
- T-7-02-02: `onboarding/page.tsx` validates role against allowlist
- T-7-02-03: `completeOnboarding` server action unchanged (still validates role server-side)

## Self-Check

### Created Files Exist
- `src/server/db/repositories/impact.ts` — FOUND
- `src/app/manifest.ts` — FOUND
- `src/app/(public)/page.tsx` — FOUND
- `src/features/public/components/LandingPage.tsx` — FOUND
- `src/features/public/components/ImpactCounter.tsx` — FOUND
- `src/features/public/components/ThemeToggle.tsx` — FOUND
- `src/features/public/components/RevealOnScroll.tsx` — FOUND
- `src/app/page.tsx` — DELETED (intentional)

### Commits Exist
- c954398 feat(07-02): cached impact repository + PWA manifest — FOUND
- 63dd6a8 feat(07-02): public landing page scaffold + volunteer signup wiring — FOUND
- 0c5193a fix(07-02): remove hardcoded hex fallback — FOUND
- a11e541 feat(07-02): in-page theme toggle (next-themes, class strategy) — FOUND
- 68e4cfd feat(07-02): scroll-reveal motion on landing sections — FOUND

## Self-Check: PASSED
