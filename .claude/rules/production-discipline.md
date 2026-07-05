# Production discipline — Food Porter

Binding engineering practices from the moment the app serves rajyashfoundation.com.
Anchored to the end goal in [docs/FOOD-PORTER-END-GOAL.md](../../docs/FOOD-PORTER-END-GOAL.md):
a donor-funded, donor-trusted platform the foundation runs for years. Every rule below exists
because breaking it would lose real data, real money, or real trust.

## 1. Data safety (donor/volunteer/recipient PII + rescue records)

- **Nightly automated backup** — GitHub Actions cron runs `pg_dump` → encrypted artifact
  (90-day retention). Until Supabase Pro (Stage 3), this is the ONLY backup that exists.
  Quarterly: actually restore one into a scratch DB (an untested backup is a hope, not a backup).
- **Migrations, never push** — schema changes via `drizzle-kit generate` → SQL file committed
  and reviewed in the PR → applied with `db:migrate`. `drizzle-kit push` against the prod
  database is banned (it can drop columns silently). Guard hook blocks it.
- **Environment split** — dev work happens against the dev Supabase project. The prod
  `DATABASE_URL` lives only in GitHub/Worker secrets — never in `.env.local`, never on a laptop.
- **No prod data on laptops** — no prod dumps for local debugging. Donor, volunteer, and
  recipient data is PII; debug with the dev DB + synthetic data.

## 2. Correctness (the dispatch-platform guarantees — preserve them)

These already exist in code and are load-bearing; changes must keep them, and new features must
follow them:

- **Status transitions are server-enforced and audited** — never `UPDATE … SET status` directly;
  go through the transition path that records `statusEvents` (from, to, actor). New lifecycle
  states extend the state machine, they don't bypass it.
- **Mutations that dispatch are atomic** — the claim pattern (`claimIfAvailable`-style
  conditional update, row returned or conflict) is the template for any new "first one wins"
  operation.
- **Idempotency is mandatory** — webhooks dedupe on provider event id inside the same
  transaction as the mutation (Razorpay pattern); emitted events carry a deterministic
  `eventId`. Any new webhook or job follows suit.
- **Ownership ≠ role** (ported from kaka `guardian-idor.md`) — a role check proves the caller
  is *a* volunteer/donor/admin, not that they own *this* record. Every server action taking an
  id re-checks ownership, **including reads and deletes**. Values that drive authorization or
  money (user id, role, amounts, statuses) are resolved server-side from the session/DB — never
  accepted from the request body.
- **Forensic fields are real** — donation records are financial documents. IP, user agent, and
  timestamps on receipts come from the actual request; never null, never a hardcoded literal.

## 3. Availability (partners plan around this service)

- **`/api/health`** reports per-dependency status (DB, auth, payments); UptimeRobot checks it
  every 5 minutes and emails on failure.
- **Kill switches** — env-flag gates for donations, notifications, and new-pickup intake. A
  third-party incident is handled by flipping a flag, not by an emergency deploy.
- **Degrade, don't die** — a third-party outage (Clerk, Supabase, Razorpay, Resend) must never
  500 a whole page. Feature shows its own "temporarily unavailable" state; the rest of the app
  works.
- **Error visibility** — Sentry (free tier) on client and server. Volunteers' phone-browser
  errors are invisible in Worker logs; Sentry is the only place they surface.
- **Notifications** — web-push is the primary channel (free, unlimited); email is secondary
  (Resend: 100/day cap). All sends go through the dispatch layer (`src/server/notifications/`),
  which is the seam where WhatsApp (Stage 2) plugs in — never call a provider SDK directly from
  a feature.

## 4. Change management (how code reaches production)

- **`main` is protected** — no direct pushes; PR with green CI required to merge.
- **PR CI ≠ deploy CI** — `ci.yml` runs typecheck + lint + tests + build on every PR;
  `deploy.yml` deploys only from `main`. A PR that would break the deploy fails *before* merge.
- **Deploys happen only from CI** — never from a laptop (`pnpm run deploy` locally is banned for
  prod; the Windows-build Worker-500 lesson is one reason, uniformity is the other).
