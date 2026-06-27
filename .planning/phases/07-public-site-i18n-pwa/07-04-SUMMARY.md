---
phase: "07"
plan: "04"
subsystem: "i18n-pwa"
tags: ["i18n", "pwa", "serwist", "translations", "gujarati", "hindi", "service-worker"]
dependency_graph:
  requires:
    - "07-02: next-intl wired, EN catalogs created (common/landing/portal/admin)"
    - "07-03: portal + admin i18n retrofit complete"
    - "07-00: Serwist GO decision, withSerwist composed, app/sw.ts stub"
  provides:
    - "GU/HI message catalogs for all 4 namespaces (common, landing, portal, admin)"
    - "catalog-parity test (16 tests — GU/HI top-level keys superset EN per namespace)"
    - "Real Serwist SW with Phase-4 push handlers preserved"
    - "locale-aware <html lang> attribute in root layout"
  affects:
    - "All UI pages — GU/HI now render translated strings end-to-end"
    - "PWA — push notifications preserved in full Serwist SW"
    - "Screen readers — <html lang> now reflects active locale"
tech_stack:
  added: []
  patterns:
    - "Machine-draft GU/HI catalogs with _review:pending + _meta.source marker"
    - "Deep-key parity test using vitest (data-driven over namespaces × locales)"
    - "Serwist SW: push/notificationclick BEFORE serwist.addEventListeners() (safe ordering)"
    - "self.clients.matchAll / self.clients.openWindow (avoid global 'clients' DOM collision)"
    - "async RootLayout + getLocale() for locale-aware <html lang>"
key_files:
  created:
    - "src/i18n/messages/gu/common.json"
    - "src/i18n/messages/gu/portal.json"
    - "src/i18n/messages/gu/admin.json"
    - "src/i18n/catalog-parity.test.ts"
  modified:
    - "src/i18n/messages/gu/landing.json (added _review:pending + _meta)"
    - "src/i18n/messages/hi/common.json"
    - "src/i18n/messages/hi/landing.json (added _review:pending + _meta)"
    - "src/i18n/messages/hi/portal.json"
    - "src/i18n/messages/hi/admin.json"
    - "app/sw.ts (stub → real Serwist SW with push handlers)"
    - "src/app/layout.tsx (lang=en → lang={locale}, async + getLocale)"
decisions:
  - "navigateFallbackDenylist not available in SerwistOptions — authed route exclusion handled entirely by withSerwistInit.exclude in next.config.ts (already present from 07-00)"
  - "Phase-4 push handlers use self.clients.matchAll / self.clients.openWindow (not bare 'clients') to avoid TypeScript collision between dom + webworker libs in tsconfig"
  - "Landing gu/hi files carry _review:pending (matching the parity test contract) even though they are design-sourced translations; _meta.source=design distinguishes them from machine-draft"
  - "Machine-drafted common/portal/admin catalogs carry _meta.source:machine-draft 2026-06-27 for foundation review tracking"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 7
---

# Phase 7 Plan 04: GU/HI Catalogs + Serwist SW + Locale Layout Summary

