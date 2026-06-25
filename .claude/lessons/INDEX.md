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

- [2026-06-26 auth/LOW/verified] clerk-redirect-env-vars-deprecated — AFTER_SIGN_UP_URL env ignored by Clerk v6+ (redirects to /); use `forceRedirectUrl` prop on <SignUp/>/<SignIn/> → auth/clerk-redirect-env-vars-deprecated.md
- [2026-06-26 auth/HIGH/verified] clerk-no-india-phone-otp — Clerk can't OTP Indian numbers; no free India SMS exists; v1 = email + Google OAuth, phone optional/unverified; later use Fast2SMS (no DLT) not MSG91 → auth/clerk-no-india-phone-otp.md
- [2026-06-26 general/MEDIUM/verified] stale-next-after-opennext-build — `pnpm dev` "Cannot find module vendor-chunks/..." after a deploy/build; dev+prod share .next → `rm -rf .next` then dev → general/stale-next-after-opennext-build.md
- [2026-06-25 general/MEDIUM/verified] create-next-app-into-existing-planning-repo — scaffold into a temp dir + copy in (create-next-app blocks on existing .planning/.claude/tokens; Windows mv perm fails; @latest=Next 16, pin @15) → general/create-next-app-into-existing-planning-repo.md