- **PR discipline** (ported from kaka `pr-discipline.md`) — one spec/topic per PR; no surprise
  scope (commits not described in the body block review); description must match the diff;
  size a single reviewer can read in one sitting.
- **Post-deploy smoke check** — after every deploy: load home, sign in, open portal board,
  check `/api/health`. Two minutes; catches what CI can't (per runbook checklist).
- **Risky changes roll out gradually** — Workers gradual deployments (% traffic) for anything
  touching auth, payments, or the claim path; `wrangler rollback` is the undo (runbook).

## 6. Security (the RLS boundary is the crown jewel)

- **RLS lives in migrations, never only in the dashboard.** Supabase's anon role has default
  FULL table grants — RLS is the *only* thing between the public anon key (in the client bundle)
  and every row. That protection MUST be reproducible: `ENABLE ROW LEVEL SECURITY`, every
  `CREATE POLICY`, and any `private.*` helper function live in a committed SQL migration, reviewed
  in the PR. A boundary that exists only in the live DB is one `drizzle-kit migrate` (new dev
  project, prod restore) away from a wide-open database. Drizzle does NOT manage RLS — hand-author
  the SQL migration. **Verify a fresh project: sign in as nobody, confirm the anon key reads zero
  rows.** (Pre-launch review 2026-07-05 found the entire RLS layer was dashboard-only — HIGH-1.)
- **Public endpoints need an abuse gate, not just auth.** Any unauthenticated mutating surface
  (donation order minting, error/CSP sinks) carries a rate limit or Cloudflare Turnstile — free
  tiers turn a flood into a DoS + quota-burn. Keep genuinely-public flows public (Turnstile, not
  login).
- **CSP enforcing before the real domain.** Report-only is a telemetry mode, not a defense.
- **Periodic security review is a gate, not a favor.** Run the full pass (below) before any
  launch/cutover, before enabling payments live, and after any change to auth, RLS, payments, or a
  new public route. Findings → `docs/security/SECURITY-REVIEW-<date>.md`; HIGH blocks the milestone.

  **Review checklist** (each a concrete check, not a vibe):
  1. `pnpm audit --prod` clean; `git log --all -- .env*` empty; no live keys in `src` grep.
  2. RLS: query the live DB (`pg_class.relrowsecurity`, `pg_policies`, anon/authenticated grants) —
     confirm every browser-read table has a scoped policy and everything else is default-deny; and
     that all of it is in a migration.
  3. Every server action taking an id re-checks ownership (reads + deletes), authz values
     server-resolved. Every public route re-justified in the middleware allowlist.
  4. Payments: HMAC constant-time, webhook idempotent, amounts server-authoritative.
  5. Injection/XSS: no `eval`/`new Function`; every `dangerouslySetInnerHTML` is static.
  6. Abuse: every public POST has a rate/Turnstile gate. Signed-URL paths server-composed.
  7. Headers: HSTS, frame-deny, nosniff, CSP mode. Secrets not logged.

## 5. Vendors & operations

- **Foundation owns everything** — every account (Cloudflare, Supabase, Clerk, GitHub org,
  Razorpay, Resend, Inngest, Sentry, UptimeRobot) on the foundation email with 2FA; developers
  are members/operators. No platform account on a personal email.
- **Free-tier watchlist** — monthly check against thresholds: Resend (100/day — alarm at
  sustained >60), Inngest (50k executions/month — alarm at 35k; it PAUSES jobs when exhausted),
  Supabase DB size (500MB — alarm at 350MB), Workers requests (100k/day — alarm at 60k).
  Crossing a threshold triggers the corresponding paid-stage conversation, not a scramble.
- **Runbook is maintained** — `docs/runbook.md` holds deploy/rollback/incident/smoke/restore
  procedures and known limitations. If an incident teaches something, the runbook (or a lesson
  in `.claude/lessons/`) captures it.

## Definition of done (prod era)

A change is done when: CI green (typecheck, lint, tests, build) · rules §2 patterns followed ·
reviewed via PR · deployed by CI · smoke check passed. For schema changes: migration file
reviewed + applied + backup verified after — and if the change touches RLS/policies/grants, the
SQL is IN the migration (§6), not the dashboard.
