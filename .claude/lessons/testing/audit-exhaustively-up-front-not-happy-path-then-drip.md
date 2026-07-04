# "Audit everything" = exhaustive code-sweep of the missed CLASSES up front, not a happy-path screenshot audit

**2026-07-04 · testing/HIGH/verified**

## Symptom
Asked to "test all workflows e2e, everything, all cases", I ran a screenshot/happy-path Playwright
audit (render each page × theme × locale; drive the happy path). It reported the app "clean". Then
the user kept surfacing gaps one at a time — "did you check the sign-in redirect?", "is that it?",
"there must be cases e2e missed", and finally **"the more times i ask new gaps show up why dont you
just do one sweep for all"**. Five+ turns of drip instead of one complete answer.

## Root cause
A happy-path / screenshot E2E is structurally BLIND to whole gap classes:
- **Auth redirect flows** — the audit signed in *programmatically* (`window.Clerk.setActive` + manual
  navigate), which bypasses the real post-login redirect entirely.
- **Authorization boundaries** — signed-out → protected route, cross-role (donor→/admin), IDOR.
- **Server-guard ↔ UI-guard parity** — a mutation the server rejects (closed-run stop edits, B4
  guards) whose UI still shows the control → CONFLICT toast on click.
- **i18n completeness** — hardcoded English strings / date formatters that a same-locale screenshot
  never flags (only a code grep finds every one; the visible ones are the tip).
- **Negative/edge paths** — invalid transitions, silent failures, soft-404 status codes, missing tz pins.

Screenshots + happy-path prove the *common case renders*; they cannot prove the *guards, negatives,
and completeness*. Those live in the code, not the pixels.

## Fix / the move
When the ask is "audit everything / find all the gaps", do an **exhaustive CODE sweep of the missed
classes FIRST**, in one pass, and return the complete file:line list — THEN fix. The five classes to
sweep every time:
1. server-guard↔UI-guard parity (every guarded action → is its UI control hidden/disabled in the
   reject state?)
2. hardcoded user-facing English (grep JSX/`aria-label`/`toast`/`placeholder`/`Intl.DateTimeFormat("en-…")`)
3. soft-404 / wrong HTTP status (opennext `notFound()` returns 200; flag/gate cases should redirect)
4. missing `timeZone` pins on date formatters (Workers = UTC)
5. other negative/edge correctness (silent action failures, state-machine bypasses, empty/null renders)
A code sweep (Opus, read-only) finds ALL siblings of a gap at once — the screenshot audit finds one,
the user finds the next, forever. Use the screenshot audit only for *visual* correctness (layout,
dark mode, tofu glyphs); use the code sweep for *behavioral* completeness. See also
[[qa-agent-interaction-fails-are-not-app-bugs]] (the cheap-model happy-path audit is also unreliable
on the interactions it DOES attempt).
