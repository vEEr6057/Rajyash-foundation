# agent-worktrees-pollute-test-and-lint

**Date:** 2026-07-05 · **Topic:** general · **Severity:** MEDIUM · **Status:** verified

## Symptom (hit TWICE in one session, same root cause)

While orchestrating `isolation: worktree` sub-agents, the root checkout's tooling started
failing on files that aren't ours:

- `pnpm test:run` → 6 "phantom" failures in `.claude/worktrees/agent-*/src/server/notifications/dispatch.test.ts` (each agent worktree is a full checkout, so its copy of every test got collected and run against the root setup).
- `pnpm lint` → 35 `no-require-imports` errors at line 1, column 5000+ — i.e. eslint linting `.claude/worktrees/agent-*/.next/server/app/**/*.js` (a leftover `.next` build inside a worktree an agent ran `pnpm build` in).

Both looked like real regressions in the code under review; both were zero real failures.

## Root cause

A git worktree is a complete second checkout. Agents that `pnpm build` or leave `node_modules`
there create `.next`/build artifacts. Vitest's default `include` and ESLint's flat-config both
walk the whole tree, so anything under `.claude/worktrees/**` gets swept in. On Windows the
worktree dirs also can't always be `rm`'d immediately (node holds file handles), so they linger.

## Fix (do this up front in any repo you'll run worktree agents in)

- **vitest.config.ts:** pin `include: ["src/**/*.test.{ts,tsx}"]` and `exclude: ["**/node_modules/**", ".claude/**"]`.
- **eslint flat config:** add `".claude/**"` to `ignores` (next to `.next/**`).
- Any other file-walking tool (prettier, tsc project globs, a custom script) gets the same
  `.claude/**` exclusion.

## Recall trigger

Before/at the start of any multi-agent (`isolation: worktree`) run in a repo whose test/lint
configs don't already exclude `.claude/**`. Cheaper to add the two ignores first than to debug
phantom failures mid-review. Verify: `pnpm test:run` and `pnpm lint` on the integration branch
are clean *before* trusting an agent's "all green" (they lint/test only their own worktree).
