# Phase 7: Public Site + i18n + PWA — Research

**Researched:** 2026-06-27
**Domain:** next-intl (cookie mode) + Serwist PWA + @opennextjs/cloudflare + multi-script i18n retrofit
**Confidence:** MEDIUM — core approaches verified via official docs; the Serwist+opennext interaction
carries HIGH risk that is acknowledged and has a fallback path.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Design scaffold:** Landing visual designed in claude.ai/design + imported later.
Build structural scaffold (sections, data wiring, i18n keys, CTAs) that the import slots into
without structural rework. Ship token-based baseline if export not ready by build time.

**D-02 — Landing sections:** hero + program description (PUB-01), live impact counter (PUB-02),
how-it-works (3 steps), about + contact, "Become a Volunteer" CTA (PUB-03), footer with language
switch. Public pages are server components, unauthenticated; public = generous motion budget.

**D-03 — Impact counter:** cached all-time aggregate reusing `pickupsRepo.impactReport` — total
servings + total kg + delivered count shown SEPARATELY. Cache via Next `unstable_cache` / segment
`revalidate` (~300s). Animated count-up via `useCountUp` (tokens/motion.ts). No per-record data
leaked.

**D-04 — Volunteer signup:** Reuses existing Clerk sign-up + onboarding; role defaulted to
`volunteer`. Wiring details = Claude's discretion.

**D-05 — PWA:** Full offline precache via Serwist (withSerwist + app/sw.ts) with manifest via
`src/app/manifest.ts`. Must preserve existing push handler in `public/sw.js` (Phase 4). Contingency
if incompatible with opennext/Cloudflare: minimal manifest + extend existing SW.

**D-06 — next-intl:** "Without i18n routing" mode. Locale in `NEXT_LOCALE` cookie. URLs
unchanged. Compose with existing Clerk middleware by NOT using any next-intl middleware (cookie mode
requires none). `getRequestConfig` reads cookie. `NextIntlClientProvider` in root layout.

**D-07 — ALL UI:** Public site + portal + admin strings externalized to message catalogs in EN/GU/HI.
Per-feature namespaces, reuse-first.

**D-08 — Machine-drafted GU/HI:** EN authored; Claude generates Gujarati + Hindi, committed with
`review-pending` marker. Foundation polishes post-launch.

**D-09 — Persistent language switch:** Header + footer on every page sets `NEXT_LOCALE` cookie
and re-renders. Survives refresh + sessions.

**D-10 — Font rendering:** GU/HI via already-specced Noto/Mukta multi-script body fonts. Date/number
formatting via next-intl formatters per locale.

### Claude's Discretion
- Message-catalog layout (per-namespace JSON under `src/i18n/messages/{en,gu,hi}/`)
- Exact volunteer-signup wiring (prefill role through sign-up/onboarding flow)
- Counter cache TTL
- Serwist config details
- Icon generation approach
- Scaffold markup the imported design replaces

### Deferred Ideas (OUT OF SCOPE)
- Design-import touchpoint (visual refinement after user delivers claude.ai/design export)
- Serwist fallback execution (only if compatibility genuinely fails)
- URL-prefixed locales + localized SEO (`/en|/gu|/hi`) — v2
- Public stories/impact blog (PUB-05, v2)
- Recurring/monetary donations (Phase 5 PARKED)
- Professional GU/HI polish (foundation review pass)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUB-01 | Public landing page describes the program | Server component scaffold + import path in §Architecture Patterns |
| PUB-02 | Public page shows a live impact counter (cached aggregate) | `impactReport` wrapper + `unstable_cache` + `useCountUp` — §Cached Counter |
| PUB-03 | Visitor can sign up as a volunteer from the public site | Clerk sign-up reuse + `defaultRole` prefill — §Volunteer Signup Wiring |
| PUB-04 | App is an installable, mobile-first PWA | Serwist + manifest.ts + icons — §PWA Deep Dive |
| I18N-01 | All UI in English, Gujarati, and Hindi | next-intl message catalogs + `getTranslations`/`useTranslations` — §next-intl |
| I18N-02 | User can switch language; choice persists | `NEXT_LOCALE` cookie + server action + `router.refresh()` — §Locale Switching |
| I18N-03 | Gujarati and Hindi scripts render correctly | Existing Noto/Mukta fonts + GU `<link>` fallback — §Font Rendering |
</phase_requirements>

---

## Summary

Phase 7 has three independent pillars — i18n, PWA, and public landing — that converge in the root
layout and next.config.ts. The dominant risk is the Serwist + @opennextjs/cloudflare build
compatibility question; everything else is well-understood.

**next-intl** in "without i18n routing" (cookie) mode is fully documented and clean: no
next-intl middleware is required, the existing `clerkMiddleware` in `src/middleware.ts` is
untouched, and `getRequestConfig` in `src/i18n/request.ts` reads `cookies().get('NEXT_LOCALE')`.
`NextIntlClientProvider` in the root layout auto-inherits messages from the server config in v4
(no explicit props needed). Locale switching is a server action that sets the cookie followed by
a client-side `router.refresh()`.

**Serwist** (`@serwist/next`) with Next.js 15 + webpack is confirmed by the official Next.js PWA
guide (which explicitly says Serwist requires webpack). The @opennextjs/cloudflare build uses
webpack for `opennextjs-cloudflare build` (Turbopack is a dev-only opt-in, not used by opennext's
build pipeline), so Serwist should integrate via `withSerwist` wrapping in `next.config.ts`. The
existing `public/sw.js` (push handler) is REPLACED by `app/sw.ts` which inlines the same push
and notificationclick listeners before calling `serwist.addEventListeners()`. Static assets in
`public/` — including the generated `/sw.js` and icons — are served verbatim by the Workers
Static Assets binding.

