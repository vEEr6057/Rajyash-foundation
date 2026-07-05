# gha-pgdump-version-shadowing

**Date:** 2026-07-05 · **Topic:** general · **Severity:** MEDIUM · **Status:** verified

## Symptom

First run of the nightly backup workflow failed at the dump step:

```
pg_dump: error: aborting because of server version mismatch
pg_dump: detail: server version: 17.6; pg_dump version: 16.14 (Ubuntu 16.14-1.pgdg24.04+1)
```

— even though the workflow's install step had just installed `postgresql-client-17` from the
pgdg apt repo, successfully.

## Root cause (non-obvious part)

The ubuntu-latest runner PREINSTALLS postgresql-client-16, and installing `postgresql-client-17`
does NOT put pg_dump 17 first on PATH — `/usr/bin/pg_dump` (the postgresql-common wrapper /
default alternative) keeps resolving to 16. The install "succeeds", the workflow looks correct,
and the failure only appears at runtime against a 17.x server.

## Fix

Call the versioned binary explicitly — never bare `pg_dump` in CI:

```yaml
run: /usr/lib/postgresql/17/bin/pg_dump "$DIRECT_URL" -Fc --no-owner --no-privileges -f backup.dump
```

(Applied in PR #89; verified by a green re-dispatch producing the artifact.)

## Recall triggers

Any GitHub Actions job using postgres client tools (`pg_dump`, `pg_restore`, `psql`) against a
Supabase/managed Postgres — check the server major version and pin the matching
`/usr/lib/postgresql/<major>/bin/` path. Supabase upgrades majors under you; when the server
becomes 18.x this same failure returns until the path is bumped.
