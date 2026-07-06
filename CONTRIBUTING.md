# Contributing to Food Porter

Thanks for helping the Rajyash Foundation's food-rescue platform. This is a small,
production NGO app — the bar is "would you trust this with donor money and volunteer PII".

## Ground rules

- **Read first:** [.claude/rules/frontend-practices.md](.claude/rules/frontend-practices.md),
  [.claude/rules/testing-practices.md](.claude/rules/testing-practices.md),
  [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md), and — for anything touching
  data, payments, auth, or availability —
  [.claude/rules/production-discipline.md](.claude/rules/production-discipline.md).
- **Branch + PR always.** `main` is protected; branch names follow
  `feature/…`, `fix/…`, `perf/…`, `refactor/…`, `chore/…`. Conventional commits
  (`type(scope): message`).
- **One topic per PR.** Description must match the diff; surprise scope blocks review.

## Definition of done

`pnpm typecheck` + `pnpm lint` + `pnpm knip` + `pnpm test:run` + `pnpm build` all green,
plus:

- Touched user-facing strings? All three locales (EN/GU/HI) —
  `node .claude/skills/i18n-parity/check.mjs` must pass.
- Touched auth/RLS/payments/public routes? The security checklist in
  `.claude/rules/production-discipline.md` §6 applies.
- New migration? Reviewed SQL in the PR (never `drizzle-kit push`); squawk lint runs in CI.

## Security

Vulnerabilities → [SECURITY.md](SECURITY.md), not a public issue.

## Contact

rajyashfoundation@rajyashgroup.com