**Caching reality:** Without R2/KV bindings configured, `unstable_cache` and `revalidate` on the
public landing page produce a fresh DB read on every request (SSR always works without config;
only ISR/SSG caching requires R2/KV). For a public impact counter that changes infrequently, this
means every page load hits the DB once. React's `cache()` still deduplicates within a single
request. This is acceptable for MVP; the recommendation is to use `unstable_cache` with a 300s
TTL which will be honored as an in-memory per-isolate cache on Cloudflare Workers even without R2/KV
(each isolate stays warm for the duration of a request batch).

**Primary recommendation:** Proceed with the primary path (Serwist + withNextIntl + webpack build).
Confirm it composes cleanly by verifying the build in Wave 0 before writing the full SW precache
config. If `withSerwist` corrupts the vendor chunk (a risk flagged in context from a prior session),
fall back to the minimal manifest + extended `public/sw.js` path documented below.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public landing page (PUB-01) | Next.js Server Component (`/`) | — | Static content, unauthenticated, no client state needed |
| Impact counter data (PUB-02) | Next.js Server Component | Supabase DB (Drizzle) | Aggregate query runs server-side; counter animation runs client-side |
| Counter animation | Browser (Client Component) | — | `useCountUp` uses `useEffect`/`useInView` |
| Language switch UI | Browser (Client Component) | — | Cookie must be set client-accessible; requires `router.refresh()` |
| Locale detection | Next.js Server (getRequestConfig) | — | Reads `cookies()` during server render pass |
| PWA manifest | Next.js Route Handler (`app/manifest.ts`) | — | Built-in Next.js metadata convention, served as `/manifest.webmanifest` |
| Service worker | Static file (`public/sw.js`) | — | Built by Serwist from `app/sw.ts`, served by Workers Static Assets |
| Volunteer signup entry point | Browser (CTA link) → Clerk | Next.js sign-up flow | Reuses Phase 1 Clerk pages |
| i18n message loading | Next.js Server | — | `getTranslations` for server components, messages passed to client via NextIntlClientProvider |
| Font serving | CDN (Google Fonts via `<link>`) | next/font (partial) | Noto Sans Gujarati not available via next/font (confirmed by existing layout); Noto Devanagari + Mukta are via next/font already |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | ^4.13.0 | i18n messages + locale API | Official next-intl; v4 is ESM-only, auto-inherits messages in provider; peer dep Next.js 15 confirmed [VERIFIED: npm registry search] |
| @serwist/next | ^9.5.11 | PWA SW build plugin for Next.js | next-pwa successor; App Router support; actively maintained [VERIFIED: npm search] |
| serwist | ^9.5.11 | Serwist core (peer dep of @serwist/next) | Required as dev dep; provides `Serwist` class used in `app/sw.ts` [CITED: serwist.pages.dev/docs/next/getting-started] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new UI libs) | — | — | All UI: shadcn primitives already present |
| (Noto Sans Gujarati via Google Fonts link) | — | GU script rendering | Already in `layout.tsx`; no install needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl cookie mode | next-intl with `[locale]` routing + `localePrefix: "never"` | The `[locale]` segment approach requires restructuring ALL routes into `app/[locale]/` — a major file move; cookie mode avoids this entirely for a same-URL setup |
| Serwist | next-pwa (legacy) | next-pwa is unmaintained (no App Router support); next-pwa is not an option |
| Serwist | Manual SW + manifest only | Meets PUB-04 "installable" without full offline precache; valid fallback if Serwist conflicts with opennext build |
| `unstable_cache` | Cloudflare R2 incremental cache | R2 requires paid Cloudflare plan or setup; `unstable_cache` provides per-isolate in-memory TTL for free, sufficient for impact counter |

**Installation (primary path):**
```bash
pnpm add next-intl
pnpm add @serwist/next
pnpm add -D serwist
```

**Version verification:** [VERIFIED: npm search results, 2026-06-27]
- next-intl: 4.13.0 (last published ~1 month ago)
- @serwist/next: 9.5.11 (last published ~2 months ago)

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ GET / (public, no auth)
  │    └─► Next.js Server Component (app/page.tsx — replaces placeholder)
  │          ├─ getRequestConfig() reads NEXT_LOCALE cookie → locale
  │          ├─ getTranslations('landing') → t()
  │          ├─ getCachedImpactReport() → { servings, kg, count }
  │          └─ renders: <LandingPage> with i18n + impact data
  │
  ├─ Client hydration
  │    ├─ NextIntlClientProvider (auto-inherits locale + messages)
  │    ├─ <ImpactCounter> useCountUp(ref, servings/kg/count)
  │    └─ <LanguageSwitcher> → setLocaleCookieAction() → router.refresh()
  │
  ├─ GET /manifest.webmanifest
  │    └─► app/manifest.ts Route Handler (static, cached by CF)
  │
  ├─ GET /sw.js  ← Workers Static Assets (NOT the worker)
  │    └─► Serwist-compiled service worker
  │          ├─ push / notificationclick listeners (from Phase 4)
  │          ├─ serwist.addEventListeners() — precache + fetch routing
  │          └─ self.__SW_MANIFEST precache list (injected at build)
  │
  └─ Clerk sign-up flow (unchanged)
       └─► /sign-up → /onboarding (role=volunteer default)
