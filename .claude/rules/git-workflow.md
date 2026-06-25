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

## Commit messages

- Conventional commits: `feat(pickups): add donor pickup scheduling`, `fix(auth): correct OTP expiry check`.
- **Do not** add `Co-Authored-By` trailers (overrides harness default — per user's global rule).
- Commit/push only when the user asks.

## Definition of done

A change is done when it passes `pnpm typecheck` + `pnpm lint` + the production build, has meaningful tests per
[testing-practices.md](testing-practices.md), and follows [frontend-practices.md](frontend-practices.md).

## Not borrowed from kaka (deliberately out of scope)

These kaka rules do **not** apply to this project — single-tenant NGO app, no microservices:
- Row-Level Security / multi-tenancy (`setAndVerifyFromSecurity`, `app.current_client_id`) — single org, not needed.
- Spring Boot / Java / Maven / Liquibase — our backend is Next.js + an ORM (Prisma/Drizzle, TBD).
- Service-to-service Ed25519 JWTs, Eureka, gateway — monolith, not microservices.
- Orval codegen + Turborepo monorepo — single Next.js app; if a backend split emerges, revisit.
- Firebase auth stack — we chose email + phone OTP (provider TBD in planning).
