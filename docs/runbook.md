# Food Porter — Operations Runbook

Who this is for: whoever operates the app in production. Assumes access to the
foundation's Cloudflare, Supabase, Clerk, Razorpay, and GitHub accounts.
Discipline rules behind these procedures: [.claude/rules/production-discipline.md](../.claude/rules/production-discipline.md).

## Deploy

Deploys happen ONLY from CI: merge a PR into `main` → [deploy.yml](../.github/workflows/deploy.yml)
validates (typecheck/lint/tests) then builds on Linux and deploys to Cloudflare Workers.
Never `pnpm run deploy` from a laptop for prod (a Windows opennext build ships a Worker
that 500s — see `.claude/lessons/general/opennext-windows-build-middleware-500.md` — and
laptop deploys bypass validation).

Manual re-deploy of current `main`: GitHub → Actions → Deploy → Run workflow.

### Post-deploy smoke check (2 minutes, every deploy)

1. `GET /api/health` → `{ ok: true }`.
2. Load `/` — renders, no console errors.
3. Sign in → portal dashboard loads.
4. Open volunteer board — pickups list renders.
5. If the deploy touched payments: `/donate` loads; Razorpay checkout opens (test mode: complete a ₹10 test donation and confirm the webhook marks it paid).

### Rollback

```bash
npx wrangler rollback            # interactive: pick the previous Worker version
# or: npx wrangler deployments list  → note version → npx wrangler rollback <version-id>
```

Rollback restores the previous Worker BUNDLE — it does not undo DB migrations. If the bad
deploy included a migration, assess whether the old code runs against the new schema
(additive migrations: yes; destructive: restore from backup first — below).

Risky changes (auth, payments, claim path): use gradual deployment instead of all-at-once —
`npx wrangler versions upload` then `npx wrangler versions deploy` splitting traffic
(e.g. 10/90), watch logs, then promote to 100%.

## Incidents

### Triage order

1. `GET /api/health` — DB reachable?
2. Cloudflare dash → Workers → rajyash-food-rescue → Logs (3-day retention; every
   `logger.*` line is searchable JSON).
3. Supabase dash → project status (paused? disk? connections).
4. status pages: Cloudflare, Supabase, Clerk, Razorpay.

### Common failures

| Symptom | Likely cause | Action |
|---|---|---|
| Everything 500s after deploy | Bad build/env | `wrangler rollback`; check deploy logs |
| `/api/health` 503 | Supabase down or paused | Supabase dash; free tier: restore project (~30s wake) |
| Sign-in broken, rest works | Clerk outage/keys | Clerk status; verify Worker secrets unchanged |
| Donations failing, rest works | Razorpay/webhook | Razorpay dash → Webhooks → recent deliveries; replay failed events from there (idempotent — replays are safe by design) |
| Notifications silent | Inngest quota exhausted (jobs PAUSE at 50k/mo) or keys | Inngest dash usage; flip `NOTIFICATIONS_ENABLED` off if a channel is looping |
| One feature must be disabled NOW | — | Kill switches below |

### Kill switches (no deploy needed)

```bash
npx wrangler secret put PAYMENTS_ENABLED       # "0" = donate page + webhook go dark (404)
npx wrangler secret put NOTIFICATIONS_ENABLED  # "0" = dispatch layer no-ops (PR-B)
npx wrangler secret put INTAKE_ENABLED         # "0" = new pickups paused (PR-B)
```

Secrets apply to the running Worker without a rebuild. Flip back with "1".

### Payment disputes / reconciliation

The webhook is the single source of truth (`status: paid` written only there, HMAC-verified,
idempotent). To reconcile: Razorpay dashboard payment → `order_id` → `donations` row by
`razorpay_order_id`; `webhook_events` holds every processed event id. Amount-mismatch
errors (PR-B Task 2) appear in Worker logs as `razorpay amount mismatch`.

## Backups & restore

- Nightly 03:00 IST: GitHub Actions dumps the prod DB → encrypted artifact, 90-day
  retention (PR-A). Passphrase: foundation password manager.
- **Restore drill (quarterly, and before any destructive migration):** download artifact →
  `gpg -d backup.dump.gpg > backup.dump` → `pg_restore -d "$DEV_DIRECT_URL" --clean backup.dump`
  into the DEV project → spot-check tables. Log the drill date below.
- Real restore to prod: same, against prod `DIRECT_URL`, after `INTAKE_ENABLED=0` +
  `PAYMENTS_ENABLED=0` (freeze writes), then flags back on and full smoke check.

| Restore drill log | |
|---|---|
| _date_ | _who / result_ |

## Free-tier watchlist (check monthly, 1st of month)

| Service | Limit | Alarm at | Where to check |
|---|---|---|---|
| Resend | 100 emails/day, 3k/mo | sustained >60/day | Resend dash |
| Inngest | 50k executions/mo (PAUSES jobs after) | 35k | Inngest dash |
| Supabase DB | 500 MB | 350 MB | Supabase dash → Database |
| Workers | 100k req/day | 60k | Cloudflare dash |
| Supabase pause | 7 days inactivity | n/a — nightly backup is the keepalive | — |

Crossing an alarm = start the corresponding paid-stage conversation
([end-goal doc](FOOD-PORTER-END-GOAL.md)), not an emergency.

## Known limitations (by design — don't debug these as bugs)

- **Live tracking pauses when the driver's screen locks** (browser geolocation limit).
  Native app (Stage 4) is the fix. Drivers: keep screen on during active delivery.
- **iOS push requires install**: web-push on iOS only works after "Add to Home Screen".
- **Any volunteer can confirm a drop on an ACTIVE run** (DEL-02, deliberate — distribution
  is confirmed by whoever is present).
- **Role changes take up to ~1 min** to reach an already-signed-in user's session (Clerk
  JWT refresh). Deactivation is immediate (per-request DB check).
- **Free-tier Supabase wakes in ~30s** after a pause — first request may be slow/503.

## Contacts

- Foundation: rajyashfoundation@rajyashgroup.com · +91-9875041206
- Registrar: GoDaddy (domain rajyashfoundation.com) · Hosting: Cloudflare (foundation account)
