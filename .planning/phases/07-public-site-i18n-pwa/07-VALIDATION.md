---
phase: 7
slug: public-site-i18n-pwa
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-27
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + @testing-library/react (jsdom) |
| **Config file** | vitest.config.ts (+ src/test/setup.ts) |
| **Quick run command** | `pnpm test:run` |
| **Full suite command** | `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm test:run && pnpm lint` |
| **Estimated runtime** | ~10 seconds (test:run); +typecheck/lint ~40s |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:run`
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite green + `pnpm build` (opennext) succeeds
- **Max feedback latency:** ~10 seconds (unit), ~60s (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-00-01 | 00 | 0 | PUB-04 | — | Serwist+opennext build go/no-go; SW must not precache authed/API routes | build | `pnpm build` (opennext) returns 0, no HTTP 500 | ✅ existing | ⬜ pending |
| 07-01-01 | 01 | 1 | I18N-01/02/03 | — | `isValidLocale` allowlist guards cookie (no arbitrary file read) | unit | `pnpm test:run` (i18n config + isValidLocale) | ❌ W1 | ⬜ pending |
| 07-01-02 | 01 | 1 | I18N-02 | — | setLocale only writes NEXT_LOCALE to an allowlisted value | unit | `pnpm test:run` (setLocale action) | ❌ W1 | ⬜ pending |
| 07-02-01 | 02 | 2 | PUB-02 | T-7-01 | Public counter exposes ONLY aggregates (no per-record / PII leak) | unit | `pnpm test:run` (impact all-time wrapper maps servings/kg/count) | ❌ W2 | ⬜ pending |
| 07-03-01 | 03 | 2 | PUB-01/03 | T-7-02 | Volunteer signup defaults role=volunteer; no client-trusted role escalation | manual+unit | Playwright E2E signup → volunteer account | n/a | ⬜ pending |
| 07-04-01 | 04 | 3 | I18N-01 | — | All UI keys resolve in en/gu/hi; no missing-key crash | unit | `pnpm test:run` (message-catalog parity: gu/hi keys ⊇ en used keys) | ❌ W3 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Serwist + `@opennextjs/cloudflare` build compatibility confirmed via `pnpm build` (go/no-go; fallback = minimal manifest + extended `public/sw.js`).
- [ ] `next-intl` installed + pinned for Next 15; `@serwist/next` + `serwist` installed (if go).
- [ ] No new test framework needed — vitest already configured.

*Existing infrastructure covers all automated phase requirements; Wave 0 is dependency + build-compat only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA installable (add-to-home-screen, standalone launch) | PUB-04 | Browser install UX not unit-testable | Playwright: manifest served at /manifest.webmanifest, SW registers, `display: standalone`; manual install on mobile |
| Gujarati/Hindi scripts render correctly | I18N-03 | Visual/font rendering | Playwright: switch locale → assert GU (ગુ) + Devanagari (हि) text present + no tofu |
| Language choice persists across sessions | I18N-02 | Cookie + reload behavior | Playwright: switch → reload → still selected locale (NEXT_LOCALE cookie) |
| Live impact counter shows cached aggregate | PUB-02 | DB-backed render | Playwright: landing shows servings/kg/count from DB |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or are listed as manual-only with E2E coverage
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers build-compat + dependency install
- [ ] No watch-mode flags (`pnpm test:run`, not `pnpm test`)
- [ ] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
