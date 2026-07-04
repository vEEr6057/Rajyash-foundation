# Finishing batch — P1 standards + dependency hygiene (build contract)

**Status:** LOCKED (Fable, 2026-07-04). The last buildable loose ends before a full-app E2E; payments
deliberately excluded. Small, single PR, main-tree (one builder).

## 1. `/privacy` page + footer link

The report-only CSP, Clerk auth, Supabase, web-push, and cookieless analytics all imply a privacy
policy — none exists. Build a real one (not lorem):

- Route: `src/app/(public)/privacy/page.tsx` — reuses `PublicHeader` + `PublicFooter`, wraps content
  in `<main className="rj-home …">` with the homepage `--rj-*` tokens + `--rj-text` (40rem) prose
  width; slab H1 "Privacy". `export const metadata = { title: "Privacy", alternates: { canonical: "/privacy" } }`.
- Content (accurate to THIS app — write it, EN + GU + HI via a new `privacy` i18n namespace, machine
  drafts flagged `_review: pending` like the other catalogs): who we are (Rajyash Foundation, Ahmedabad,
  est. 2016); what we collect (account = name/email via Clerk + Google OAuth, optional phone; pickup
  content donors post; **volunteer/driver GPS location ONLY while a pickup/run is active, purged on
  delivery/cancel/completion — ephemeral, never sold**; in-app notification + push-subscription data);
  what we DON'T (no payment data — donations not yet enabled; no advertising trackers; cookieless
  analytics); processors (Clerk auth, Supabase DB, Resend email, Cloudflare hosting/analytics, OSM/
  Nominatim maps); rights + contact (the foundation email/phone from `common.footer.*`); data retention
  (location ephemeral; notifications swept nightly per B3). Keep it plain, ~8 short sections.
- **Middleware:** add `/privacy` to `isPublicRoute` in `src/middleware.ts` (it's under the (public)
  group but the Clerk matcher still runs — mirror how `/` is handled; verify `/privacy` returns the
  page, not the sign-in shell).
- **Footer:** add a Privacy link to the footer's Explore (or a new legal row) — `ROUTES.privacy`
  constant added to `src/config/constants.ts`.
- **sitemap.ts:** add `/privacy` (priority 0.3). **robots.ts:** it's already allowed (only /admin,
  /api, /portal, etc. are disallowed) — verify `/privacy` is NOT caught by a disallow.

## 2. Footer social links (visible)

The JSON-LD already carries `sameAs` (facebook + instagram). Surface them as two icon links in the
footer Contact column (lucide `Facebook`/`Instagram`, `aria-label` each, `--rj-ink-soft` →
hover `--rj-green`, focus-visible ring). Single source: hoist the two URLs to a `SOCIAL_LINKS`
const in `src/config/constants.ts` and reference it from BOTH the footer and the page's `ORG_JSONLD`
`sameAs` (kills the duplication). Behaviour-identical JSON output.

## 3. Dependabot — 2 moderate (build/dev deps, not runtime)

`postcss` (XSS via unescaped `</style>` in stringify) + `esbuild` (dev-server request leak). Both are
transitive build-time deps. Bump via pnpm: add a `pnpm.overrides` block in `package.json` pinning
`postcss` and `esbuild` to the patched versions Dependabot names (check the alerts / `pnpm why` for
the current transitive version and the advisory's fixed range), then `pnpm install` to update the
lockfile. Do NOT bump majors; if the patched version needs a major that risks the build, pin the
highest safe patch and note the residual in the PR. Commit `package.json` + `pnpm-lock.yaml` only.

## Also

Commit the untracked `docs/backend/B5-OBSERVABILITY-SPEC.md` + `docs/backend/FINISH-STANDARDS-SPEC.md`
as part of the docs (a `docs:` commit).

## Out of scope

Payments/Razorpay · registration number (owner data) · analytics token (owner) · CSP enforcement flip ·
responsive image variants / WebP hero (P2) · native-speaker translation review (owner).

## Validation bar

`tsc` + `eslint` (changed files explicit) + `vitest --run` zero new failures. New test: catalog-parity
already covers the new `privacy` namespace (EN/GU/HI keys must match) — ensure it passes; no bespoke
tests needed for a static content page. Conventional commits, no Co-Authored-By, no local build
(opennext Windows bug), PR to main, do not merge.
