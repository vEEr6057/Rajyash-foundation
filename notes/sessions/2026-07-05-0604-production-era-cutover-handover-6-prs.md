# Session: Production era — cutover docs, deep review, security review, 11 PRs shipped

Date: 2026-07-05 08:47
Status: completed
Owner: HP
Model: Claude Fable 5
Session-Id: 087eba9a-66cb-4823-81a1-77ba169325a0
Tags: #session #production #security #payments #rls #infra #ci #docs #handover #razorpay #turnstile

## Objective

Co-founder approved the app and wants it live on rajyashfoundation.com replacing their (broken) site. Turn that into: production discipline, an unbiased stack audit, co-founder-facing documents, a full pre-launch security review, and shipped hardening — extracting maximum value from Fable before its retirement window.

## Starting Context

- Branch: main
- Module(s): c:\Users\HP\Desktop\Rajyash-Foundation (docs, CI, payments, RLS, i18n, ops)
- Related notes: [[notes/sessions/2026-07-04-2111-comprehensive-gap-hunt-auth-i18n-guards]]
- Ticket/Issue/PR: PRs #84–#94 (all merged)

## Session Metrics

| Metric | Value |
|--------|-------|
| Files edited | ~90 across 11 PRs + docs/memory/lessons |
| Commands run | ~150 |
| Context used | N/A |
| Session cost | N/A |
| Duration | ~long (multi-arc) |
| Lines added | ~2,500 (code+docs) |
| Lines removed | ~120 |

## Usage Breakdown

- Cost: N/A
- Duration: N/A
- Lines added: see PRs #84–#94
- Lines removed: see PRs

## Work Summary

**Arc 1 — Cutover recon & co-founder docs.** Old rajyashfoundation.com confirmed DEAD (HTTP 500 since ~April; WordPress on GoDaddy, no MX). Wrote FOOD-PORTER-END-GOAL.md (4 paid stages, ₹0→~₹3.5k/mo), production-cutover.md (12-service ownership handover + developer-attribution §7 + confirm-list), RAZORPAY-KYC.md (whose-PAN-first, checklist, exact-name rule). Product name corrected to **Food Porter**. Attribution locked: MIT LICENSE (© 2026 Veer Shah), AUTHORS.md, CASE-STUDY.md (framed as v1 of ongoing work).

**Arc 2 — Fable deep review + 6 PRs.** Manual review of payments/auth/dispatch/IDOR → 1 real bug (out-of-order payment.failed downgrading a paid donation). Shipped: #84 payment fix · #85 docs · #86 discipline infra (PR CI, nightly encrypted backup, db:push guard, env-split) · #87 hardening (kill switches, stale-claimed escalation, rescue-time SLA, client-error sink, amount verification, 80G FY-in-IST, /terms + /refund-policy) · #88 Food Porter rename (EN/GU/HI) · #89 backup pg_dump-17 fix.

**Arc 3 — Ops bring-up.** Secrets vaulting (VAPID private = only unrecoverable one), backup verified green (artifact, 90-day retention), CF token rotated + deploy verified, branch protection ACTIVE on main (discovered two-account topology: gh=veersh16 non-admin, owner=vEEr6057, admin API 404s from CLI → applied via web UI).

**Arc 4 — Security review + discipline.** Full-app pass, DB state verified via read-only SQL. Headline finding HIGH-1: entire RLS boundary was dashboard-only, absent from migrations — live DB locked, but a fresh project (env-split/restore) would ship RLS-off + anon full grants = open DB. Also HIGH-2 (CLAUDE.md falsely said "no RLS"), MED-1 (unauth donations, no rate limit), MED-2 (CSP report-only), LOW-1/2. Shipped: #90 review + production-discipline §6 (RLS-in-migrations rule + periodic-review gate + 7-point checklist) · #93 (RLS reproduced in migration 0013, transcribed from live DB, validated via BEGIN/ROLLBACK) · #92 (Turnstile gate on donations + client-error flood guard + maps SSRF host-check) · #94 (wire Turnstile site key build var). MED-2 deferred to cutover canary.