```

### Recommended Project Structure

```
src/
├── i18n/
│   ├── request.ts            # getRequestConfig — reads NEXT_LOCALE cookie
│   └── messages/
│       ├── en/
│       │   ├── common.json   # shared: nav, buttons, status labels, footer
│       │   ├── landing.json  # PUB-01/02/03 strings
│       │   ├── portal.json   # donor + volunteer portal strings
│       │   └── admin.json    # admin dashboard strings
│       ├── gu/               # machine-drafted; same file names
│       └── hi/               # machine-drafted; same file names
├── features/
│   └── public/
│       ├── components/
│       │   ├── LandingPage.tsx      # structural scaffold
│       │   ├── ImpactCounter.tsx    # client: useCountUp
│       │   ├── HowItWorks.tsx
│       │   ├── LanguageSwitcher.tsx # client: sets cookie + refresh
│       │   └── PublicHeader.tsx
│       ├── actions/
│       │   └── setLocale.ts         # server action: cookies().set + revalidatePath
│       └── index.ts
├── server/
│   └── db/
│       └── repositories/
│           └── impact.ts    # getCachedImpactReport() wrapping pickupsRepo.impactReport
└── app/
    ├── manifest.ts          # PWA manifest (Next.js Route Handler)
    ├── sw.ts                # Serwist SW source (compiled → public/sw.js at build)
    ├── layout.tsx           # add NextIntlClientProvider
    └── (public)/            # optional route group for public pages
        └── page.tsx         # replaces placeholder homepage
```

### Pattern 1: next-intl Cookie Mode Setup

**What:** Configure next-intl to read locale from cookie, with no middleware required.
**When to use:** Always (locked decision D-06).

```typescript
// src/i18n/request.ts
// Source: next-intl.dev/docs/getting-started/app-router/without-i18n-routing
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = ['en', 'gu', 'hi'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(v: string | undefined): v is Locale {
  return SUPPORTED_LOCALES.includes(v as Locale);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get('NEXT_LOCALE')?.value;
  const locale: Locale = isValidLocale(raw) ? raw : 'en';

  return {
    locale,
    messages: {
      ...(await import(`./messages/${locale}/common.json`)).default,
      ...(await import(`./messages/${locale}/landing.json`)).default,
      // per-route namespaces merged at top level, or use per-namespace keys
    },
  };
});
```

```typescript
// next.config.ts — wrap with both plugins
// Source: next-intl.dev/docs/getting-started, serwist.pages.dev/docs/next/getting-started
import './src/config/env';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  // Exclude authed routes and API from precache
  exclude: [/\/api\//, /\/__clerk\//, /\/admin\//, /\/portal\//],
});

const nextConfig: NextConfig = {};

// Compose: withSerwist wraps withNextIntl wraps nextConfig
export default withSerwist(withNextIntl(nextConfig));

initOpenNextCloudflareForDev();
```

```tsx
// src/app/layout.tsx — add NextIntlClientProvider (auto-inherits locale+messages)
// Source: next-intl.dev/docs/usage/configuration
import { NextIntlClientProvider } from 'next-intl';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider ...>
      <html lang="en" suppressHydrationWarning>
        <head>...</head>
        <body ...>
          <NextIntlClientProvider>
            <Providers>{children}</Providers>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
// NOTE: NextIntlClientProvider must be inside ClerkProvider (which is already a server
// boundary). NextIntlClientProvider in v4 auto-inherits locale + messages from its
// parent Server Component context — no explicit props needed.
```

### Pattern 2: Locale Switching (Cookie + Refresh)

**What:** Server action sets NEXT_LOCALE cookie; client calls router.refresh().
**When to use:** LanguageSwitcher component on every page.

```typescript
// src/features/public/actions/setLocale.ts
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocaleCookieAction(locale: 'en' | 'gu' | 'hi') {
  const store = await cookies();
  store.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year — persistent across sessions (D-09)
    httpOnly: false,   // must be readable by client JS for locale detection (if needed)
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  // revalidatePath forces server re-render to pick up new locale in getRequestConfig
  revalidatePath('/', 'layout');
}
```

```tsx
// src/features/public/components/LanguageSwitcher.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocaleCookieAction } from '../actions/setLocale';

const LOCALE_LABELS = { en: 'EN', gu: 'ગુ', hi: 'हि' };

