---
id: rawsql-date-params-workers
topic: db
severity: medium
status: verified
tags: [drizzle, postgres-js, raw-sql, date, parameters, ERR_INVALID_ARG_TYPE]
related-files: [src/server/db/repositories/stats.ts]
created: 2026-07-07
verified-by: repro test failed with Date param, passed after toISOString() + ::timestamptz
---

## Symptom
`db.execute(sql\`... where delivered_at >= ${someDate} ...\`)` throws
`TypeError [ERR_INVALID_ARG_TYPE]: The "string" argument must be of type string ... Received an
instance of Date` — wrapped by drizzle as an opaque "Failed query" (read `e.cause` for the real
error).

## Root cause
Drizzle's query BUILDER serializes `Date` per column type, but raw `sql\`\`` template params
have no column info — the Date object hits postgres.js' serializer unconverted.

## Verified fix
Pass strings and cast in SQL: `${d.toISOString()}::timestamptz`.

## Tripwire
Any raw `sql\`\`` with a Date param. Also: drizzle errors bury the postgres error in `e.cause` —
log/print the cause, not just the message.