**Arc 5 — Turnstile activation.** Owner created the Turnstile site (Managed mode, hostnames incl. workers.dev + rajyashfoundation.com + localhost), rotated the secret (it leaked into chat — flagged), set site key (build var, #94) + secret (corrected from a mistaken GitHub repo secret → Cloudflare Worker secret). Gate armed; activates when PAYMENTS_ENABLED goes on (waits on Razorpay KYC).

## Files Touched

- (all work landed via PRs #84–#94 — see Recent Commits; working tree clean on main)

## Git Diff Summary

```
(clean — all changes merged via PRs #84–#94)
```

## Recent Commits

```
655cfb0 chore(ci): wire NEXT_PUBLIC_TURNSTILE_SITE_KEY build var (MED-1) (#94)
58c1def fix(security): Turnstile gate on donations + client-error flood guard + maps-redirect SSRF check (#92)
5e31551 fix(db): put the RLS security boundary in a migration (0013) (#93)
802b783 docs(security): pre-launch security review + review discipline (§6) (#90)
49bc86a fix(ci): backup uses versioned pg_dump 17 binary (runner default 16 aborted on server 17.x) (#89)
```

## Commands Run

```bash
pnpm typecheck && pnpm lint && pnpm test:run          # green before every push (404/404 final)
pnpm audit --prod                                     # security review: 0 vulns
# supabase MCP read-only SQL: pg_class.relrowsecurity, pg_policies, role_table_grants
gh pr create / gh pr merge --squash --delete-branch   # PRs #84-#94
gh pr update-branch <n>                               # strict protection → re-validate after each merge
gh api repos/{owner}/{repo}/rules/branches/main       # branch-protection verification
gh workflow run backup.yml / deploy.yml               # secret + token end-to-end tests
curl .../api/health                                   # live smoke
```

## Problems and Fixes

- Problem: out-of-order `payment.failed` could overwrite a `paid` donation (multi-attempt UPI, distinct event ids defeat dedup).
  - Fix: `ne(status,'paid')` guard + param-walker test (#84).
- Problem: RLS boundary existed only in the Supabase dashboard, not in migrations → fresh project would ship wide-open.
  - Fix: migration 0013 reproduces exact live state (verified via SQL + BEGIN/ROLLBACK), #93. Lesson captured.
- Problem: backup workflow failed "server version mismatch (17.6 vs pg_dump 16.14)" despite installing client-17.
  - Fix: runner's preinstalled 16 shadows PATH; pinned `/usr/lib/postgresql/17/bin/pg_dump` (#89). Lesson captured.
- Problem: branch-protection + admin API 404s looked like token scope.
  - Fix: two GitHub accounts — gh=veersh16 (non-admin), owner=vEEr6057. Web UI as owner. Memory captured.
- Problem: stacked PR #91 auto-closed when its base branch was deleted on #90 merge.
  - Fix: recreated as #93 against main; strict protection forced branch-updates + CI re-runs before each merge.
- Problem: Turnstile secret added as a GitHub repo secret (wrong store — never reaches the Worker runtime).
  - Fix: corrected to a Cloudflare Worker secret; GitHub one is inert, delete it. Rule: NEXT_PUBLIC→build-time, server-secret→Worker secret.
- Problem: Turnstile secret pasted into chat (exposure).
  - Fix: user rotated it; only site key (public) stays wired.

## Decisions

- Stack audit verdict: keep everything; benchmark = dispatch platforms (Swiggy/Uber correctness patterns), not NGO sites — patterns verified present in code.
- Budget posture: not ₹0-forever — "reasonable" paid stages OK; END-GOAL = 4 opt-in stages.
- Sentry deferred → client-error sink (Workers Logs) as the timeboxed fallback.
- Developer attribution made structural (MIT LICENSE + AUTHORS + signed §7 + public-repo preference).
- Security-review discipline made a recurring GATE (production-discipline §6), not a one-off.
- MED-2 (CSP enforcing) deferred to the cutover canary (high blast radius).
- Retro: applied memory/github-account-topology + lessons gha-pgdump-version-shadowing + rls-boundary-lives-only-in-dashboard; corrections-this-session logged.

## Open Tasks

1. USER: decrypt-proof backup `db-backup-28724123429` (`gh run download` → `gpg -d` → `pg_restore --list`); log date in runbook drill table.
2. USER: delete `vault-draft-food-porter.txt` (Desktop + Recycle Bin); delete old Cloudflare token; delete the inert GitHub `TURNSTILE_SECRET_KEY` repo secret.
3. USER: UptimeRobot monitor on `/api/health`.
4. USER: co-founder meeting — present END-GOAL + production-cutover + RAZORPAY-KYC; collect the confirm-list answers.
5. Cutover execution (blocked on #4): 8-step plan in docs/production-cutover.md.
6. Dev Supabase project creation → apply migrations INCLUDING 0013 → verify anon key reads zero rows (the RLS reproducibility test).
7. MED-2: flip CSP report-only → enforcing on a canary deploy at cutover.
8. Review GU/HI copy flagged `_review: pending` (policies + renamed strings + donate errorVerify).
9. When Razorpay KYC clears: set PAYMENTS flags live → Turnstile widget renders on /donate → ₹1 end-to-end test.

## Resume Checklist

1. Re-open this note.
2. Verify branch: `git checkout main && git pull`
3. Run first validation command: `pnpm test:run` (expect 404 green) + `curl .../api/health`.
4. Continue from Open Tasks (items 4→5 = critical path to launch).

## Next Session Prompt

Use this in chat: "check last session" or "open session production-era-cutover-handover-6-prs".