export function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(locale: 'en' | 'gu' | 'hi') {
    startTransition(async () => {
      await setLocaleCookieAction(locale);
      router.refresh();   // re-fetches Server Components with new locale
    });
  }

  return (
    <div className="flex gap-2">
      {(['en', 'gu', 'hi'] as const).map((l) => (
        <button key={l} onClick={() => handleLocaleChange(l)} disabled={isPending}>
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
```

**Note:** The `revalidatePath` + `router.refresh()` combination is confirmed working by the
next-intl maintainer. The `revalidatePath('/', 'layout')` ensures the root layout re-executes
`getRequestConfig` with the new cookie value. [ASSUMED — documented pattern extrapolated from
official examples; the specific combination of `revalidatePath` + `router.refresh()` for cookie
mode is community-confirmed but not fully written up in next-intl v4 official docs yet]

### Pattern 3: Serwist Service Worker with Push Handler Preserved

**What:** Inline the Phase 4 push handlers directly in `app/sw.ts` BEFORE calling
`serwist.addEventListeners()`. The `public/sw.js` file is REPLACED by the Serwist build output.
**When to use:** PWA setup (locked D-05).

```typescript
// app/sw.ts — Serwist SW source
// Source: serwist.pages.dev/docs/next/getting-started (adapted)
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// ── Phase 4 push handlers (preserved from public/sw.js) ───────────
self.addEventListener('push', (event) => {
  let d: { title?: string; body?: string; url?: string } = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = {}; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Food Rescue', {
      body: d.body || '',
      data: { url: d.url || '/portal/dashboard' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/portal/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(url) && 'focus' in w) return w.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── Serwist precache + runtime caching ────────────────────────────
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
// NOTE: push/notificationclick handlers MUST be registered BEFORE addEventListeners()
// because Serwist also registers install/activate listeners; event handler ordering
// matters in SW execution. [ASSUMED — ordering based on SW event model; no explicit
// Serwist docs state "before" requirement but this is safe practice]
```

**Important:** The old `public/sw.js` (minimal push-only SW) is deleted after the Serwist build
produces a new `public/sw.js` from `app/sw.ts`. The `public/sw.js` in git is replaced at build
time; add it to `.gitignore` during Phase 7 Wave 0.

### Pattern 4: PWA Manifest (app/manifest.ts)

```typescript
// src/app/manifest.ts
// Source: nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rajyash Food Rescue',
    short_name: 'Food Rescue',
    description: 'Rescue surplus food and get it to people in need across Ahmedabad.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7F0',   // --color-background from design tokens
    theme_color: '#C04E12',        // --color-primary (saffron)
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',      // Android adaptive icons
      },
    ],
  };
}
```

The manifest is served at `/manifest.webmanifest` by Next.js automatically. The existing
middleware matcher already excludes `.webmanifest` — no change required. [VERIFIED: grep of
src/middleware.ts confirms `webmanifest` is in the exclusion pattern]

### Pattern 5: Cached All-Time Impact Report

```typescript
// src/server/db/repositories/impact.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { pickupsRepo } from './pickups';

// All-time = epoch → far future. impactReport requires from/to Date bounds.
const ALL_TIME_FROM = new Date(0);          // Unix epoch
const ALL_TIME_TO   = new Date(9999, 0, 1); // far future

export const getCachedImpactReport = unstable_cache(
  async () => pickupsRepo.impactReport(ALL_TIME_FROM, ALL_TIME_TO),
  ['impact-report-all-time'],
  { revalidate: 300 },   // 5 min TTL; per-isolate in-memory on CF Workers without R2
);
```

**Caching reality on Cloudflare Workers (free tier without R2/KV):** SSR routes run on every
request by default. Without R2/KV bindings configured, `unstable_cache` provides per-isolate
in-memory caching: the cache entry lives for the duration of the Worker isolate lifetime (which
is typically warmed for multiple requests during a burst). The `revalidate: 300` TTL is honored
within a warm isolate but is NOT persistent across cold starts. For a low-traffic NGO site this
is acceptable — worst case is one DB read per cold Worker start. [MEDIUM confidence — inferred
from opennext caching docs stating "SSR works without config"; specific per-isolate in-memory
behavior is ASSUMED]

### Pattern 6: tsconfig for Serwist (webworker + DOM coexistence)

```json
// tsconfig.json additions (verified pattern from uriseroussi/next-serwist-pwa-example)
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  },
  "exclude": ["public/sw.js", "public/swe-worker*"]
}
```

The `/// <reference lib="webworker" />` triple-slash directive at the top of `app/sw.ts` is an
alternative to adding `"webworker"` to the global `lib` — but it bleeds into other files.
The tsconfig approach is cleaner. [CITED: github.com/uriseroussi/next-serwist-pwa-example]

### Anti-Patterns to Avoid

- **Do NOT add next-intl middleware**: Cookie mode requires no middleware. Adding it would require composing it with clerkMiddleware (complex, not needed). [CITED: next-intl.dev without-i18n-routing docs]
- **Do NOT restructure routes into `app/[locale]/`**: That is the "with routing" approach. URLs stay unchanged (D-06).
- **Do NOT pass `messages` or `locale` explicitly to `NextIntlClientProvider`**: v4 auto-inherits from the server context — explicit props are redundant and can cause hydration mismatches.
- **Do NOT use `cookies().set()` with `httpOnly: true` for NEXT_LOCALE**: httpOnly cookies cannot be read by JS; the cookie needs to be accessible for the server action path to work. Keep `httpOnly: false`.
- **Do NOT precache authenticated routes** (`/portal/**`, `/admin/**`, `/api/**`, `/__clerk/**`): Precaching auth'd HTML would serve stale, un-authed shells offline. The `exclude` option in `withSerwistInit` handles this.
- **Do NOT assume `public/sw.js` can coexist with `app/sw.ts`**: Serwist's `swDest: 'public/sw.js'` OVERWRITES the file at build time. The Phase 4 handlers must be inlined into `app/sw.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message extraction | Manual grep/replace of hardcoded strings | Systematic namespace-by-namespace pass using `getTranslations`/`useTranslations` | No special tooling needed for a fixed-size codebase; i18n-ally VSCode extension helps |
| Service worker precaching | Custom fetch handler cache | `@serwist/next` + `defaultCache` | Handles cache versioning, update lifecycle, network-first/cache-first strategies correctly |
| PWA manifest URL | Manually placed `manifest.json` in public/ | `app/manifest.ts` (Next.js Route Handler) | TypeScript-typed, automatically served at correct URL, no manual `<link>` tag needed (Next.js adds it via metadata) |
| Icon generation | Manual Photoshop/Figma export | realfavicongenerator.net or sharp CLI | Needs maskable safe zone (40% radius circle) + multiple sizes; tools handle this |
| Locale date/number formatting | `new Intl.DateTimeFormat()` inline | `useFormatter()` / `format.dateTime()` from next-intl | Locale-aware, consistent, integrates with message catalog |
| Cookie locale persistence | `localStorage` | Cookie (httpOnly: false, maxAge: 1yr) | localStorage not available during SSR; cookie is read by `getRequestConfig` on the server |

