---
id: url-landing-is-not-page-loaded
topic: testing
severity: high
status: verified
tags: [playwright, e2e, false-positive, 403, redirect, smoke-check, middleware]
related-files: [src/middleware.ts, .claude/skills/post-deploy-smoke/SKILL.md]
created: 2026-07-06
verified-by: modulith E2E — three false positives in one night, each caught only by content assertion
---

## Symptom
Playwright route sweeps that assert only "URL after goto == requested URL" reported admin
pages as loaded when they were actually: (a) middleware 403 plain-text "Forbidden" bodies
(403 keeps the URL — looks exactly like a landing), (b) a signed-out redirect chain ending
on the LANDING page whose hero quote was misread as page content, (c) local "pass" for a
role the session never had. Three false positives in one verification night.

## Root cause
A 403 response preserves the requested URL; redirects can land on rich pages that look
plausible; and role claims (Clerk `publicMetadata.role` in session token) differ from what
you assume — vol+clerk_test is `volunteer` (Phase 6 admin promote WAS restored).

## Verified fix
Every E2E route assertion = THREE checks, never fewer:
1. URL (redirect detection),
2. content marker (`document.querySelector('h1,h2')?.textContent` + `body.innerText.length`
   — a 403 body is `"Forbidden"`, len 9),
3. console error count.
Before claiming a role-gated area works, print the actual claim first:
`window.Clerk.user.publicMetadata` — don't infer the role from navigation behavior.
Admin claim on a test user requires the Clerk Backend API promote
(`.claude/lessons/testing/admin-e2e-promote-clerk-role.md`) — role elevation needs the
user's explicit go-ahead (permission classifier blocks it in auto mode).

## Tripwire
If an E2E report says "all N routes loaded" and no line shows an h1/h2 text or body length,
the report is unverified — rerun with content assertions.
