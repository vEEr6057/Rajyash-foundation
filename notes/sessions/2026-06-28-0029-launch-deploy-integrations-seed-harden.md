# Session: Launch-ready — prod deploy fix, integrations wired + verified, seed data, harden/polish

Date: 2026-06-28 00:29
Status: completed
Owner: HP
Model: Claude Opus 4.8
Session-Id: 5c73d169-5a57-48f4-a918-44ed2699973c
Tags: #session #deploy #cloudflare #opennext #wsl #ci #github-actions #clerk #supabase #resend #inngest #seed #a11y #playwright #launch

> 4th checkpoint of session `5c73d169` (same id). Prior: `…0339-phase1-deploy-phase2-kickoff`, `…0110-phases-3-4-6-…`, `…1100-phase-7-merge-prs-cloudflare-deploy-ci`. This note covers everything after "v1 is done" → getting it actually LIVE: the production 500 fix, CI, the three external integrations verified, the UI audit, ~2-month seed data, and a harden/polish batch.

## Objective

Take the merged-but-not-truly-live v1 and make it production-real: fix the live 500, automate deploys, wire + verify the external integrations (Clerk↔Supabase realtime, Resend email, Inngest jobs), audit + fix UI bugs, seed ~2 months of believable data, and harden/polish.

## Starting Context

- Branch: main (all phase PRs merged)
- Module(s): c:/Users/HP/Desktop/Rajyash-Foundation
- Related notes: 2026-06-27-1100-phase-7-merge-prs-cloudflare-deploy-ci.md
- Ticket/Issue/PR: PRs #8 (final-CTA), #9 (RESEND_FROM), #10 (harden), #11 (seed), #12 (__name); live at rajyash-food-rescue.shahveerkeaten.workers.dev

## Session Metrics

| Metric | Value |
|--------|-------|
| Files edited | ~30 (code + CI + i18n) |
| Commands run | ~120 (incl. ~12 deploys, MCP, Playwright) |
| Context used | N/A (multiple compactions) |
| Session cost | N/A |
| Duration | N/A |
| Lines added | N/A |
| Lines removed | N/A |

## Usage Breakdown

- Cost: N/A
- Duration: N/A
- Lines added: N/A
- Lines removed: N/A

## Work Summary

**Production deploy — fixed the live 500.** Two causes: (1) the Worker was missing 6 required secrets (INNGEST_*, RESEND, VAPID_*) → set via `wrangler secret put`; (2) the real blocker — **opennext's aws-core middleware patcher silently fails on a Windows build**, leaving Next's `require(middleware-manifest.json)` unpatched → runtime 500. Diagnosed by ruling out secrets/lockfile/tracing-root/Serwist/next-intl/opennext-patch/Next-patch via `wrangler tail`. Fixed by building the bundle in **WSL (Linux)** and deploying that from Windows wrangler → site live. Captured as a lesson.

**CI — merge-only deploy.** Added `.github/workflows/deploy.yml` (ubuntu build + deploy). Fixed Node 20→22 (wrangler 4.x needs ≥22). Per the user's "actions only on merge", consolidated to ONE workflow: validate (typecheck+lint+tests) → build → deploy, triggered only on push to `main`. Free on the public repo. Added `scripts/deploy-wsl.sh` (`pnpm deploy:wsl`) + `DEPLOY.md`. Guided the owner (`vEEr6057`) to set the require-PR branch ruleset (the gh CLI here is collaborator `veersh16`, not admin → can't set it myself).

