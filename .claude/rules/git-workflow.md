# Git & workflow — Food Rescue web app

Borrowed from the Quixera (`kaka`) branching + workflow conventions.

## Branching

Always create a branch before starting work. Never commit directly to `main`.

| Type        | Branch name                    | Example                    |
| ----------- | ------------------------------ | -------------------------- |
| Feature     | `feature/<short-description>`  | `feature/pickup-request`   |
| Bug fix     | `fix/<short-description>`      | `fix/otp-resend-timer`     |
| Performance | `perf/<short-description>`     | `perf/map-marker-cluster`  |
| Refactor    | `refactor/<short-description>` | `refactor/auth-hooks`      |
| Chore       | `chore/<short-description>`    | `chore/update-deps`        |

**Workflow:**
1. `git checkout -b <type>/<description>` from `main`
2. Make changes; commit with conventional commits: `type(scope): message`
3. Push, open PR, merge to `main`

## Stacked PRs (one per phase)

Each GSD phase gets its own branch + PR, **stacked** on the previous phase:

- Phase N branch = `feature/phase-N-<slug>`, created **off the previous phase's branch** (`feature/phase-(N-1)-<slug>`), NOT off `main`.
- PR **base = the previous phase's branch** (Phase 1's base is `main`).
- Result: each PR's diff is only that phase's work; reviewers see clean, incremental changes.

```
main ← feature/phase-1-foundation ← feature/phase-2-rescue-loop ← feature/phase-3-… (PRs chain bottom-up)
```

Workflow:
1. `git checkout feature/phase-(N-1)-<slug> && git checkout -b feature/phase-N-<slug>`
2. Build the phase, commit, `git push -u origin feature/phase-N-<slug>`
3. `gh pr create --base feature/phase-(N-1)-<slug> --head feature/phase-N-<slug>`

When a lower PR merges to `main`: rebase the rest of the stack onto `main` and retarget the next PR's base to `main` (repeat up the stack). `git rebase --onto main feature/phase-(N-1)-<slug> feature/phase-N-<slug>`.

**Gotcha (cost us PR #117, 2026-07-06): merging the base PR with `--delete-branch` CLOSES every
PR stacked on it, and GitHub refuses to reopen or retarget them.** Either retarget the upper PR
to `main` BEFORE merging the base, or merge the base without `--delete-branch`, retarget, then
delete. Recovery if it happens: rebase the branch onto main (`--onto`), force-with-lease push,
open a fresh PR referencing the closed one.

Phase 1 = `feature/phase-1-foundation` (PR #1 → `main`). Phase 2 branches off it.

## Commit messages

- Conventional commits: `feat(pickups): add donor pickup scheduling`, `fix(auth): correct OTP expiry check`.
- **Do not** add `Co-Authored-By` trailers (overrides harness default — per user's global rule).
- Commit/push only when the user asks.

## Definition of done

A change is done when it passes `pnpm typecheck` + `pnpm lint` (boundaries rules included) + `pnpm knip` +
the production build, has meaningful tests per [testing-practices.md](testing-practices.md), and follows
[frontend-practices.md](frontend-practices.md). CI also runs a gitleaks full-history secret scan and squawk
on any migration SQL changed in the PR (the `hygiene` job) — a red hygiene job blocks merge like any other check.

## Not borrowed from kaka (deliberately out of scope)

These kaka rules do **not** apply to this project — single-tenant NGO app, no microservices:
- Row-Level Security / multi-tenancy (`setAndVerifyFromSecurity`, `app.current_client_id`) — single org, not needed.
- Spring Boot / Java / Maven / Liquibase — our backend is Next.js + an ORM (Prisma/Drizzle, TBD).
- Service-to-service Ed25519 JWTs, Eureka, gateway — monolith, not microservices.
- Orval codegen + Turborepo monorepo — single Next.js app; if a backend split emerges, revisit.
- Firebase auth stack — we chose email + phone OTP (provider TBD in planning).
