# Food Rescue Lessons — INDEX

Format (newest first, ≤200 lines):
`- [YYYY-MM-DD topic/SEVERITY/status] short-id — one-line summary`

**Capture bar:** only a NON-obvious fix that cost real debugging time — a gotcha, a silent failure
mode, a non-intuitive root cause. Bar = "future-me would re-hit this and waste an hour."

**Do NOT capture:** restatements of conventions/invariants — those live in `CLAUDE.md` +
`.claude/rules/*.md` and are injected by the `prompt-context` hook. A lesson that duplicates an
invariant is noise and gets pruned.

Topics: `frontend` · `forms` · `auth` · `payments` · `maps-tracking` · `notifications` · `db` · `testing` · `general`

Caps: 20 lessons/session (overflow → `INDEX-pending.md`); 200 lines in INDEX (oldest → `INDEX-archive.md`).

---

- [2026-06-28 general/MEDIUM/verified] gh-run-watch-exit-vs-conclusion — `gh run watch | tail; echo $?` reports tail's exit (0), not the run's → falsely "deployed"; a constant-pinned test (manifest theme_color === hex) failed CI → deploy step skipped → live stayed on old build. Confirm via `gh run view --json conclusion`; verify the deployed `/_next/static/css/*.css` for the new hex; run full test:run before merging value changes → general/gh-run-watch-exit-vs-conclusion.md
- [2026-06-27 general/HIGH/verified] opennext-windows-build-middleware-500 — `pnpm run deploy` from Windows → live Worker 500s with `Dynamic require of "/.next/server/middleware-manifest.json"`; opennext's aws-core next-server patcher fails on Windows builds (NOT secrets/Serwist/i18n/versions). Fix: build the .open-next on Linux/WSL then `wrangler deploy`; move prod deploys to Linux CI → general/opennext-windows-build-middleware-500.md
- [2026-06-26 testing/LOW/verified] admin-e2e-promote-clerk-role — admin role = Clerk publicMetadata (claim), NOT profiles.role; seed via Clerk Backend API (node has net) + fresh sign-in; getSession's deactivate DB-read must be try/catch fail-open + tests must mock profilesRepo → testing/admin-e2e-promote-clerk-role.md
- [2026-06-26 notifications/HIGH/verified] inngest-v4-api-and-dev-mode — Inngest v4: createFunction(options,handler) 2-arg w/ triggers+idempotency in options, no EventSchemas; explicit signingKey ⇒ prod mode ("Cannot deploy localhost") → set INNGEST_DEV=1 for local inngest-cli dev (never in prod) → notifications/inngest-v4-api-and-dev-mode.md
- [2026-06-26 general/MEDIUM/verified] inngest-dev-flood-corrupts-next — inngest-cli dev probe flood (/api/inngest etc.) + stale .next → `Cannot find module vendor-chunks/@clerk` → server actions silently 200-fail (look like a hang); stop flood + `rm -rf .next` → general/inngest-dev-flood-corrupts-next.md
- [2026-06-26 testing/LOW/verified] clerk-programmatic-test-signin — drive Clerk sign-in via `window.Clerk.client.signIn` + test code 424242 + setActive (not the fragile UI); signOut before switching accounts; grant geolocation per-origin → testing/clerk-programmatic-test-signin.md
- [2026-06-26 auth/LOW/verified] clerk-redirect-env-vars-deprecated — AFTER_SIGN_UP_URL env ignored by Clerk v6+ (redirects to /); use `forceRedirectUrl` prop on <SignUp/>/<SignIn/> → auth/clerk-redirect-env-vars-deprecated.md
- [2026-06-26 auth/HIGH/verified] clerk-no-india-phone-otp — Clerk can't OTP Indian numbers; no free India SMS exists; v1 = email + Google OAuth, phone optional/unverified; later use Fast2SMS (no DLT) not MSG91 → auth/clerk-no-india-phone-otp.md
- [2026-06-26 general/MEDIUM/verified] stale-next-after-opennext-build — `pnpm dev` "Cannot find module vendor-chunks/..." after a deploy/build; dev+prod share .next → `rm -rf .next` then dev → general/stale-next-after-opennext-build.md
- [2026-06-25 general/MEDIUM/verified] create-next-app-into-existing-planning-repo — scaffold into a temp dir + copy in (create-next-app blocks on existing .planning/.claude/tokens; Windows mv perm fails; @latest=Next 16, pin @15) → general/create-next-app-into-existing-planning-repo.md
