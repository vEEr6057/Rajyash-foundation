---
name: post-deploy-smoke
description: Use after every production deploy (merge to main firing deploy.yml, or wrangler rollback), or when asked to "smoke check" / verify the live site is up. Also after flipping any kill-switch flag back on.
---

# Post-deploy smoke check — Food Porter

## Overview
Executable form of the runbook's 2-minute post-deploy checklist. Catches what CI can't:
the deployed Worker actually serving. Automated probes first, browser pass second, manual
sign-in last (needs a human or stored test credentials).

**Base URL:** `https://rajyash-food-rescue.shahveerkeaten.workers.dev` until cutover;
`https://rajyashfoundation.com` after. Set `BASE` accordingly.

## Procedure

### 1. Automated probes (curl — no browser needed)
```bash
BASE=https://rajyash-food-rescue.shahveerkeaten.workers.dev
curl -s -m 20 $BASE/api/health        # PASS: {"ok":true,"ts":"<recent ISO timestamp>"}
curl -sI -m 20 $BASE/ | head -1       # PASS: HTTP/1.1 200 OK
curl -sI -m 20 $BASE/guide | head -1  # PASS: HTTP/1.1 200 OK
curl -sI -m 20 $BASE/donate | head -1 # PASS: 200 (or 404 ONLY if PAYMENTS kill switch is deliberately off)
```
Windows/Git-Bash gotcha (verified 2026-07-06): `curl -o /dev/null -w "%{http_code}"` returns
`000` in this sandbox — always use the `-sI … | head -1` form above.

### 2. Browser pass (playwright-cli skill)
Load `$BASE/` and one portal-adjacent public page; PASS = page renders (not a Worker error
page) and **zero console errors**. Console errors on phones are otherwise invisible — this is
the only pre-user check for them.

**URL-landing is NOT page-loaded** (bit us 3× on 2026-07-06): a middleware 403 keeps the
requested URL with a 9-char "Forbidden" body, and redirects land on plausible-looking pages.
Every route assertion = URL + content marker (`h1/h2` text + `body.innerText.length`) +
console count. Never report a route as working from the URL alone.

### 3. Signed-in pass (manual or with test credentials)
Sign in → portal dashboard loads → volunteer board renders pickups. No test credentials are
stored for the agent; if none provided, output step 3 as a checklist for the user — do NOT
silently skip and report full PASS.

### 4. Payments-touching deploys only
`/donate` loads; Razorpay checkout opens. Test mode: complete a ₹10 test donation and confirm
the webhook marks it paid. NEVER complete a live-mode donation as a test.

## On failure
Don't debug on prod first — roll back, then investigate:
```bash
npx wrangler rollback     # interactive; or: npx wrangler deployments list → rollback <version-id>
```
Rollback itself requires re-running this smoke check. If failure looks like a third-party
outage (Clerk/Supabase/Razorpay/Resend), consider the kill-switch env flags instead of a
deploy (see docs/runbook.md).

## Report format
One line per step: `PASS`/`FAIL <evidence>`/`SKIPPED (needs user) <what to check>`. Overall
verdict only when steps 1–2 pass and step 3 is either passed or explicitly handed to the user.