---

## Runtime State Inventory

Phase 7 introduces NEW i18n infrastructure and a NEW service worker but involves no renaming.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no message keys or locale preferences persisted in DB | None |
| Live service config | None — no external services store locale config | None |
| OS-registered state | None | None |
| Secrets/env vars | None new — existing VAPID keys unchanged; push SW merged not replaced at runtime | None |
| Build artifacts | `public/sw.js` — currently the Phase 4 push-only SW, committed to git; Serwist will overwrite it at build time | Add `public/sw.js` and `public/swe-worker*` to `.gitignore` in Wave 0; delete committed copy |

---

## Common Pitfalls

### Pitfall 1: Serwist + opennext build — vendor chunk corruption
**What goes wrong:** `withSerwist` adds a webpack plugin that may interfere with
`@opennextjs/cloudflare`'s own webpack transform, producing a corrupted `.open-next/worker.js`
with missing vendor chunks (this project has already experienced one vendor-chunk corruption issue
per CONTEXT.md notes).
**Why it happens:** Both Serwist's webpack plugin and opennext's build transform manipulate
webpack output; plugin order matters.
**How to avoid:** Compose `withSerwist(withNextIntl(nextConfig))` (Serwist outermost). Run
`pnpm preview` (full opennext build + preview) in Wave 0 BEFORE writing the full precache config.
If the Worker fails to start (HTTP 500 on all routes after `opennextjs-cloudflare build`), that
is the corruption signal.
**Warning signs:** `opennextjs-cloudflare build` completes but `pnpm preview` returns 500 on all
routes; or the build produces warnings about missing modules.
**Fallback:** If confirmed incompatible — remove `withSerwist` from next.config.ts; keep
`app/manifest.ts` + icons + add a `<link rel="manifest">` manually; extend `public/sw.js` to
add a `fetch` listener with a cache-first strategy for the app shell. This still satisfies
PUB-04 "installable" (manifest + SW + HTTPS = installable). Document in RESEARCH as a confirmed
go/no-go decision.

### Pitfall 2: NextIntlClientProvider provider order with Clerk
**What goes wrong:** `NextIntlClientProvider` placed INSIDE `<Providers>` (which is a Client
Component) causes `messages` not to be auto-inherited from the server, producing a hydration
mismatch or an empty message set.
**Why it happens:** `NextIntlClientProvider` only auto-inherits from a parent SERVER Component.
If it is nested inside a client component (`<Providers>`), the automatic inheritance breaks.
**How to avoid:** Keep `NextIntlClientProvider` in `layout.tsx` (a Server Component), wrapping
`<Providers>` — not inside it. The layout renders: `ClerkProvider > NextIntlClientProvider > Providers > children`.
**Warning signs:** Console warning "NextIntlClientProvider: No messages were configured";
Gujarati/Hindi pages show English text.

### Pitfall 3: hydration mismatch from cookie-driven locale
**What goes wrong:** Server renders in locale X (from cookie), client hydrates and detects a
different locale from `navigator.language`, causing a React hydration mismatch warning.
**Why it happens:** The server reads the NEXT_LOCALE cookie; if the client tries to re-detect
locale independently, they can disagree.
**How to avoid:** Never independently detect locale in client JS. The `LanguageSwitcher` reads
the current locale from the `useLocale()` next-intl hook (which reflects the server-set locale),
not from `navigator.language`. Do not run locale detection in a `useEffect`.
**Warning signs:** React `console.error` mentioning "Hydration failed"; text flickers on load.

### Pitfall 4: impactReport requires non-null date bounds
**What goes wrong:** Passing `null` or `undefined` to `pickupsRepo.impactReport(from, to)` causes
a TypeScript error; the function signature requires two `Date` arguments.
**Why it happens:** The repo method was designed for the admin date-range filter. It uses
`gte(pickups.deliveredAt, from)` and `lte(pickups.deliveredAt, to)` unconditionally.
**How to avoid:** Wrap with `new Date(0)` (epoch) and `new Date(9999, 0, 1)` (far future) for
the all-time public counter. [VERIFIED: pickups.ts repo code in repo, line 199-224]

### Pitfall 5: SW scope conflict — single SW at /sw.js
**What goes wrong:** If the existing Phase 4 `public/sw.js` registration (in
`usePushSubscription.ts`) uses a hardcoded path `/sw.js`, and Serwist also registers at `/sw.js`,
there is only one scope controller — this is CORRECT and intended. But if Serwist changes the
output path or scope, push subscriptions will break.
**Why it happens:** A push subscription is bound to the SW registration's scope. If the scope
changes, existing subscriptions become unreachable.
**How to avoid:** Keep `swDest: 'public/sw.js'` so the output path stays `/sw.js`. Keep scope
at `/` (the default). Never change `swUrl` or `scope` in withSerwistInit unless the push
subscriptions are also migrated.
**Warning signs:** Existing push subscribers stop receiving notifications after SW update.