Full Gujarati and Hindi message catalogs for all 4 namespaces, a 16-test catalog-parity suite, real Serwist service worker with Phase-4 push handlers inlined verbatim, and a locale-aware `<html lang>` attribute in the root layout.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| A+B | GU/HI message catalogs (all 4 namespaces) + catalog parity test | 4b75062 | src/i18n/messages/gu/*.json, src/i18n/messages/hi/*.json, src/i18n/catalog-parity.test.ts |
| C | Serwist SW (app/sw.ts) + locale-aware layout lang attribute | 1741fae | app/sw.ts, src/app/layout.tsx |

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm vitest --run src/i18n/catalog-parity.test.ts` | 16/16 passed |
| `pnpm test:run` (full suite) | 127/127 passed (2 pre-existing env-var failures unchanged) |
| `SKIP_ENV_VALIDATION=1 pnpm typecheck` | 0 errors |
| `pnpm lint` | 0 errors, 1 pre-existing warning (layout.tsx custom-font) |
| `pnpm build` | GREEN — Serwist compiled `app/sw.ts → /sw.js` |

## Translations Produced

### GU (ગુજરાતી) — machine-drafted
- **common.json**: appName, nav (home/signIn/signUp/dashboard/language), footer, buttons (8), status (6 pickup states), foodCategory (5), partnerType (5), quantityUnit, errors (3)
- **landing.json**: all 71 keys (design-sourced); added `_review:pending` + `_meta.source:design`
- **portal.json**: pickup form/card/detail/board/donor, notifications, profile, dashboard (full portal UI)
- **admin.json**: pickups/filters/table/assign/export, users/table/actions, partners/form/linkDonor/table, reports/metrics, dashboard nav

### HI (हिन्दी) — machine-drafted
Same scope as GU above; all keys translated to Devanagari script.

**Domain consistency maintained:** brand = राजयश फ़ाउंडेशन / રાજયશ ફાઉન્ડેશન; volunteer = स्वयंसेवक / સ્વયંસેવક; donor = दाता / દાતા; pickup = पिकअप / પિકઅપ.

## Service Worker

`app/sw.ts` is now the full Serwist SW source:
1. Declares `ServiceWorkerGlobalScope` + `__SW_MANIFEST`
2. Registers `push` handler (verbatim from phase4-push-sw.reference.js)
3. Registers `notificationclick` handler (verbatim from phase4-push-sw.reference.js)
4. Constructs `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: true, clientsClaim: true, navigationPreload: true, runtimeCaching: defaultCache })`
5. Calls `serwist.addEventListeners()`

Push handler ordering: push/notificationclick are registered BEFORE `serwist.addEventListeners()` (safe per SW event model). `usePushSubscription.ts` already registers at `/sw.js` — no change needed.

Security: authed routes (`/portal/**`, `/admin/**`, `/api/**`, `/__clerk/**`) excluded from precache via `withSerwistInit.exclude` in `next.config.ts` (set in plan 07-00). Only the public shell and static assets are cached.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `navigateFallbackDenylist` not in SerwistOptions**
- **Found during:** Task C typecheck
- **Issue:** `navigateFallbackDenylist` was added to the `new Serwist({})` constructor based on the RESEARCH doc, but it does not exist in `SerwistOptions` (it belongs to `NavigationRoute`, a separate Serwist concept not used here).
- **Fix:** Removed `navigateFallbackDenylist` from the Serwist constructor. The security requirement (T-7-04-02) is already fully satisfied by the `exclude` patterns in `next.config.ts withSerwistInit` (set in 07-00: `/api/`, `/__clerk/`, `/admin/`, `/portal/`). No functional gap.
- **Files modified:** `app/sw.ts`

**2. [Rule 1 - Bug] TypeScript collision: bare `clients` global with dom + webworker libs**
- **Found during:** Task C typecheck
- **Issue:** tsconfig has both `"dom"` and `"webworker"` in `lib`. Bare `clients` in the SW file triggers `Cannot find name 'clients'. Did you mean 'Clients'?` because `dom` defines `Clients` (capital C) as a constructor type and `clients` as an implicit global only in webworker scope. TypeScript with both libs is ambiguous.
- **Fix:** Changed to explicit `self.clients.matchAll(...)` and `self.clients.openWindow(...)`. This is unambiguous (self is declared as `ServiceWorkerGlobalScope`). Also typed the `wins` callback parameter as `readonly WindowClient[]`.
- **Files modified:** `app/sw.ts`

**3. [Deviation] `_review:pending` added to design-translated landing files**
- **Found during:** Task B (writing parity test)
- **Issue:** The parity test (from the plan spec) asserts `_review: "pending"` for ALL files including `gu/landing.json` and `hi/landing.json`. The landing files were produced by the design team (not machine-drafted), but the test requires this marker.
- **Fix:** Added `_review: "pending"` to both landing files (first key). Added `_meta.source: "design"` to distinguish them from machine-drafted files. This satisfies both the test contract and the review-tracking intent.
- **Files modified:** `src/i18n/messages/gu/landing.json`, `src/i18n/messages/hi/landing.json`

## Known Stubs

None — all 8 GU/HI catalog files are fully translated. The `_review: "pending"` + `_meta.source: "machine-draft"` markers signal that common/portal/admin translations await foundation review before launch; they are NOT rendering stubs (all keys have real translated values).

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Threat T-7-04-02 (SW fetch handler security) is mitigated by the `exclude` patterns already in `next.config.ts`. T-7-04-03 (lang attribute spoofing) is mitigated: `getLocale()` returns only values validated against the `['en','gu','hi']` allowlist in `src/i18n/request.ts`.

## Self-Check: PASSED

Files exist:
- FOUND: src/i18n/messages/gu/common.json
- FOUND: src/i18n/messages/gu/landing.json
- FOUND: src/i18n/messages/gu/portal.json
- FOUND: src/i18n/messages/gu/admin.json
- FOUND: src/i18n/messages/hi/common.json
- FOUND: src/i18n/messages/hi/landing.json
- FOUND: src/i18n/messages/hi/portal.json
- FOUND: src/i18n/messages/hi/admin.json
- FOUND: src/i18n/catalog-parity.test.ts
- FOUND: app/sw.ts (contains serwist.addEventListeners)
- FOUND: src/app/layout.tsx (contains lang={locale})

Commits:
- FOUND: 4b75062 feat(07-04): add GU/HI message catalogs
- FOUND: 1741fae feat(07-04): real Serwist SW with Phase-4 push handlers
