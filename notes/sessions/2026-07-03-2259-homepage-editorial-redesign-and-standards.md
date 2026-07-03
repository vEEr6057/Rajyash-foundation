# Session: Homepage editorial redesign + standards, E2E audit fixes, official-site clone

Date: 2026-07-03 22:59
Status: completed
Owner: HP
Model: Claude Opus 4.8 (1M) + Fable 5 (design critique/spec)
Session-Id: 5c73d169-5a57-48f4-a918-44ed2699973c
Tags: #session #frontend #design #seo #e2e #clerk #i18n #a11y #fable

## Objective

Continuation session. Two arcs: (1) finish the live E2E audit + role/login/data plumbing,
then (2) rebuild the public homepage — first a close clone of the official Rajyash site,
then (on Fable's critique) a bespoke editorial redesign backed by a three-layer spec set,
capped with the P0 web-standards pass (SEO/OG/schema/headers/LCP).

## Starting Context

- Branch: main (every change shipped via its own branch → PR → squash-merge → CI deploy)
- Module(s): Rajyash-Foundation (Next.js 15 + Cloudflare Workers food-rescue app)
- Related notes: notes/sessions/2026-06-30-1154-e2e-audit-bug-fixes-log-surplus-popup.md
- Ticket/Issue/PR: PRs #48–#61

## Session Metrics

| Metric | Value |
|--------|-------|
| Files edited | ~40 |
| Commands run | ~120 (git/gh/Playwright/SQL/PIL) |
| Context used | N/A |
| Session cost | N/A |
| Duration | multi-hour |
| Lines added | N/A |
| Lines removed | N/A |

## Work Summary

**Auth/roles/data (PRs #48–#53).** Dedicated staff sign-in at `/staff`; provisioned password
QA logins for all four roles + matching profile rows; discovered Clerk new-device verification
blocked real-domain logins (used `+clerk_test`/424242, then the user disabled device verification
so plain email+password now works). Minted 7-day one-time sign-in magic links when codes failed.
Imported the real Food Porter photos, updated homepage stats to the cofounder's real numbers
(300/day, 9,000+/month), and reworked destinations to capture **address / Google Maps link →
Find → pin** (no more raw lat/lng) with a clickable "Open in Maps"; seeded the 5 real tie-ups.

**Homepage rebuild.** First a **close clone** of rajyashfoundation.com (#54) — but their live site
is compromised (browser redirect to a 1win gambling scam via injected/cloaked JS; static HTML
clean), so I rebuilt from clean source + server-side asset fetch, never the hijacked page. Then,
on the user's ask, brought in **Fable** as design critic: it read the shipped code, called the
clone templated/AI, and steered to an **editorial elevation**. Shipped blocker fixes (#55: coral
WCAG contrast, dark-mode bug, GU/HI heading glyphs) then the full redesign (#56 body, #57
masthead+footer): scoped `--rj-*` token layer both themes, Roboto Slab ≤600 + Baloo Indic display,
hero typographic split, proof strip, programmes as editorial index rows, Food Porter live feature,
**provenance ledger** ("counted from deliveries logged in this app — not estimates"), the gold
scroll-drawn **rescue-line**, one human story, single green finale, leaf glyph, consistent photo
grade + captions. Verified live via Playwright screenshots.

**Three-layer doc set.** HOMEPAGE-SPEC (Fable, design contract) + HOMEPAGE-STANDARDS (#58, must-
haves synthesized from 2 parallel research passes + codebase audit) + HOMEPAGE-UI-SPEC (#59,
component contract with state matrices, dark deltas, QA checklist).

**P0 standards (#60, #61).** metadataBase + title/desc + canonical + Open Graph/Twitter + a real
1200×630 og.jpg (PIL-composited graded photo + brand); robots.ts + sitemap.ts; NGO JSON-LD;
security headers in middleware (HSTS/XCTO/XFO/Referrer/Permissions + CSP report-only); hero LCP
preload+fetchPriority+dims + decoding sweep; font-weight prune; apple-touch-icon. Caught + fixed
that `/robots.txt` & `/sitemap.xml` were auth-gated by the Clerk middleware matcher (#61).

## Files Touched

(no uncommitted app changes — all merged via PRs #48–#61; only the two new retro lessons are staged)

## Git Diff Summary

```
uncommitted: .claude/lessons/INDEX.md (M) + .claude/lessons/{general,frontend}/*.md (new retro lessons)
```

## Recent Commits

```
d08be78 fix(seo): let /robots.txt + /sitemap.xml through middleware (were auth-gated) (#61)
069e422 feat(public): homepage standards P0 — SEO, OG, schema, headers, LCP, fonts (#60)
fdd4ba9 docs(design): homepage UI spec — component-level contract (#59)
51a94a4 docs(design): homepage standards spec — must-haves + industry baselines (#58)
b36af01 feat(public): homepage masthead + footer on --rj-* layer (#57)
5f85e11 feat(public): editorial homepage rebuild per HOMEPAGE-SPEC (body) (#56)
84383b8 fix(public): homepage blockers — coral contrast, dark mode, GU/HI heading glyphs (#55)
```

## Commands Run

```bash
SKIP_ENV_VALIDATION=1 npx tsc --noEmit ; npx eslint <files> ; npx vitest --run   # 282 green
git checkout -b <branch> ; gh pr create ... ; gh pr merge --squash --delete-branch
gh run watch <id> --exit-status                                                   # CI deploy ×N
# Playwright MCP: live E2E across roles + homepage screenshots
# Supabase MCP: migration (destinations address/maps_link) + seed tie-ups
# PIL: composited public/og.jpg (1200x630) + apple-touch-icon
node ./_qa-*.mjs (Clerk backend: role logins, verify emails, sign-in tokens — temp, deleted)
curl -sSI <site>/  (verify robots/sitemap/headers/og live)
```

## Problems and Fixes

- Problem: `/robots.txt` `/sitemap.xml` served app HTML (auth-gated).
  - Fix: add both to `isPublicRoute` — clerkMiddleware matcher misses `.txt`/`.xml`. → lesson.
- Problem: times 5.5h early in prod.
  - Fix: pin `timeZone: "Asia/Kolkata"` on all formatters; IST `formatToParts` for datetime-local. → lesson.
- Problem: Create Run "Invalid input" then "Could not create run".
  - Fix: `z.preprocess→z.date()` (idempotent vs zodResolver) + `driverId || null` (empty-string FK).
- Problem: cloned homepage read as templated/AI (Fable critique).
  - Fix: editorial elevation — index rows not cards, provenance ledger, one motion moment, paper+slab.
- Problem: official site redirects to a gambling scam (compromised).
  - Fix: rebuilt from clean static source + server-side assets; flagged for cleanup. Never mirrored live.
- Problem: real-domain QA logins blocked by Clerk device verification.
  - Fix: `+clerk_test`/424242, then magic sign-in tokens; user disabled the toggle → plain login works.

## Decisions

- Homepage runs a scoped `--rj-*` brand layer, deliberately separate from the app saffron `--primary`.
- Direction: editorial elevate (Fable) over faithful template clone — user-confirmed.
- CSP ships Report-Only first (Clerk/Supabase/OSM) before enforcing.
- Font prune keeps Bricolage 800 (app shell uses it) — homepage doesn't use Bricolage.
- i18n full EN/GU/HI chosen but deferred to the final polish pass (paused for review).
- Retro: applied 2 lessons (metadata-route auth-gate, Intl timeZone on Workers); no gated changes.

## Open Tasks

1. Final homepage polish: i18n EN/GU/HI extraction + mobile-menu anchors + ledger count-up SSR
   fallback + a11y pass (axe/Lighthouse, GU headline at display size).
2. Real volunteer quote for the human story (placeholder "Riya, since 2023" in place).
3. Emails for Adit + Princy (admins) and the 8 drivers to provision logins.
4. (Owner) Clean the compromised WordPress at rajyashfoundation.com.
5. P1 standards: /privacy page + footer link; Cloudflare Web Analytics; social links + sameAs;
   registration number in footer. P2: responsive image variants, WebP hero, CSP enforce.

## Resume Checklist

1. Re-open this note.
2. Verify branch: `git checkout main && git pull`
3. Run first validation command: `SKIP_ENV_VALIDATION=1 npx vitest --run` (expect 282 green)
4. Continue from Open Tasks (start with homepage i18n/a11y polish).

## Next Session Prompt

Use this in chat: "check last session" or "open session homepage-editorial-redesign-and-standards".