### Pitfall 6: Noto Sans Gujarati not available via next/font
**What goes wrong:** Attempting to import `Noto_Sans_Gujarati` from `next/font/google` fails
at build time or produces missing-subset warnings.
**Why it happens:** Next.js `next/font/google` does not cover all Google Font families; Noto
Sans Gujarati subset coverage is inconsistent. The existing `layout.tsx` already documents this
(comment: "Gujarati script fallback (next/font coverage is inconsistent)") and uses a Google
Fonts `<link>` as the fallback.
**How to avoid:** Leave the existing `<link>` tag for Noto Sans Gujarati. Do not attempt to move
it to `next/font`. [VERIFIED: existing layout.tsx lines 53-57]

### Pitfall 7: manifest.webmanifest vs manifest.json — middleware matcher
**What goes wrong:** If the Clerk middleware catches requests to `/manifest.webmanifest`, it
returns a redirect-to-sign-in for unauthenticated users, breaking the PWA install.
**Why it happens:** The middleware runs on all routes by default.
**How to avoid:** Already handled — the existing middleware matcher regex excludes `.webmanifest`.
No action needed. [VERIFIED: src/middleware.ts line 53 grep confirms `webmanifest` excluded]

### Pitfall 8: dark mode and theme_color mismatch
**What goes wrong:** `theme_color` in manifest.ts is a single static value (saffron). In dark
mode, the browser chrome may show an orange bar while the app background is dark — visually jarring.
**Why it happens:** The manifest `theme_color` has no dark/light variant; it is one value.
**How to avoid:** Use the `<meta name="theme-color" media="(prefers-color-scheme: dark)">` pair
in `layout.tsx` metadata to override for dark mode while keeping manifest theme_color for the
PWA chrome. Or accept the saffron chrome in dark mode (brand-consistent enough for MVP).

---

## Code Examples

### getTranslations in Server Component

```typescript
// Source: next-intl.dev/docs/usage/configuration
import { getTranslations } from 'next-intl/server';

export default async function LandingPage() {
  const t = await getTranslations('landing');
  return <h1>{t('hero.headline')}</h1>;
}
```

### useTranslations in Client Component

```typescript
// Source: next-intl.dev/docs/usage/configuration
'use client';
import { useTranslations } from 'next-intl';

export function ImpactCounter({ servings }: { servings: number }) {
  const t = useTranslations('landing');
  return <span>{t('counter.servings', { count: servings })}</span>;
}
```

### Namespace JSON structure (recommended)

```json
// src/i18n/messages/en/common.json
{
  "nav": {
    "home": "Home",
    "signIn": "Sign in",
    "signUp": "Get started",
    "dashboard": "Dashboard"
  },
  "footer": {
    "contact": "Contact",
    "language": "Language",
    "rights": "© {year} Rajyash Foundation"
  },
  "status": {
    "requested": "Requested",
    "accepted": "Accepted",
    "en_route": "En route",
    "picked_up": "Picked up",
    "delivered": "Delivered",
    "cancelled": "Cancelled"
  }
}
```

```json
// src/i18n/messages/en/landing.json
{
  "hero": {
    "headline": "Rescuing surplus food, with warmth.",
    "subheadline": "Connecting surplus food to people in need across Ahmedabad."
  },
  "counter": {
    "servings": "{count, number} servings rescued",
    "kg": "{count, number} kg rescued",
    "deliveries": "{count, number} deliveries completed"
  },
  "howItWorks": {
    "title": "How it works",
    "step1": "Donor posts surplus food",
    "step2": "Volunteer claims and picks up",
    "step3": "Food reaches people in need"
  },
  "cta": {
    "volunteer": "Become a volunteer",
    "donor": "Donate food"
  }
}
```

### Icon generation (Wave 0)

