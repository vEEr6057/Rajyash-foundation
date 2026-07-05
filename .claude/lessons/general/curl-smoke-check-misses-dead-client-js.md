# curl-smoke-check-misses-dead-client-js

**Date:** 2026-07-05 · **Topic:** general · **Severity:** HIGH · **Status:** verified

## Symptom

After a batch of rapid deploys, the live site's **entire client bundle was 404ing**
(`/_next/static/chunks/*.js` all 404 — HTML referenced chunk hashes the deployed assets didn't
contain). Result: blank sign-in (Clerk widget never hydrated), no scroll animations, dead
interactivity. But my post-deploy "smoke check" — `curl` of `/`, `/api/health`, `/terms` —
returned 200s and I reported the site healthy. The user found it broken in a real browser.

## Root cause

`curl` fetches **server-rendered HTML only**. It never executes JavaScript, so a page whose
server HTML is perfect but whose client chunks 404 looks 100% healthy to curl. The runbook's
"smoke check" was being run with curl, which is blind to exactly this failure class (broken
hydration, asset/HTML hash mismatch, CSP blocking a client script, a dead Clerk/Turnstile
widget).

## Fix

- **Post-deploy smoke check MUST load the page in a real browser** (Playwright MCP:
  `browser_navigate` + `browser_console_messages level=error`). Zero console errors + the
  interactive element actually present = healthy. curl is fine only for the health *endpoint*,
  not for "does the app work".
- Automate it: CI step after deploy fetches the homepage HTML, extracts a referenced
  `/_next/static/chunks/*.js` URL, curls THAT, fails if not 200 (catches HTML/asset mismatch
  without a browser). (Planned as the D1 guard.)

## Recall trigger

Any "did the deploy work / is the site up" check. Never answer it from a curl of the HTML alone —
load it in a browser and read the console, or at minimum verify a referenced JS chunk resolves.
Especially after multiple rapid successive deploys (the mismatch trigger here).
