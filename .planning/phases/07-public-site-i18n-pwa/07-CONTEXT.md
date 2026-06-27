# Phase 7: Public Site + i18n + PWA - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

The **public, unauthenticated site** + app-wide **internationalization** + **PWA installability**.
Deliver: a real public **landing page** at `/` (replacing the placeholder) describing the
food-rescue program, with a **live impact counter** (cached DB aggregate) and a **"Become a
Volunteer"** signup path; **all UI** (public site, donor/volunteer portal, AND admin) available
in **English, Gujarati, Hindi** with a **persistent language switch**; and the app made an
**installable, offline-capable PWA**.

Requirements: **PUB-01..04, I18N-01..03**. Builds on Phase 1 (Clerk sign-up + onboarding, design
tokens, middleware), Phase 4 (existing push service worker `public/sw.js`), Phase 6
(`pickupsRepo.impactReport` → servings + kg).

**Out of scope** (later / parked): monetary donation flow (Phase 5 Payments — PARKED; any "donate
money" CTA is a placeholder/coming-soon here), public stories/blog (PUB-05, v2), URL-prefixed
locale routing + localized SEO (v2 idea), SMS/WhatsApp template i18n (NOT-06/07, v2).
</domain>

<decisions>
## Implementation Decisions

### Public landing (PUB-01, PUB-03) — design source
- **D-01:** The landing visual is **designed in claude.ai/design by the user and imported** (the
  user's chosen approach; a design prompt was provided this session). To keep the phase moving
  while the design is produced, the build proceeds on everything else and on a **structural
  scaffold** (sections, data wiring, i18n keys, CTAs) that the imported claude.ai/design output
  **slots into without structural rework** — same token system (the design MUST use the locked
  tokens so it imports cleanly). If the export isn't ready by build time, ship a token-based
  baseline landing and refine on import (deferred touchpoint).
- **D-02:** Landing sections (the scaffold the design fills): hero + program description (PUB-01),
  **live impact counter** (PUB-02), how-it-works (3 steps: donor posts → volunteer claims → food
  delivered), about Rajyash Foundation + contact, **"Become a Volunteer"** CTA (PUB-03), footer
  with the **language switch**. Public pages are **server components**, unauthenticated; public =
  the **generous** motion budget (transform+opacity only; reduced-motion honored).

### Impact counter (PUB-02)
- **D-03:** Counter = **cached all-time aggregate** reusing `pickupsRepo.impactReport` — **total
  servings + total kg + delivered count, shown separately** (no lossy conversion; consistent with
  Phase 6 D-07). Cache via Next `unstable_cache` / segment `revalidate` (~300s) so the public page
  never hammers the DB. Animated **count-up** via the existing `useCountUp` (tokens/motion.ts),
  reduced-motion safe. No per-record data leaked (aggregate only — safe to read unauthenticated).

### Volunteer signup (PUB-03)
- **D-04:** "Become a Volunteer" **reuses the existing Clerk sign-up + onboarding**, role defaulted
  to `volunteer` (no separate account system; AUTH-05 path unchanged). Wiring details = Claude's
  discretion (prefill role through the sign-up/onboarding flow).

### PWA (PUB-04)
- **D-05:** **Full offline precache via Serwist** (maintained next-pwa successor, App-Router-
  friendly): web **manifest** (`src/app/manifest.ts`) + icons (192 / 512 / maskable) + a Serwist
  service worker precaching the app shell. **Must preserve push** — the existing push handler
  (`public/sw.js`, Phase 4) is merged into / imported by the Serwist SW so web-push keeps working.
  **RISK (flagged):** Serwist + `@opennextjs/cloudflare` + App Router build compatibility — this
  project already hit `.next` vendor-chunk corruption. **Contingency (per blocker rule):** if
  genuinely incompatible after real effort, fall back to **minimal manifest + extend the existing
  SW** (still meets PUB-04 "installable"), and document the downgrade.

### i18n (I18N-01..03)
- **D-06:** **next-intl** in **"without i18n routing"** mode — locale in a **cookie** (`NEXT_LOCALE`),
  **URLs unchanged** (no `[locale]` segment). Composes with the existing Clerk middleware (no
  middleware chaining, no route refactor). `getRequestConfig` reads the cookie;
  `NextIntlClientProvider` in the root layout for client components.
- **D-07:** **All UI** — public site, portal, **and admin** — externalized to message catalogs and
  available in **EN/GU/HI** (success criterion #3). Per-feature namespaces, reuse-first (shared keys
  for common UI). This is a **large retrofit** of currently-hardcoded English strings.
- **D-08:** **EN authored + GU/HI machine-drafted now** (Claude generates Gujarati + Hindi),
  committed with a **`review-pending`** marker for foundation review. Meets "all 3 languages live"
  for v1; wording polished post-review by a human.
- **D-09:** A **persistent language switch** (header + footer) sets `NEXT_LOCALE` and re-renders;
  choice survives refresh + sessions; available on **every** page (public + authed).
- **D-10:** GU (Gujarati) + HI (Devanagari) render via the design system's already-specced
  Noto/Mukta multi-script body fonts; route number/date formatting (admin already uses `en-IN`)
  through next-intl formatters per locale.

### Claude's Discretion
- Message-catalog layout (per-namespace JSON under `src/i18n/messages/{en,gu,hi}/`), exact
  volunteer-signup wiring, counter cache TTL, Serwist config, icon generation, scaffold markup the
  imported design replaces.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning
- `.planning/PROJECT.md` — Key Decisions (Cloudflare host, next-intl, free tiers, single-tenant).
- `.planning/REQUIREMENTS.md` — PUB-01..04, I18N-01..03 (+ v2: PUB-05, URL-locale SEO).
- `.planning/ROADMAP.md` §"Phase 7" — goal + 5 success criteria.
- `.planning/phases/{01-foundation,02-rescue-loop}/*-SUMMARY.md` — Clerk sign-up/onboarding + role patterns.

### Design system (UI hint: yes — public = generous motion)
- `docs/design/UI-SPEC.md` — binding design contract.
- `tokens/globals.css` — canonical color/type tokens (already in `src/app/globals.css`).
- `tokens/MOTION.md` + `tokens/motion.css` + `tokens/motion.ts` — motion spec + `useCountUp` (for the counter) + public/generous budget.
- `docs/design/rajyash-design-system.html` + `docs/design/rajyash-motion-system.html` — visual oracles.

### Rules
- `.claude/rules/{frontend-practices,testing-practices,git-workflow}.md`.

### Code (integration points)
- `src/middleware.ts` — Clerk gate (i18n must compose, no chaining in cookie mode).
- `src/app/{layout.tsx,page.tsx,providers.tsx,globals.css}` — root layout (add `NextIntlClientProvider`), placeholder landing to replace.
- `src/server/db/repositories/pickups.ts` (`impactReport`) — public counter source.
- `public/sw.js` — existing push SW (merge into Serwist SW).
- `src/config/constants.ts` — `ROUTES` (add public routes); `src/app/sign-up`, `src/app/onboarding` — volunteer signup reuse.

No new external ADRs — decisions captured above.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pickupsRepo.impactReport(from, to)` — servings + kg + count aggregate (wrap all-time + cached).
- `useCountUp` (tokens/motion.ts) — animated counter, reduced-motion aware.
- Clerk sign-up (`src/app/sign-up`) + onboarding (`src/app/onboarding`) — volunteer account creation.
- shadcn primitives (`src/components/ui/*`), design tokens, Button `buttonVariants` (sizes sm|md|lg only).
- Existing push SW (`public/sw.js`) — must keep working under Serwist.

### Established Patterns
- Server components + server actions default; thin pages; feature modules with `index.ts` barrels.
- Design tokens only (no hardcoded hex when a token exists); `logger` not `console`.
- `app/providers.tsx` already wraps TanStack Query (added Phase 4) — add `NextIntlClientProvider` at the layout level.

### Integration Points
- next-intl: `src/i18n/{request.ts,messages/*}` + `NextIntlClientProvider` in `layout.tsx`; locale cookie set by the switcher (server action or route).
- Retrofit: every hardcoded UI string → `useTranslations`/`getTranslations` keys across public + portal + admin.
- PWA: `src/app/manifest.ts` + icons in `public/`; Serwist SW (merges push); register in layout.
- New public routes under `src/app/(public)/**` or extend `/` — landing, become-a-volunteer.
</code_context>

<specifics>
## Specific Ideas

- Warm, human, trustworthy NGO feel (saffron #C04E12 + leaf-green #2E7D46 on cream #FBF7F0;
  Bricolage display + Mukta/Noto body). Light + dark.
- The imported claude.ai/design landing MUST use the locked tokens so it drops in cleanly.
- Contact (footer): rajyashfoundation@rajyashgroup.com · +91-9875041206 · Satellite, Ahmedabad 380015.
- Monetary-donation CTA is a placeholder/coming-soon (Phase 5 PARKED); lead with "Donate surplus
  food" (donor) + "Become a volunteer".
- Mobile-first (the audience is on phones); desktop graceful.
</specifics>

<deferred>
## Deferred Ideas

- **Design-import touchpoint:** user produces the landing in claude.ai/design (prompt provided this
  session) → import + refine the visual layer once delivered. Build proceeds on the scaffold meanwhile.
- **Serwist fallback:** if full offline precache is incompatible with opennext/Cloudflare, downgrade
  to minimal manifest + extended existing SW (document it).
- URL-prefixed locales + localized SEO (`/en|/gu|/hi`) — v2 if SEO matters.
- Public stories/impact blog (PUB-05, v2). Recurring/monetary donations (Phase 5 / PAY-05).
- Professional human polish of the machine-drafted GU/HI (foundation review pass).

None of the above expands this phase's scope.
</deferred>

---

*Phase: 7-Public Site + i18n + PWA*
*Context gathered: 2026-06-27*
