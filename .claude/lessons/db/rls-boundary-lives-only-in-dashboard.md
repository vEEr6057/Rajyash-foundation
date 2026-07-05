# rls-boundary-lives-only-in-dashboard

**Date:** 2026-07-05 · **Topic:** db · **Severity:** HIGH · **Status:** verified

## The trap

The Supabase **anon** role (whose key ships in the client bundle, fully public) has DEFAULT
full grants — `SELECT/INSERT/UPDATE/DELETE` — on every `public` table. Row Level Security is the
ONLY thing preventing the public key from reading/writing every row. So RLS isn't a nice-to-have
here; it's the entire authorization boundary for direct-to-Postgres access.

## Non-obvious part

The live DB was fully correct — RLS enabled on all tables, scoped `authenticated` SELECT policies
on the browser-read ping tables, default-deny elsewhere, a hardened `SECURITY DEFINER` helper.
But **none of it was in a migration.** `grep` over `src/server/db/migrations/*.sql` found zero
`ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` / function DDL. It had been applied by hand in the
Supabase dashboard.

Why this is a latent breach, not a benign detail:
- **Drizzle does not manage RLS.** `drizzle-kit generate` never emits it; `drizzle-kit migrate`
  never recreates it.
- The env-split plan (create a fresh dev Supabase project) and any prod restore build schema
  FROM migrations → the new DB comes up with RLS **off** and anon full grants → the public anon
  key can read/write everything. A wide-open database that looks identical to the locked one.

## How to detect / fix

Detect (read-only, against the live DB — don't trust the code or the CLAUDE.md claim):
```sql
select relname, relrowsecurity from pg_class
  where relnamespace='public'::regnamespace and relkind='r';           -- RLS on?
select tablename, policyname, cmd, roles::text, qual from pg_policies
  where schemaname='public';                                           -- which policies?
select grantee, table_name, privilege_type from information_schema.role_table_grants
  where table_schema='public' and grantee in ('anon','authenticated'); -- the grants RLS must fight
```

Fix: hand-author a committed SQL migration reproducing the live setup exactly (RLS enable per
table + every policy + helper functions), reviewed in PR. Verify a fresh project: with only the
anon key, confirm reads return zero rows.

## Recall trigger

Any Supabase project using the anon/publishable key from the browser (Realtime, PostgREST). Before
creating a new project, restoring a backup, or trusting "RLS is on" — query the live DB, and
confirm the RLS layer is in a migration, not just the dashboard. Also: a `CLAUDE.md`/doc line
saying "no RLS" may be flat wrong — verify against the DB, not the doc.
