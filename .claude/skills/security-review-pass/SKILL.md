---
name: security-review-pass
description: Use before any launch/cutover milestone, before enabling live payments, and after any change touching auth, RLS/policies, payments, webhooks, middleware allowlist, or a new public route. Also when asked for a "security pass/review/audit" of this repo.
---

# Security review pass — Food Porter

## Overview
Executable form of `.claude/rules/production-discipline.md` §6's checklist. Every item is a
concrete command with a pass condition — run all of them; judgment only interprets results.
Findings → `docs/security/SECURITY-REVIEW-<date>.md`; any HIGH blocks the milestone.
(Origin: the 2026-07-05 review found the entire RLS layer was dashboard-only — HIGH-1. This
skill exists so that class of miss can't recur.)

## When to Use
- Before cutover/launch milestones; before flipping Razorpay to live mode.
- After changes to: auth flow, RLS/policies/grants, payment/webhook code, `src/middleware.ts`
  allowlist, or adding any public route/POST endpoint.
- NOT for: routine feature PRs with none of the above surfaces (CI + code review cover those).

## Procedure (all 7 — no skipping items that "obviously pass")

### 1. Dependencies + leaked secrets
```bash
pnpm audit --prod                    # PASS: "No known vulnerabilities found"
git log --all --oneline -- .env .env.local .env.production .env.development   # PASS: empty
grep -rEln "sk_live|rzp_live|whsec_|service_role|BEGIN (RSA )?PRIVATE KEY" src/
```
Grep PASS condition: hits only in `*.test.ts` fixtures with obviously-fake values (e.g.
`src/app/api/razorpay/webhook/route.test.ts`, `src/server/payments/razorpay.test.ts` — known,
expected). Any hit in non-test code or any real-looking value = HIGH.

### 2. RLS — live DB vs migrations (the crown jewel)
Query live DB via Supabase MCP (`mcp__supabase__execute_sql`, read-only):
```sql
-- every table must have rowsecurity = true
SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND relkind='r' ORDER BY relname;
-- every policy, with role scope
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname='public';
-- what anon/authenticated can even attempt
SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND grantee IN ('anon','authenticated') ORDER BY table_name;
```
PASS: every table `rowsecurity=true`; browser-read ping tables have `authenticated`-scoped
SELECT policies; everything else default-deny. THEN verify reproducibility: every policy seen
live also appears in a committed migration —
```bash
grep -l "ROW LEVEL SECURITY" src/server/db/migrations/*.sql   # expect 0013_rls_policies.sql, 0015_neat_la_nuit.sql (+ any newer)
```
A policy that exists live but in no migration = HIGH (dashboard-only boundary).

### 3. Ownership + public-route justification
For every server action / route handler taking an id: confirm it re-checks ownership (reads
AND deletes), and that authz values (user id, role, amounts, statuses) resolve server-side —
never from the request body. Sweep entry points:
```bash
grep -rn "export async function" src/server/actions/ src/app/api/ --include="*.ts" -l
```
Read each flagged file; this step is judgment, not grep-PASS. Then open `src/middleware.ts`
and re-justify every entry in the public allowlist (each has a comment saying why — a new
uncommented entry = finding).

### 4. Payments
HMAC verification constant-time; webhook idempotent (dedupe on provider event id in the same
transaction); amounts server-authoritative (never from client). Check `src/server/payments/`
+ `src/app/api/razorpay/webhook/`. Tests already encode the paid-downgrade guard — run:
```bash
pnpm test:run donations    # no "--" — pnpm+vitest ignores the filter after a double-dash and runs ALL 79 files
```

### 5. Injection/XSS
```bash
grep -rn "dangerouslySetInnerHTML\|eval(\|new Function" src/ | grep -v node_modules
```
PASS: no eval/new Function; every `dangerouslySetInnerHTML` renders static, non-user content.

### 6. Abuse gates
Every unauthenticated POST surface (donation order minting, `/api/client-error`,
`/api/csp-report`) carries a rate limit or Turnstile. List public POSTs from step 3's
allowlist + `src/app/api/`; verify each gate exists in code, not just in intent.

### 7. Headers
HSTS, `X-Frame-Options: DENY` (or frame-ancestors), nosniff, CSP mode (enforcing before the
real domain — report-only is telemetry, not defense). Check `next.config.*` / middleware
response headers; confirm no secrets in logger output paths.

## Output
Write `docs/security/SECURITY-REVIEW-<YYYY-MM-DD>.md`: one section per item, PASS/finding,
severity (HIGH/MED/LOW), and the exact command/query output that proves it. HIGH = milestone
blocked until fixed. Present summary in chat; do not push/commit unless asked.

## Common Mistakes
| Mistake | Fix |
|---|---|
| Trusting dashboard RLS state | Step 2's migration cross-check is the point — live AND committed |
| Grep-only ownership check | Step 3 requires reading the handlers; grep only finds them |
| Skipping items that passed last time | Surfaces change; run all 7 every pass |
| Fixing findings silently mid-review | Record finding first, fix after — the report is the audit trail |
