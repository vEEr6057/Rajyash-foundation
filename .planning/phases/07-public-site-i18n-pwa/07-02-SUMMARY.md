---
phase: "07"
plan: "02"
subsystem: public-site
tags: [landing-page, pwa, impact-counter, volunteer-signup, i18n, cached-data]
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
  affects:
    - "07-03"  # portal i18n — needs to know global header was removed
tech_stack:
  added: []
  patterns:
    - unstable_cache wrapping a repository function for public aggregate data
    - Route group (public) for layout isolation without URL change
    - Server Component async sub-functions for inline sections
    - useCountUp from @tokens/motion for animated counter (client island in server page)
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
  modified:
    - src/app/layout.tsx               # removed global header
    - src/app/onboarding/page.tsx      # added searchParams.role
    - src/features/auth/components/OnboardingForm.tsx  # added defaultRole prop
    - src/features/public/index.ts     # added new component exports
  deleted:
    - src/app/page.tsx                 # replaced by (public)/page.tsx
decisions:
  - "Landing i18n keys: used actual flat keys from en/landing.json (heroTitle, statMeals, etc.) rather than the nested shape shown in plan interfaces (hero.headline, counter.servings) — the actual file created in 07-01 uses flat keys"
  - "Global header in root layout removed as specified; PublicHeader in public page handles nav + LanguageSwitcher for the landing"
  - "FinalCtaSection inline styles use var(--color-primary) not hardcoded hex per CLAUDE.md"
  - "ImpactCounter refs typed as RefObject<HTMLElement> to satisfy @tokens/motion useCountUp signature"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-27"
  tasks_completed: 2
  files_count: 15
---

# Phase 7 Plan 02: Public Landing Page Scaffold Summary

**One-liner:** Full public landing page (hero + impact counter + 3-step how-it-works + two-ways-to-help + about + footer) with cached DB aggregate counter via `unstable_cache`, volunteer CTA pre-filling `defaultRole=volunteer` in onboarding, and Next.js PWA manifest at `/manifest.webmanifest`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Cached impact repository + manifest route handler | c954398 | impact.ts, impact.test.ts, manifest.ts, manifest.test.ts |
| 2 | Public landing page scaffold + volunteer signup wiring | 63dd6a8 | 10 files — see key_files |
| fix | Remove hardcoded hex from FinalCtaSection | 0c5193a | LandingPage.tsx |

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

## Test Results

```
src/server/db/repositories/impact.test.ts  3 tests — PASS
src/app/manifest.test.ts                   4 tests — PASS
Total: 7 tests, 0 failures
```

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
- `src/app/page.tsx` — DELETED (intentional)

### Commits Exist
- c954398 feat(07-02): cached impact repository + PWA manifest — FOUND
- 63dd6a8 feat(07-02): public landing page scaffold + volunteer signup wiring — FOUND
- 0c5193a fix(07-02): remove hardcoded hex fallback — FOUND

## Self-Check: PASSED
