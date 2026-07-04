#!/usr/bin/env bash
# PreToolUse guard (production-discipline §1): block `drizzle-kit push` / db:push
# unless explicitly allowed. Push can silently DROP columns; prod schema changes go
# through generated, reviewed migrations (`pnpm db:generate` → PR → `pnpm db:migrate`).
#
# Escape hatch for local dev DB iteration: prefix the command with ALLOW_DB_PUSH=1.

input=$(cat)

# Extract the Bash tool's command string from the hook payload.
cmd=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)

case "$cmd" in
  *ALLOW_DB_PUSH=1*) exit 0 ;;
esac

case "$cmd" in
  *"drizzle-kit push"* | *"pnpm db:push"* | *"pnpm run db:push"* | *"npm run db:push"* | *"yarn db:push"*)
    echo "BLOCKED by production-discipline §1: 'drizzle-kit push' can silently drop columns." >&2
    echo "Prod schema changes: pnpm db:generate -> commit the SQL migration -> PR -> pnpm db:migrate." >&2
    echo "Dev-DB-only escape hatch: prefix the command with ALLOW_DB_PUSH=1 (never against prod)." >&2
    exit 2
    ;;
esac

exit 0
