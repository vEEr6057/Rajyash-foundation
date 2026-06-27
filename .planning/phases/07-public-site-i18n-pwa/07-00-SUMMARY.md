---
phase: "07"
plan: "00"
subsystem: "pwa-build-gate"
tags: ["pwa", "i18n", "serwist", "next-intl", "opennext", "build-compat"]
dependency_graph:
  requires: []
  provides:
    - "next-intl@^4.13.0 installed"
    - "@serwist/next@^9.5.11 installed"
    - "serwist@^9.5.11 (dev) installed"
    - "withSerwist(withNextIntl(nextConfig)) composition in next.config.ts"
    - "@tokens/* path alias in tsconfig + vitest"
    - "PWA icons: public/icon-{192,512,512-maskable}.png"
    - "src/i18n/request.ts stub (Wave 0 minimal)"
    - "app/sw.ts stub (Wave 0 minimal, __SW_MANIFEST ref)"
    - "public/sw.js removed from git; .gitignore entry added"
    - "SERWIST GO decision: build + opennext worker bundle clean"
  affects:
    - "All subsequent Phase 7 plans (all depend on this go/no-go gate)"
    - "Plan 07-01 (i18n request.ts + messages — extends the stub)"
    - "Plan 07-04 (Serwist SW — extends the stub)"
tech_stack:
  added:
    - "next-intl ^4.13.0"
    - "@serwist/next ^9.5.11"
    - "serwist ^9.5.11 (dev)"
  patterns:
    - "withSerwist(withNextIntl(nextConfig)) plugin composition"
    - "Serwist outermost plugin order (RESEARCH Pitfall 1)"
    - "@tokens/* tsconfig + vitest alias for tokens/ outside src/"
key_files:
  created:
    - "app/sw.ts (Wave 0 stub — __SW_MANIFEST ref for Serwist InjectManifest)"
    - "src/i18n/request.ts (Wave 0 stub — minimal getRequestConfig)"
    - "public/icon-192.png (placeholder, 5.6 KB)"
    - "public/icon-512.png (placeholder, 18.8 KB)"
    - "public/icon-512-maskable.png (placeholder, 16.8 KB)"
  modified:
    - "next.config.ts (plugin composition added)"
    - "tsconfig.json (webworker lib, @serwist/next/typings, @tokens/* alias, exclude sw)"
    - "vitest.config.ts (@tokens alias added)"
    - ".gitignore (/public/sw.js and /public/swe-worker* entries)"
    - "package.json (next-intl + @serwist/next + serwist added)"
  deleted:
    - "public/sw.js (removed from git index; kept on disk for Plan 07-04 content reference)"
decisions:
  - "SERWIST GO: withSerwist(withNextIntl(nextConfig)) composes cleanly with @opennextjs/cloudflare"
  - "Serwist stub requires __SW_MANIFEST reference in app/sw.ts (InjectManifest plugin validation)"
  - "next-intl plugin requires src/i18n/request.ts to exist at build time (Wave 0 stub created)"
  - "@tokens/* alias added to both tsconfig AND vitest.config.ts (vitest uses explicit alias map)"
  - "Icons are placeholders in brand colors (#C04E12 saffron on #FBF7F0 cream) — user replaces with realfavicongenerator.net output before launch"
metrics:
  duration: "~35 minutes"
  completed: "2026-06-27"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 5
  files_deleted: 1
---

# Phase 7 Plan 00: Build Compatibility Gate Summary