**Integrations — all verified live.**
- **Clerk↔Supabase third-party auth:** fixed the user's JWKS error (they needed the Clerk issuer `https://viable-louse-83.clerk.accounts.dev`, not the dashboard URL). Verified: real Clerk token → Supabase REST 200; bogus token → 401. App code already used the default Clerk token (accessToken + realtime.setAuth), so live tracking auto-switched polling → realtime.
- **Resend:** key valid (test send 200 to `delivered@resend.dev`), set on Worker. Made the sender env-driven (`RESEND_FROM`, PR #9) so swapping to a verified domain later is config-only.
- **Inngest prod sync:** confirmed the Worker endpoint live + a `signkey-prod` key set (no INNGEST_DEV on the Worker). After the user synced the app, verified end-to-end: sent a `pickup/created` event → Inngest invoked the function on the Worker → in-app + web-push delivery rows + a notification row appeared in the DB (then cleaned up).

**UI audit (Playwright, all pages, light + dark).** Found 1 real bug: the final-CTA "Become a volunteer" button was white-on-white (outline variant's `bg-surface` + inherited white text on the orange band, no transparent bg) → fixed with `background: transparent` (PR #8). Audited admin (5 pages, via a promoted test user) + volunteer board/map (via the test volunteer) — all clean. Non-bugs confirmed: frosted-glass sticky header (intentional), sign-in/up "blank" (already-signed-in redirect).

**Seed data (~2 months).** Inserted 8 partners, 12 donors + 8 volunteers, and ~172 pickups (151 delivered, 10 in-progress, 12 open) spread over 60 days via generate_series — all ids prefixed for easy removal. Live impact counter now shows **6,952 servings · 924 kg · 151 deliveries**. Committed `scripts/seed.sql` (+ cleanup snippet, PR #11).

**Harden/polish (PR #10) + __name fix (PR #12).** Authed-header brand → "Rajyash Foundation" + "Food Rescue" (EN/GU/HI); last-admin lockout guard (`countActiveAdmins()` + block demote/deactivate of the final admin, +4 tests); a11y sweep (decorative icons `aria-hidden`). Then fixed the live `ReferenceError: __name is not defined` (opennext esbuild keepNames injects `__name` into next-themes' inlined no-flash function) with a `globalThis.__name` identity polyfill first in `<head>` — verified live console is now **0 errors**.

## Files Touched

- (working tree clean — all merged to main) Key code: src/app/layout.tsx (__name polyfill), next.config.ts (swSrc src/app/sw.ts; outputFileTracingRoot tried/removed), src/config/env.ts + src/server/notifications/email.ts (RESEND_FROM), src/components/AuthedHeader.tsx (brand), src/features/admin/actions/adminActions.ts + src/server/db/repositories/profiles.ts (last-admin guard + tests), src/features/public/components/LandingPage.tsx (final-CTA fix), src/features/{notifications,pickups,public}/** (a11y), i18n common.json (en/gu/hi).
- CI/infra: .github/workflows/deploy.yml, scripts/deploy-wsl.sh, scripts/seed.sql, DEPLOY.md, vitest.config.ts, eslint.config.mjs.
- .claude/lessons/general/opennext-windows-build-middleware-500.md (+ INDEX).

## Git Diff Summary

```
(working tree clean — all changes merged to main via PRs #8–#12; notes/ uncommitted)
```

## Recent Commits

```
7466164 Merge pull request #12 from vEEr6057/fix/name-polyfill
b47e04c Merge pull request #11 from vEEr6057/chore/seed-script
08fd4a1 Merge pull request #10 from vEEr6057/chore/harden-polish
b5704e7 Merge pull request #9 from vEEr6057/chore/resend-from-env
c32d35f Merge pull request #6 from vEEr6057/feature/phase-7-public-site-i18n-pwa
```

## Commands Run

```bash
# Deploy debugging
wrangler secret put INNGEST_EVENT_KEY/SIGNING_KEY RESEND_API_KEY VAPID_* ; wrangler tail rajyash-food-rescue --format pretty
wsl.exe bash <build-script>   # git archive HEAD -> ~/rajyash, pnpm install, opennextjs-cloudflare build (LINUX)
cp -r ~/rajyash/.open-next ./.open-next ; npx wrangler deploy
mv ~/package-lock.json ~/package-lock.json.bak   # stop Next workspace-root mis-inference
# Integration verification (node + Playwright + Supabase MCP)
node -e "fetch(clerk JWKS / resend /emails / inn.gs/e/<key>)"   # verified JWKS, Resend 200, Inngest event
# Supabase MCP execute_sql: schema introspection, seed inserts (generate_series), verification, scoped cleanup
# CI
gh pr create/merge (#8..#12) ; gh run view <id> --log-failed  # node 20->22 fix
SKIP_ENV_VALIDATION=1 pnpm typecheck ; pnpm lint ; pnpm test:run
```

## Problems and Fixes

- Problem: live site 500 on every route.
  - Fix: (a) set the 6 missing Worker secrets; (b) build on Linux/WSL (opennext's patcher fails on Windows builds → unpatched middleware require). Deploy the Linux-built `.open-next` via Windows wrangler.
- Problem: GitHub Actions deploy failed — `Wrangler requires Node >= 22`.
  - Fix: `node-version: 22` in the workflow.
- Problem: Supabase "JWKS fetch failed" adding Clerk third-party auth.
  - Fix: use the Clerk issuer domain `https://viable-louse-83.clerk.accounts.dev` (from the pk_test / session iss), not the dashboard URL.
- Problem: final-CTA "Become a volunteer" white-on-white (invisible until hover).
  - Fix: `backgroundColor: transparent` on that outline button (orange band shows through → white-outline button).
- Problem: live `ReferenceError: __name is not defined` (every page; broke next-themes no-flash).
  - Fix: `globalThis.__name` identity polyfill, first in `<head>` (opennext esbuild keepNames leaked `__name` into next-themes' inlined script).
- Problem: `git reset --hard origin/main` (to resync stale local main) discarded the uncommitted 1100 session log's `_index` line (the .md file itself was untracked → survived).
  - Fix: restored the index line in this save.

## Decisions

- Production bundle MUST be built on Linux (opennext Windows patcher bug) → CI on ubuntu, or WSL-build + Windows `wrangler deploy`.
- Actions are merge-only (validate+deploy on push to main); no PR-time checks (user's choice).
- Resend sender env-driven (`RESEND_FROM`); test now with free `onboarding@resend.dev`, flip to a verified domain via the Worker secret later (no code change).
- Email/notifications domain: use a SUBDOMAIN (`notify.rajyashgroup.com`) not the root; deferred — user lacks DNS access (get IT, or buy a domain).
- Seed data made the impact counter "real"; dropped the separate synthetic-baseline idea. All seed rows prefixed for clean removal.
- Sentry deferred (needs the user's account/DSN + is build-risky on opennext).

## Open Tasks

1. **Owner (`vEEr6057`) sets the require-PR branch ruleset** (gh here is non-admin `veersh16`).
2. **Resend domain** → real recipients: add DNS for `notify.rajyashgroup.com` (needs IT/DNS access) or buy a domain, then set the `RESEND_FROM` Worker secret.
3. **First admin**: Clerk dashboard → set a staff user's `publicMetadata.role="admin"` after they sign up.
4. Remove dummy seed data when real data arrives (cleanup snippet in `scripts/seed.sql`).
5. Optional: add `paths-ignore` (notes/docs/`.sql`/`.md`) to the deploy workflow so doc changes don't redeploy.
6. **Phase 5 (Payments) PARKED** — un-park on foundation greenlight (Razorpay NGO KYC lead time).
7. Custom domain / change the `shahveerkeaten` workers.dev subdomain (Cloudflare dashboard, owner).
8. Commit the notes/sessions logs (currently untracked) — ideally after #5 so it doesn't trigger a deploy.

## Resume Checklist

1. Re-open this note (+ `.remember/remember.md`, `DEPLOY.md`).
2. `git checkout main && git fetch origin && git reset --hard origin/main` (keep local main synced).
3. Validate: `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm test:run`.
4. Deploy = push to `main` (CI, Linux) or `pnpm deploy:wsl`. Continue from Open Tasks (branch rule + Resend domain first).

## Next Session Prompt

Use this in chat: "check last session" or "open session launch-deploy-integrations-seed-harden".
