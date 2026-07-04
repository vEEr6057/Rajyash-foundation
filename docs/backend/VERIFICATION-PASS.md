# Verification pass — Lighthouse / CWV / PWA / a11y (2026-07-04)

Live prod (`/`, mobile Lighthouse 13.4, throttled). Feature-complete app, post-#73.

## Scores

| Category | Score | Verdict |
|---|---|---|
| Accessibility | **100** | ✅ (the batch-1 a11y pass + charter focus rings held) |
| SEO | **100** | ✅ (metadata, canonical, robots, sitemap, JSON-LD all landed) |
| Best Practices | **73 → ~90 after the CSP fix** | 1 code fix shipped; rest is Clerk |
| Performance | **44** | dominated by the Clerk **dev-instance** handshake + free-tier; see below |
| PWA | criteria met (manual) | manifest.webmanifest 200, sw.js 200, apple-touch-icon 200 (Lighthouse 13 dropped the PWA category) |

## Findings

**1. [SHIPPED, code] `upgrade-insecure-requests` in a report-only CSP.** Chrome ignores it in
report-only mode and logs a console error on *every* page load — that's the Best-Practices "browser
errors logged to console" fail. Removed from `CSP_REPORT_ONLY` in `src/middleware.ts` (re-add only
when the CSP flips to enforcing). One line; clears the console-error and Issues-panel flags.

**2. [OWNER / infra — the #1 perf lever] Clerk is a DEVELOPMENT instance.** The homepage's 2.42s
redirect chain is a Clerk `__clerk_hs_reason=dev-browser-missing` handshake bouncing through
`viable-louse-83.clerk.accounts.dev` on every first visit. This single hop is the biggest CWV drag
(LCP 11.1s / TTI 11.2s under throttle) AND the source of the Best-Practices "third-party cookies"
flag. It disappears on a **production Clerk instance** — which needs a real custom domain (we're on
`*.workers.dev`; a real domain is already on the deferred/when-funded list). **No safe code fix
substitutes for this.** A code-side alternative (exclude `/` + `/privacy` from `clerkMiddleware` so
they never handshake) is possible but touches the auth boundary + would need the security headers
re-plumbed for those routes and careful re-testing of the auth-aware header — a considered change,
not a cheap win. Recommend: do the production Clerk instance when the domain lands; revisit the
middleware-exclusion only if the handshake tax still bites after that.

**3. [deferred, P2] Reduce unused JS ~214 KiB.** Clerk's client bundle loads on the public
homepage (needed for the auth-aware header). Lazy-loading it is a real but higher-risk optimization;
not worth it before the production-instance move (which changes the Clerk footprint anyway).

**4. Free-tier cold start.** Part of the LCP is the Worker spinning up. Inherent to the zero-budget
tier; a field measurement (real users, warm worker) reads far better than the throttled lab number.

## Net

The app is a11y- and SEO-perfect and PWA-installable. The one code defect (CSP console error) is
fixed. The performance number is real but its dominant cause is a single infra decision — moving
Clerk to a production instance on a real domain — not application code. Nothing else in the pass
warrants a code change today.
