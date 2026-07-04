# PR-A — Production discipline infrastructure

Branch: `chore/prod-discipline-infra` → `main`.
Everything here is CI/config — no app-code behavior changes. Execute tasks in order; each
task is one commit. Rules context: [.claude/rules/production-discipline.md](../../.claude/rules/production-discipline.md).

## Task 1 — PR-level CI (`.github/workflows/ci.yml`)

New workflow, triggers on `pull_request` (all branches). Jobs mirror the validate steps of
[deploy.yml](../../.github/workflows/deploy.yml) EXACTLY (same pnpm/node versions, same
`SKIP_ENV_VALIDATION: "1"`, same `NEXT_PUBLIC_*` env block from repo secrets) but stop
before deploy — final step is `pnpm build` (plain `next build` is enough to catch build
breaks; opennext packaging is deploy-only). Steps: checkout → pnpm setup → node 22 + cache
→ `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test:run` →
`pnpm build`. Name the job `validate` (branch protection references it).

## Task 2 — Nightly DB backup (`.github/workflows/backup.yml`)

- Trigger: `schedule: cron "30 21 * * *"` (= 03:00 IST) + `workflow_dispatch`.
- Runner: ubuntu-latest. Install client: `sudo apt-get install -y postgresql-client-17`
  (pg_dump 17 handles older servers; if apt lacks 17, use the postgres apt repo).
- Dump: `pg_dump "$DIRECT_URL" -Fc -f backup.dump` using a new repo secret `DIRECT_URL`
  (the Supabase DIRECT connection string, port 5432 — NOT the pooled 6543 URL; pg_dump
  needs a direct connection).
- Encrypt: `gpg --batch --symmetric --passphrase "$BACKUP_PASSPHRASE" backup.dump`
  (new secret `BACKUP_PASSPHRASE`; store a copy of the passphrase in the foundation's
  password manager — an encrypted backup nobody can decrypt is not a backup).
- Upload: `actions/upload-artifact` with `retention-days: 90`, name `db-backup-<date>`.
- This job doubles as the Supabase free-tier keepalive (a dump IS database activity).
- Also add `docs/runbook.md` §restore already describes the restore drill — keep in sync.

## Task 3 — Branch protection on `main`

One-time `gh` call (document it in the PR body; run after CI merges so the check exists):

```bash
gh api -X PUT repos/vEEr6057/Rajyash-foundation/branches/main/protection \
  -F required_status_checks[strict]=true \
  -F "required_status_checks[contexts][]=validate" \
  -F enforce_admins=true \
  -F required_pull_request_reviews[required_approving_review_count]=0 \
  -F restrictions=null
```

(0 required approvals — solo maintainer; the gate is green CI + no direct pushes.)

## Task 4 — Guard `db:push`

`.claude/settings.json`: add a `PreToolUse` hook (matcher: Bash) running a small
`.claude/hooks/guard-db-push.sh` that blocks any command containing `drizzle-kit push`
or `db:push` unless `ALLOW_DB_PUSH=1` is set in the command env, printing WHY (prod uses
migrations; push can silently drop columns). Also edit `package.json`: rename `db:push`
→ `db:push:dev` so muscle memory breaks.

## Task 5 — Env split (docs + config, manual steps listed in PR body)

- Create the dev Supabase project (2nd free project) — manual, dashboard.
- `.env.example`: comment header stating `.env.local` must ONLY ever hold dev-project
  URLs; prod secrets live in GitHub Actions secrets + `wrangler secret` exclusively.
- Verify `drizzle.config.ts` reads `DIRECT_URL`/`DATABASE_URL` from env only (no fallback
  to a hardcoded string).

## Definition of done

CI green on the PR itself (proves Task 1 works); backup workflow run once manually via
workflow_dispatch and the artifact downloaded + decrypted + `pg_restore --list` succeeds;
branch protection verified by attempting a direct push (must be rejected).
