# security-definer-empty-searchpath-needs-qualified-enums

**Date:** 2026-07-05 · **Topic:** db · **Severity:** MEDIUM · **Status:** verified

## Symptom

Applying migration 0014 (agent-authored, reviewed, all 424 unit tests green) failed at the
database with:

```
ERROR: 42704: type "pickup_status" does not exist
LINE …: p.status = 'en_route'::pickup_status
```

## Root cause (non-obvious part)

The function is `SECURITY DEFINER SET search_path TO ''` (the Supabase-recommended hardening
for RLS helper functions). With an EMPTY search_path, *nothing* resolves unqualified — not
tables (those were already written `public.pickups`) and **not enum types either**. The enum
cast must be `'en_route'::public.pickup_status`. Tables get qualified by habit; enum casts are
the part everyone forgets, because in every other context the bare cast works.

**Unit tests can never catch this** — migration SQL is not executed by vitest. The bug survives
typecheck, lint, 424 green tests, and code review; it only surfaces when the SQL actually runs.

## Fix / prevention

1. Inside any `SET search_path TO ''` function, schema-qualify **every** identifier: tables,
   functions, AND `::public.<enum>` casts.
2. **Always validate a migration against the live DB inside `BEGIN … ROLLBACK` before merging
   or applying** (via the Supabase MCP `execute_sql`). This is what caught it: the dry-run
   errored, zero production impact, fix applied in the same sitting. Green tests are NOT
   evidence a migration runs.

## Recall trigger

Writing/reviewing any Postgres function with `SECURITY DEFINER` + empty `search_path`
(all RLS helpers in this project), or any hand-authored migration touching enums. Also: when an
agent authors migration SQL — the orchestrator's BEGIN/ROLLBACK dry-run is the real gate.
