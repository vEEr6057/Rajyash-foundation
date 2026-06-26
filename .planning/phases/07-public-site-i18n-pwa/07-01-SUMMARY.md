---
phase: "07"
plan: "01"
subsystem: "i18n"
tags: [next-intl, cookie-mode, locale, messages, language-switcher, security]
dependency_graph:
  requires: ["07-00"]
  provides: ["next-intl-scaffold", "EN-message-catalogs", "locale-switcher"]
  affects: ["07-02", "07-03", "07-04", "layout"]
tech_stack:
  added: []
  patterns:
    - "next-intl cookie mode (no middleware, no URL segments)"
    - "nested namespace message loading (common/landing/portal/admin)"
    - "allowlist guard on locale cookie (T-7-01-01, T-7-01-02)"
    - "useLocale() for locale detection in client components (no navigator.language)"
    - "revalidatePath + router.refresh() locale switch pattern"
key_files:
  created:
    - src/i18n/request.ts
    - src/i18n/request.test.ts
    - src/features/public/actions/setLocale.ts
    - src/features/public/actions/setLocale.test.ts
    - src/features/public/components/LanguageSwitcher.tsx
    - src/features/public/components/LanguageSwitcher.test.tsx
    - src/features/public/index.ts
    - src/i18n/messages/en/common.json
    - src/i18n/messages/en/landing.json
    - src/i18n/messages/en/portal.json
    - src/i18n/messages/en/admin.json
    - src/i18n/messages/gu/common.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/gu/landing.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/gu/portal.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/gu/admin.json   (stub — Plan 07-04 populates)
    - src/i18n/messages/hi/common.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/hi/landing.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/hi/portal.json  (stub — Plan 07-04 populates)
    - src/i18n/messages/hi/admin.json   (stub — Plan 07-04 populates)
  modified:
    - src/app/layout.tsx
    - src/config/constants.ts
decisions:
  - "landing.json uses verbatim key structure from docs/design/imported/landing.en.json (74 flat/nested keys: heroTitle, statMeals, etc.) — plan executor directive overrides namespace_contract abstract examples"
  - "isValidLocale exported as named export for downstream testability (also allows Plan 07-03 reuse)"
  - "loadMessages extracted as named export to provide a seam for tests (Vite cannot statically analyse fully-variable dynamic import paths in test mode)"
  - "Sticky header bar with LanguageSwitcher added to layout for D-09 coverage; portal/admin shells may add their own switcher in their nav without duplication concern"
  - "GU/HI stub files committed as { _stub: true } — required for dynamic imports to resolve in tests; Plan 07-04 replaces these with machine-translated content"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-27"
  tasks_completed: 3
  tasks_total: 3
  files_created: 20
  files_modified: 2
---

# Phase 07 Plan 01: next-intl Scaffold Summary

next-intl wired in cookie mode with nested namespace message loading, EN catalogs seeded from design import, and a LanguageSwitcher component rendering EN/gu/hi pills on every page.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | next-intl request config + setLocale action | b5264b3 | src/i18n/request.ts, src/features/public/actions/setLocale.ts + stub JSON files |
| 2 | EN message catalogs (all 4 namespaces) | dca6e8c | src/i18n/messages/en/{common,landing,portal,admin}.json |
| 3 | LanguageSwitcher + NextIntlClientProvider in layout | eede442 | src/features/public/components/LanguageSwitcher.tsx, src/app/layout.tsx |

## Architecture

**getRequestConfig** reads the `NEXT_LOCALE` cookie, validates against `['en','gu','hi']`, falls back to `'en'`, then returns messages NESTED:

```
messages = {
  common:  { nav, footer, buttons, status, foodCategory, partnerType, quantityUnit, errors }
  landing: { heroTitle, statMeals, step1Title, ... }  ← verbatim from design import
  portal:  { pickup, notifications, profile, dashboard }
  admin:   { pickups, users, partners, reports, dashboard }
}
```

**Provider order** in `layout.tsx`: `ClerkProvider > NextIntlClientProvider > header > Providers > children` — NextIntlClientProvider is a Server Component parent so it auto-inherits locale + messages from getRequestConfig without explicit props (next-intl v4 feature).

**Locale switching**: `setLocaleCookieAction` sets `NEXT_LOCALE` (allowlisted, 1yr, httpOnly:false, sameSite:lax) then calls `revalidatePath('/', 'layout')`. The `LanguageSwitcher` calls the action then `router.refresh()` in a `startTransition`.

## Security

| Threat | Control | Location |
|--------|---------|----------|
| T-7-01-01: locale-cookie injection into dynamic import path | `isValidLocale` allowlist guard → fallback 'en' | src/i18n/request.ts:11 |
| T-7-01-02: arbitrary locale via server action | `SUPPORTED_LOCALES.includes()` guard at top of action | src/features/public/actions/setLocale.ts:12 |
| T-7-01-03: EN message disclosure | Accepted — public UI strings, expected | n/a |