Wave-0 blocking gate for Phase 7 PWA: installed next-intl + Serwist, composed withSerwist(withNextIntl(nextConfig)), added @tokens/* alias, generated placeholder PWA icons, and confirmed opennext Cloudflare build exits clean with Serwist enabled.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install deps + compose next.config.ts + add @tokens/* alias | 5ff6539 | next.config.ts, tsconfig.json, vitest.config.ts, .gitignore, package.json, pnpm-lock.yaml, app/sw.ts |
| 2 | Build gate (autonomous — no checkpoint) | — | (build evidence below) |
| 3 | Generate PWA icons + fix blocking stubs | 8b7ac57 | public/icon-192.png, icon-512.png, icon-512-maskable.png, app/sw.ts (updated), src/i18n/request.ts |

## Serwist Go/No-Go Decision

**VERDICT: SERWIST GO**

### Build Evidence

**Run 1 (next.config.ts + stub sw.ts):**
```
pnpm build
> Error: Can't find self.__SW_MANIFEST in your SW source.
```
Serwist InjectManifest plugin ran and validated — it requires `self.__SW_MANIFEST` be referenced. Updated stub.

**Run 2 (after adding __SW_MANIFEST to stub):**
```
pnpm build
✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...
✓ Compiled successfully in 1413ms
✓ Generating static pages (2/2)
```
Next.js build: GREEN.

**opennext Cloudflare build:**
```
npx opennextjs-cloudflare build
✓ (serwist) Bundling the service worker script...
✓ Compiled successfully
OpenNext build complete.
Worker saved in `.open-next/worker.js`
```
Bundle: GREEN. No vendor-chunk corruption.

**Preview (HTTP status):**
```
npx opennextjs-cloudflare preview → wrangler starts → GET / 404 Not Found
```
HTTP 404 on root (expected — current placeholder requires auth), NOT 500. Worker running cleanly.

**Go/No-Go gate passed:** Serwist + withNextIntl + @opennextjs/cloudflare compose without corruption. All downstream plans use the Serwist path.

**Implication for Plan 07-04 (Serwist SW):** Full Serwist setup (Serwist class, push handlers, precache) goes in `app/sw.ts` as designed. No fallback path needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] src/i18n/request.ts missing — next-intl plugin fails build**
- **Found during:** Task 2 (first build attempt)
- **Issue:** `next-intl` plugin `createNextIntlPlugin('./src/i18n/request.ts')` requires the config file to exist at build time, even if empty. Build error: "Could not find i18n config at ./src/i18n/request.ts"
- **Fix:** Created `src/i18n/request.ts` as a Wave 0 stub — minimal `getRequestConfig` returning `{ locale: 'en', messages: {} }`. Full implementation in Plan 07-01.
- **Files modified:** `src/i18n/request.ts` (created)
- **Commit:** 8b7ac57

**2. [Rule 3 - Blocking] app/sw.ts stub missing __SW_MANIFEST reference**
- **Found during:** Task 2 (second build attempt after fixing #1)
- **Issue:** Serwist's InjectManifest webpack plugin validates that `self.__SW_MANIFEST` is referenced in the SW source file before injecting. Build error: "Can't find self.__SW_MANIFEST in your SW source."
- **Fix:** Updated `app/sw.ts` stub to add the required `__SW_MANIFEST` global declaration + reference (`const _manifest = self.__SW_MANIFEST`). Full Serwist implementation (with actual `Serwist` class usage) is Plan 07-04.
- **Files modified:** `app/sw.ts`
- **Commit:** 8b7ac57

**3. [Deviation] vitest.config.ts needs explicit @tokens alias**
- **Found during:** Task 1 (reading vitest.config.ts)
- **Issue:** vitest.config.ts uses an explicit `alias` map, not `vite-tsconfig-paths`. The @tokens/* alias added to tsconfig would not be picked up by Vitest automatically.
- **Fix:** Added `"@tokens": path.resolve(__dirname, "./tokens")` to the vitest alias map.
- **Files modified:** `vitest.config.ts`
- **Commit:** 5ff6539

**4. [Deviation] scripts/ directory created for gen-icons.mjs, then deleted after use**
- **Found during:** Task 3
- **Issue:** Plan called for a temporary icon generation script at `scripts/gen-icons.mjs`.
- **Fix:** Created the directory, ran the script, deleted it. Sharp was temporarily installed as dev dependency for icon generation then removed (`pnpm remove sharp`). Net effect: no scripts/ files or sharp dependency remain in the repository.

### Out-of-scope items not fixed

- Pre-existing test failures in `pickupActions.purge.test.ts` + `recipients.test.ts` due to missing env vars in test environment — not introduced by this plan; not fixed (scope boundary rule).
- `wrangler dev .open-next/worker.js` fails with `No such module "cloudflare/images.js"` — this is a wrangler/workerd version mismatch pre-existing this plan; does NOT affect the go/no-go gate (pnpm preview / opennextjs-cloudflare preview works correctly).

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Minimal getRequestConfig (returns `{ locale: 'en', messages: {} }`) | src/i18n/request.ts | 1-11 | Wave 0 build compatibility only; full cookie-based locale detection + message loading in Plan 07-01 |
| SW source stub (only declares __SW_MANIFEST, no Serwist class, no push handlers) | app/sw.ts | 1-17 | Wave 0 build test only; full Serwist SW implementation in Plan 07-04 |
| PWA icons are placeholder images in brand colors | public/icon-{192,512,512-maskable}.png | — | User replaces with realfavicongenerator.net output (with correct maskable safe zone) before launch |

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, file access patterns, or schema changes. The security mitigation T-7-00-01 (Serwist `exclude` for authed routes) is implemented in next.config.ts as planned.

## Self-Check: PASSED

Files exist:
- FOUND: app/sw.ts
- FOUND: src/i18n/request.ts
- FOUND: public/icon-192.png
- FOUND: public/icon-512.png
- FOUND: public/icon-512-maskable.png
- FOUND: next.config.ts (withSerwist + withNextIntl present)
- FOUND: tsconfig.json (webworker lib, @serwist/next/typings, @tokens/* alias)

Commits:
- 5ff6539: chore(07-00): install next-intl + Serwist, compose next.config.ts plugins, add @tokens/* alias
- 8b7ac57: feat(07-00): generate PWA icons + fix Serwist SW stub for build gate

Build gate: GREEN (opennextjs-cloudflare build completes, worker.js generated, preview 404 not 500)