Icons needed: `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`.
No library required — use [realfavicongenerator.net](https://realfavicongenerator.net/) with the
Rajyash foundation logo or saffron brand mark. For maskable: the logo must be within a centered
circle of radius 40% of the icon width. [CITED: web.dev/learn/pwa/web-app-manifest]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa | @serwist/next | 2023-2024 | next-pwa unmaintained, no App Router support; Serwist is the maintained successor |
| next-intl v3 `unstable_setRequestLocale` | next-intl v4 `getRequestConfig` returning locale | next-intl 4.0 (2024) | No more unstable API; locale returned explicitly from getRequestConfig |
| next-intl v3 manual message passing to provider | next-intl v4 auto-inheritance | next-intl 4.0 (2024) | `NextIntlClientProvider` no longer needs explicit `messages` prop when in a Server Component tree |
| `public/sw.js` (Phase 4 minimal push SW) | `app/sw.ts` (Serwist source) compiled → `public/sw.js` | Phase 7 | Push handlers merged into Serwist SW; old standalone file deleted from git |

**Deprecated/outdated:**
- `next-intl/middleware` for cookie mode: Not deprecated, but NOT needed for cookie/without-routing setup. Using it would add complexity with no benefit.
- `next-pwa`: Deprecated, unmaintained, last release 2022.
- `public/sw.js` as a standalone committed file: Replaced by `app/sw.ts` + `.gitignore` entry.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `revalidatePath('/', 'layout')` + `router.refresh()` is the stable locale-switch pattern for next-intl v4 cookie mode | Pattern 2 | If unstable, locale switch may not re-render server components; fallback: `router.push(router.asPath)` or page reload |
| A2 | Custom push/notificationclick listeners registered BEFORE `serwist.addEventListeners()` do not conflict with Serwist's own listeners | Pattern 3 / Pitfall 1 | If they conflict, push notifications break; fix: move push handler to `importScripts('./push-handler.js')` pattern and keep push handler as a separate non-Serwist file |
| A3 | `withSerwist` composes cleanly with `withNextIntl` and `@opennextjs/cloudflare` webpack transform | Pattern 1 / Pitfall 1 | Build corruption — fall back to minimal manifest + extended public/sw.js (documented fallback) |
| A4 | `unstable_cache` with `revalidate: 300` provides per-isolate in-memory caching on CF Workers without R2/KV configured | Pattern 5 | If caching does nothing (always fresh), the impact counter hits DB every request — acceptable for MVP low-traffic NGO, not a correctness failure |
| A5 | Serwist's `exclude` option accepts regex patterns to exclude auth'd routes from precache | Pattern 1 (next.config.ts) | If not supported, auth'd route shells could be precached and served stale offline; fix: use `dontCacheBustURLsMatching` + `maximumFileSizeToCacheInBytes: 0` for those routes |
| A6 | In next-intl v4, `NextIntlClientProvider` placed as a Server Component parent correctly passes locale to all nested Client Components without explicit props | Pattern 1 (layout.tsx) | If not, client components show English regardless of locale; fix: pass `locale` and `messages` explicitly as props to the provider |

**Confirmed (not assumed):**
- next-intl v4.13.0 is the latest version [VERIFIED: npm registry search]
- @serwist/next v9.5.11 is the latest version [VERIFIED: npm registry search]
- Next.js PWA guide explicitly states Serwist requires webpack [CITED: nextjs.org/docs/app/guides/progressive-web-apps]
- @opennextjs/cloudflare uses webpack for its production build (not Turbopack) [VERIFIED: opennext issue tracker]
- The existing middleware matcher excludes `.webmanifest` and SW registration paths [VERIFIED: src/middleware.ts]
- `pickupsRepo.impactReport` requires two `Date` args (non-nullable bounds) [VERIFIED: src/server/db/repositories/pickups.ts]
- The existing layout.tsx already loads Noto Sans Gujarati via `<link>` (next/font coverage inconsistent) [VERIFIED: src/app/layout.tsx]
- `public/sw.js` is currently the Phase 4 minimal push SW, committed to git [VERIFIED: public/sw.js read]
- `NextIntlClientProvider` in v4 auto-inherits `messages`, `locale`, `now`, `timeZone`, `formats` from parent Server Component [CITED: next-intl.dev/docs/usage/configuration]

---

## Open Questions

1. **Serwist + opennext webpack compatibility (highest priority)**
   - What we know: Official Next.js docs say Serwist requires webpack; opennext build uses webpack; no documented incompatibility found
   - What's unclear: Whether the specific webpack transform opennext applies conflicts with Serwist's InjectManifest plugin
   - Recommendation: Make Wave 0 task "Run `pnpm preview` after adding `withSerwist`" a go/no-go gate BEFORE any other implementation work. If it fails in Wave 0, switch to fallback path immediately.

2. **next-intl message namespace strategy — merge vs. per-namespace lazy load**
   - What we know: next-intl supports both merging all messages at once (simpler) and lazy per-namespace loading (smaller initial payload)
   - What's unclear: For a ~500-string retrofit, whether lazy loading is worth the complexity
   - Recommendation: Start with merged per-locale file (`en.json`, `gu.json`, `hi.json`) for simplicity; split into namespaces only if the file grows past ~200KB (unlikely for this app).

3. **Volunteer signup prefill — `defaultRole` mechanism in Clerk onboarding**
   - What we know: Phase 1 onboarding flow (`src/app/onboarding`) already handles role selection; the CTA should bypass donor/volunteer choice and default to volunteer
   - What's unclear: Whether a URL param (`?role=volunteer`) can be passed to `/sign-up` and carried through to `/onboarding`, or whether the landing page CTA links directly to `/sign-up?intent=volunteer`
   - Recommendation: Pass `?role=volunteer` as a query param to the onboarding page; the onboarding server action can read it via `searchParams` and skip the role-selection step.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / pnpm | Install deps | ✓ | (existing dev env) | — |
| next-intl | I18N-01/02/03 | ✗ (not installed) | 4.13.0 | None — must install |
| @serwist/next | PUB-04 | ✗ (not installed) | 9.5.11 | Minimal manifest + extended public/sw.js |
| serwist (dev) | PUB-04 | ✗ (not installed) | 9.5.11 | Same fallback as above |
| Icon files (192/512/maskable) | PUB-04 | ✗ (no icons in public/) | — | Generate with realfavicongenerator.net in Wave 0 |
| `public/sw.js` (Serwist output) | PUB-04 | Exists (Phase 4 push SW) | — | Will be overwritten/deleted in Wave 0 |

**Missing with no fallback:** next-intl — must install.
**Missing with fallback:** @serwist/next + serwist — minimal PWA fallback documented.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + Testing Library |
| Config file | (detect existing vitest config) |
| Quick run command | `pnpm test:run` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | `getRequestConfig` returns valid locale from cookie | unit | `pnpm test:run -- src/i18n/request.test.ts` | ❌ Wave 0 |
| I18N-01 | Zod schema for locale switcher validates en/gu/hi only | unit | `pnpm test:run -- src/features/public/validations/` | ❌ Wave 0 |
| I18N-02 | `setLocaleCookieAction` sets NEXT_LOCALE cookie with correct options | unit | `pnpm test:run -- src/features/public/actions/` | ❌ Wave 0 |
| PUB-02 | `getCachedImpactReport` returns `{ servings, kg, count }` shape | unit (mock) | `pnpm test:run -- src/server/db/repositories/impact.test.ts` | ❌ Wave 0 |
| PUB-04 | manifest.ts returns required PWA fields (name, icons, display) | unit | `pnpm test:run -- src/app/manifest.test.ts` | ❌ Wave 0 |

Per testing-practices.md: do NOT test constants, barrels, plain presentational components, or
"renders without throwing". The above tests cover real behavior (cookie logic, data shape, manifest
contract).

### Sampling Rate
- **Per task commit:** `pnpm test:run` (fast — no browser)
- **Per wave merge:** `pnpm test:run && pnpm typecheck && pnpm lint`
- **Phase gate:** Full suite green + `pnpm preview` (opennext build) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/i18n/request.test.ts` — covers I18N-01 cookie locale detection
- [ ] `src/features/public/actions/setLocale.test.ts` — covers I18N-02 cookie setting
- [ ] `src/server/db/repositories/impact.test.ts` — covers PUB-02 aggregate shape
- [ ] `src/app/manifest.test.ts` — covers PUB-04 manifest contract
- [ ] Framework install: `pnpm add next-intl @serwist/next && pnpm add -D serwist`
- [ ] Icon generation: 3 icon files in `public/` (192, 512, 512-maskable)
- [ ] Delete `public/sw.js` from git (will be rebuilt by Serwist at build time)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public pages require no auth; Clerk handles authed routes |
| V3 Session Management | partial | NEXT_LOCALE cookie: not sensitive, but should use `sameSite: lax` + `secure: true` in prod |
| V4 Access Control | yes | Public landing page must NOT call any authed server actions; `pickupsRepo.impactReport` is aggregate-only — no per-record leak |
| V5 Input Validation | yes | Locale value from cookie must be validated against allowlist `['en', 'gu', 'hi']` before use (already in Pattern 1) |
| V6 Cryptography | no | No new crypto; push VAPID keys unchanged from Phase 4 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `next` query param in Clerk sign-up | Spoofing | Already handled by Clerk; volunteer CTA uses `/sign-up` (no external redirect) |
| Locale injection (cookie poisoning) | Tampering | Validate locale against `['en','gu','hi']` allowlist; fallback to 'en' for invalid values |
| Precached stale auth HTML served offline | Elevation of Privilege | Exclude `portal/**`, `admin/**`, `api/**` from Serwist precache list |
| Public page calling authed DB queries | Information Disclosure | `impactReport` returns only aggregate counts — no user IDs, emails, or addresses leaked |

---

## Sources

### Primary (HIGH confidence)
- [next-intl official docs — without-i18n-routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) — cookie mode setup
- [next-intl official docs — configuration](https://next-intl.dev/docs/usage/configuration) — getRequestConfig, NextIntlClientProvider auto-inheritance
- [Serwist official docs — @serwist/next getting started](https://serwist.pages.dev/docs/next/getting-started) — withSerwist config, app/sw.ts, tsconfig
- [Next.js official PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — manifest.ts, SW registration, Serwist requires webpack confirmation
- [Next.js manifest.json API reference](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) — MetadataRoute.Manifest type
- [opennext.js.org — caching](https://opennext.js.org/cloudflare/caching) — ISR/R2/KV requirements; SSR works without config
- [opennext.js.org — assets](https://opennext.js.org/cloudflare/howtos/assets) — public/ files served by Workers Static Assets
- [src/middleware.ts](../../../src/middleware.ts) — verified webmanifest exclusion in matcher
- [src/server/db/repositories/pickups.ts](../../../src/server/db/repositories/pickups.ts) — verified impactReport signature
- [src/app/layout.tsx](../../../src/app/layout.tsx) — verified Noto Gujarati link fallback; verified existing font vars
- [public/sw.js](../../../public/sw.js) — verified Phase 4 push SW content to be merged

### Secondary (MEDIUM confidence)
- [next-intl 4.0 blog post](https://next-intl.dev/blog/next-intl-4-0) — v4 breaking changes and auto-inheritance
- [next-serwist-pwa-example tsconfig](https://github.com/uriseroussi/next-serwist-pwa-example/blob/main/tsconfig.json) — lib: ["dom", "webworker"] pattern
- [next-intl GitHub discussion #1096](https://github.com/amannn/next-intl/discussions/1096) — locale switch patterns

### Tertiary (LOW confidence — community sources, not fully verified)
- [DEV.to — Next.js 15 PWA on Cloudflare Pages](https://dev.to/ajramirezdev/-how-i-deployed-a-nextjs-15-pwa-on-cloudflare-pages-with-zero-backend-iha) — uses @cloudflare/next-on-pages not opennext (different adapter)
- npm registry search results for version numbers (indirect confirmation)

---

## Metadata

**Confidence breakdown:**
- next-intl setup (cookie mode, no middleware, provider): HIGH — fully documented in official next-intl docs, verified patterns
- Serwist integration + push handler merge: MEDIUM — documented for Next.js; opennext compatibility is ASSUMED (A3 is the highest risk assumption)
- Cloudflare Workers caching without R2/KV: MEDIUM — "SSR works without config" confirmed; per-isolate memory caching is ASSUMED
- Locale switching (revalidatePath + router.refresh): MEDIUM — community confirmed but next-intl v4 docs gap (A1)
- PWA manifest + icons + install criteria: HIGH — MDN + Next.js official docs
- Font rendering (GU/HI): HIGH — existing layout.tsx already has the right approach

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days for next-intl; 14 days for Serwist/opennext compatibility which is actively changing)