## Deviations from Plan

### Auto-adapted Issues

**1. [Rule 1 - Testability] Extracted `loadMessages` as named export**
- **Found during:** Task 1 RED phase
- **Issue:** Vite/Vitest throws "Unknown variable dynamic import" for fully-interpolated template literal paths (`./messages/${locale}/common.json`). The Next.js/webpack production build handles these fine (partial-static dynamic imports), but vitest cannot statically analyse them.
- **Fix:** Extracted the 4-import block into a named `loadMessages(locale)` function. This is the production code too — no divergence. Tests provide real stub JSON files on disk so the dynamic imports resolve to actual files.
- **Files modified:** src/i18n/request.ts (also export `isValidLocale` for downstream reuse)
- **Commit:** b5264b3

**2. [Rule 1 - Testability] GU/HI stub JSON files committed**
- **Found during:** Task 1 — tests need all 12 locale/namespace files to exist so dynamic imports don't throw at test time
- **Fix:** Created stub files `{ "_stub": true }` for all GU/HI namespaces. Plan 07-04 will replace these with real machine-translated content.
- **Files modified:** 8 stub files in src/i18n/messages/{gu,hi}/
- **Commit:** b5264b3

**3. [Design instruction override] landing.json uses flat design-import key structure**
- **Found during:** Task 2
- **Issue:** The plan's `<namespace_contract>` shows abstract `counter.servings`/`hero.headline` style keys. The executor instruction explicitly states: "use the EXACT content + key structure from docs/design/imported/landing.en.json." The design import uses flat keys (`heroTitle`, `statMeals`, `step1Title`, etc.) with `nav` as the one nested object.
- **Fix:** Copied `docs/design/imported/landing.en.json` verbatim into `src/i18n/messages/en/landing.json`. Plans 07-02 and 07-03 must use these exact key names.
- **Commit:** dca6e8c

**4. [vi.hoisted fix] Temporal dead zone in vi.mock factories**
- **Found during:** Task 1 test writing
- **Issue:** `cookieGet` variable captured inside `vi.mock()` factory caused "Cannot access before initialization" (TDZ).
- **Fix:** Used `vi.hoisted()` to declare shared mock variables — standard pattern per vitest docs.
- **Commit:** b5264b3 (in test files)

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| GU messages (all 4 namespaces) | src/i18n/messages/gu/*.json | Machine translation deferred to Plan 07-04 |
| HI messages (all 4 namespaces) | src/i18n/messages/hi/*.json | Machine translation deferred to Plan 07-04 |

These stubs have `{ "_stub": true }` content. The app will load them for GU/HI locales but show no translated text until Plan 07-04 populates real content. The language switcher itself works (cookie is set, page re-renders) — text simply appears in the stub format for non-EN locales until 07-04.

## Threat Flags

None — all surfaces already in the plan's `<threat_model>` (T-7-01-01, T-7-01-02, T-7-01-03).

## Test Coverage

| File | Tests | What They Cover |
|------|-------|-----------------|
| src/i18n/request.test.ts | 9 | SUPPORTED_LOCALES list, isValidLocale allowlist, locale detection for en/gu/hi/fr/missing cookie, nested messages shape |
| src/features/public/actions/setLocale.test.ts | 6 | Cookie set with correct key/value, maxAge/httpOnly/sameSite options, rejection of invalid locales, revalidatePath call |
| src/features/public/components/LanguageSwitcher.test.tsx | 5 | 3 pills rendered, aria-pressed on active, action+refresh on new locale click, no-op on current locale click, pending state structure |

All 20 test files pass (112 tests). `SKIP_ENV_VALIDATION=1 pnpm typecheck` exits 0.

## Self-Check: PASSED

- [x] src/i18n/request.ts exists; `grep -c "common:" src/i18n/request.ts` returns 1
- [x] No flat-spread: `grep -c "...(await import" src/i18n/request.ts` returns 0
- [x] SUPPORTED_LOCALES present in request.ts
- [x] setLocale has `httpOnly: false` and `maxAge: 31536000` (60*60*24*365)
- [x] landing.json has heroTitle (design import verbatim, 74 keys)
- [x] common.json has status.en_route = "En route", partnerType.hall = "Banquet hall"
- [x] admin.json has partners.linkDonor, pickups.assign, reports.metrics
- [x] NextIntlClientProvider in layout.tsx wraps Providers (not inside it) — 2 occurrences confirmed
- [x] LanguageSwitcher uses useLocale() (grep confirms, no navigator.language)
- [x] ROUTES.becomeVolunteer in constants.ts
- [x] All commits exist: b5264b3, dca6e8c, eede442
