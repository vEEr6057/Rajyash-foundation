# Phase 7: Public Site + i18n + PWA - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 19 new/modified files across 4 work-streams
**Analogs found:** 18 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/i18n/request.ts` | config | request-response | `src/middleware.ts` (cookie read shape) | role-match |
| `src/i18n/messages/en/common.json` | config | — | `src/config/constants.ts` (label maps) | partial |
| `src/i18n/messages/en/landing.json` | config | — | `src/config/constants.ts` | partial |
| `src/i18n/messages/en/portal.json` | config | — | `src/config/constants.ts` (PICKUP_STATUS_LABELS) | partial |
| `src/i18n/messages/en/admin.json` | config | — | `src/config/constants.ts` (PARTNER_TYPE_LABELS) | partial |
| `src/features/public/actions/setLocale.ts` | server action | request-response | `src/features/pickups/actions/pickupActions.ts` | exact |
| `src/features/public/components/LanguageSwitcher.tsx` | component | request-response | `src/features/admin/components/ImpactReport.tsx` (router action + useTransition shape) | role-match |
| `src/features/public/components/LandingPage.tsx` | component | request-response | `src/app/page.tsx` | exact |
| `src/features/public/components/ImpactCounter.tsx` | component | request-response | (useCountUp in `tokens/motion.ts`) | exact |
| `src/features/public/components/HowItWorks.tsx` | component | — | `src/app/page.tsx` | role-match |
| `src/features/public/components/PublicHeader.tsx` | component | request-response | `src/app/page.tsx` (Link+buttonVariants shape) | role-match |
| `src/features/public/index.ts` | utility | — | `src/features/pickups/components/PickupCard.tsx` barrel pattern | role-match |
| `src/server/db/repositories/impact.ts` | service | CRUD | `src/server/db/repositories/pickups.ts` (impactReport) | exact |
| `src/app/manifest.ts` | config | request-response | `src/app/page.tsx` (default export, metadata shape) | partial |
| `app/sw.ts` | utility | event-driven | `public/sw.js` | exact |
| `src/app/layout.tsx` (modify) | provider | request-response | itself | exact |
| `next.config.ts` (modify) | config | — | itself | exact |
| `tsconfig.json` (modify) | config | — | itself | exact |
| `src/config/constants.ts` (modify) | config | — | itself | exact |

---

## Pattern Assignments

### Work-stream 1: next-intl Scaffold (cookie mode)

---

#### `src/i18n/request.ts` (config, request-response)

**Analog:** `src/middleware.ts` — the existing Clerk middleware reads `sessionClaims` from the request context; `request.ts` reads a cookie from the request context. Same shape: intercept the request, inspect a header/cookie, return a derived value.

**Imports pattern** — copy the `cookies` import and async-function shape from the project's own server-side cookie usage:

```typescript
// Copy these import shapes — already used throughout the project's server actions
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
```

**Core pattern** (the full file is short — write it verbatim):

```typescript
// src/i18n/request.ts
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
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

Note: Start with a single merged file per locale (`en.json`, `gu.json`, `hi.json`) rather than per-namespace imports; split only if files exceed ~200 KB. The RESEARCH.md recommends this simpler start (Open Question 2).

**Error handling:** Invalid cookie value falls back silently to `'en'` — no throw needed. This matches the project's pattern in `src/middleware.ts` where `sessionClaims?.metadata?.role` uses optional chaining rather than throwing.

---

#### `src/i18n/messages/en/common.json`, `landing.json`, `portal.json`, `admin.json` (config)

**Analog:** `src/config/constants.ts` lines 67–74 (`PICKUP_STATUS_LABELS`) + lines 153–158 (`PARTNER_TYPE_LABELS`) — the project already has string label maps in TypeScript. The migration strategy is: every TypeScript string constant that renders in UI becomes a JSON key.

**Key source strings to extract** (read from existing components and replace with keys):

From `src/app/page.tsx` lines 13–17:
```
"Rescuing surplus food, with warmth."
"Connecting surplus food to people in need across Ahmedabad. Donors give, volunteers deliver."
"Go to dashboard"  /  "Get started"  /  "Sign in"
```

From `src/config/constants.ts` (PICKUP_STATUS_LABELS, lines 67–74): all 6 status strings → `common.status.*`

From `src/config/constants.ts` (PARTNER_TYPE_LABELS, lines 153–158): all 5 type strings → `common.partnerType.*`

From `src/config/constants.ts` (FOOD_CATEGORY_LABELS, lines 45–51): all 5 strings → `common.foodCategory.*`

**Namespace structure to use** (mirrors RESEARCH.md §Code Examples):
- `common.json`: nav, footer, status, foodCategory, partnerType, buttons (shared across public + portal + admin)
- `landing.json`: hero, counter, howItWorks, cta, about (PUB-01/02/03 only)
- `portal.json`: pickup (form, detail, board), notifications, profile
- `admin.json`: pickups (filters, table), users, reports, partners

---

#### `src/app/layout.tsx` (modify — add NextIntlClientProvider)

**Analog:** itself — read lines 36–66 above. The modification is surgical: wrap `<Providers>` with `<NextIntlClientProvider>` while keeping `<ClerkProvider>` as the outermost wrapper.

**Exact insertion point** (line 60–62 currently reads):
```tsx
// CURRENT (src/app/layout.tsx lines 59-62):
<body className={`${bricolage.variable} ${mukta.variable} ${notoDevanagari.variable} antialiased`}>
  <Providers>{children}</Providers>
</body>
```

**After modification:**
```tsx
// src/app/layout.tsx — after change
import { NextIntlClientProvider } from 'next-intl';

// In RootLayout, inside <body>:
<body className={`${bricolage.variable} ${mukta.variable} ${notoDevanagari.variable} antialiased`}>
  <NextIntlClientProvider>
    <Providers>{children}</Providers>
  </NextIntlClientProvider>
</body>
// NextIntlClientProvider MUST be OUTSIDE <Providers> (which is 'use client').
// It is a Server Component here — auto-inherits locale+messages from getRequestConfig.
// PITFALL (RESEARCH §Pitfall 2): placing it inside <Providers> breaks auto-inheritance.
```

Also add to the `metadata` export: `<link rel="manifest" href="/manifest.webmanifest" />` via the `metadata.manifest` field if Next.js doesn't auto-inject it.

---

#### `src/features/public/actions/setLocale.ts` (server action, request-response)

**Analog:** `src/features/pickups/actions/pickupActions.ts` lines 1–60 — the canonical project server-action shape: `'use server'`, named function exports, `Result<T>` discriminated union return, `revalidatePath` for cache busting.

Also analog: `src/features/auth/actions/onboardingActions.ts` — simpler server action with `cookies()` write (concept) + logger on error.

**Imports pattern** (copy from `pickupActions.ts` lines 1–3):
```typescript
'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
// No logger needed — this action cannot meaningfully fail (cookie set is infallible).
```

**Core pattern** — copy the `Result<T>` type and function shape from `pickupActions.ts` lines 24–28, but simpler (no auth required — locale switch is unauthenticated):
```typescript
// src/features/public/actions/setLocale.ts
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const SUPPORTED_LOCALES = ['en', 'gu', 'hi'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function setLocaleCookieAction(locale: Locale): Promise<void> {
  // Validate against allowlist (RESEARCH §Security — V5 Input Validation)
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,  // 1 year — D-09 persistent
    httpOnly: false,               // must NOT be httpOnly — server reads cookie; RESEARCH §Anti-Patterns
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  revalidatePath('/', 'layout');  // forces Server Components to re-run getRequestConfig
}
```

**Note:** No `Result<T>` wrapper here — locale switching is idempotent and cannot produce a user-facing error. Unlike `completeOnboarding`, no session check is needed.

---

### Work-stream 2: i18n Retrofit

---

#### Server-component retrofit pattern

**Analog:** `src/app/page.tsx` lines 1–48 (server component) — currently has hardcoded EN strings.

**Before** (line 14):
```tsx
// src/app/page.tsx line 14 — hardcoded EN
<h1 className="font-display text-4xl ...">
  Rescuing surplus food, with warmth.
</h1>
```

**After** — inject `getTranslations` at the top of the function:
```tsx
// src/app/page.tsx — after retrofit
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('landing');
  // ...
  <h1 className="font-display text-4xl ...">
    {t('hero.headline')}
  </h1>
```

This is the only change per file — no structural rework. The function signature gains `async` if not already async (it already is: `async function HomePage()`).

---

#### Client-component retrofit pattern

**Analog:** `src/features/admin/components/ImpactReport.tsx` (client component with `'use client'`) — currently has hardcoded EN labels like `"From"`, `"To"`, `"Update"`.

**Before** (line 11):
```tsx
// 'use client' component — currently hardcoded
<label className="...">From<input ...></label>
```

**After** — add `useTranslations` at the top of the component function:
```tsx
'use client';
import { useTranslations } from 'next-intl';

export function ImpactReport({ current }: ...) {
  const t = useTranslations('admin');
  // ...
  <label className="...">{t('reports.from')}<input ...></label>
```

**Key rule:** Server components use `getTranslations` (async, from `next-intl/server`). Client components use `useTranslations` (sync hook, from `next-intl`). Never mix them.

---

#### Portal component retrofit example

**Analog:** `src/features/pickups/components/PickupCard.tsx` lines 1–39 — presentational server component with hardcoded format strings.

The `formatCategory` and `formatWindow` helpers in `src/features/pickups/lib/format.ts` may need to accept a `t` (translations function) for locale-aware labels, or the category labels move from `constants.ts` to `common.json`. Preferred approach: move `FOOD_CATEGORY_LABELS` strings to `common.json` + use `t('common.foodCategory.' + pickup.category)` in the component rather than the TS map. The TS map in `constants.ts` stays for non-UI uses (backend event names).

---

### Work-stream 3: Public Site + Impact Counter + Volunteer Signup

---

#### `src/server/db/repositories/impact.ts` (service, CRUD)

**Analog:** `src/server/db/repositories/pickups.ts` lines 1–5 (server-only import) + lines 199–224 (`impactReport`) — the function to wrap is already written; this file is a thin caching wrapper.

**Imports pattern** (mirror `pickups.ts` lines 1–2):
```typescript
// src/server/db/repositories/impact.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { pickupsRepo } from './pickups';
```

**Core pattern** — the full file:
```typescript
// src/server/db/repositories/impact.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { pickupsRepo } from './pickups';

// RESEARCH §Pitfall 4: impactReport requires non-null Date bounds.
// null / undefined cause a TypeScript error — use epoch + far future.
const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO   = new Date(9999, 0, 1);

export const getCachedImpactReport = unstable_cache(
  async () => pickupsRepo.impactReport(ALL_TIME_FROM, ALL_TIME_TO),
  ['impact-report-all-time'],
  { revalidate: 300 },  // 5-min TTL; per-isolate in-memory on CF Workers without R2
);
// Return type: Promise<{ servings: number; kg: number; count: number }>
// (inferred from pickupsRepo.impactReport return type — no re-declaration needed)
```

**Note:** `'server-only'` import is mandatory — mirrors all other repos. The `unstable_cache` key must be a stable string array (no dynamic segments).

---

#### `src/features/public/components/LandingPage.tsx` (component, request-response)

**Analog:** `src/app/page.tsx` — the current placeholder landing. `LandingPage` replaces its content as a server component composed of sub-components. The page file remains thin (orchestration only); the sections move to feature components.

**Imports pattern** (copy from `src/app/page.tsx` lines 1–4):
```tsx
// src/features/public/components/LandingPage.tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/config/constants';
import { getTranslations } from 'next-intl/server';
import { getCachedImpactReport } from '@/server/db/repositories/impact';
// Sub-components:
import { ImpactCounter } from './ImpactCounter';
import { HowItWorks } from './HowItWorks';
import { PublicHeader } from './PublicHeader';
```

**Core pattern** — thin server component, data fetch at top, pass to children (mirrors `src/app/page.tsx` + the server-component pattern from Phase 6 admin reports page):
```tsx
export default async function LandingPage() {
  const [t, impact] = await Promise.all([
    getTranslations('landing'),
    getCachedImpactReport(),
  ]);
  return (
    <main>
      {/* hero */}
      <section>
        <h1 className="font-display ...">{t('hero.headline')}</h1>
        <p>{t('hero.subheadline')}</p>
        <Link href={ROUTES.signUp + '?role=volunteer'} className={buttonVariants({ size: 'lg' })}>
          {t('cta.volunteer')}
        </Link>
        <Link href={ROUTES.signUp} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          {t('cta.donor')}
        </Link>
      </section>
      {/* impact counter — client component, receives server-fetched data */}
      <ImpactCounter servings={impact.servings} kg={impact.kg} count={impact.count} />
      <HowItWorks />
    </main>
  );
}
```

**Design tokens to use** (from `tokens/globals.css`, already in `src/app/globals.css`):
- Colors: `bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`, `bg-primary-soft`, `border-border`
- Never use `#C04E12` or `#2E7D46` inline when a token exists
- Motion: `revealContainer` + `revealItem` from `tokens/motion.ts` for public/generous budget scroll reveals

---

#### `src/features/public/components/ImpactCounter.tsx` (component, request-response)

**Analog:** `tokens/motion.ts` lines 96–117 (`useCountUp` function) — the complete implementation to call.

**Pattern** (copy from `tokens/motion.ts` lines 94–96 comments):
```tsx
// src/features/public/components/ImpactCounter.tsx
'use client';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useCountUp } from '@/../tokens/motion';
// Note: import path once tokens/motion.ts is moved to src/lib/ (if that happens in Phase 7);
// alternatively: import { useCountUp } from '@/lib/motion';

export function ImpactCounter({
  servings, kg, count,
}: { servings: number; kg: number; count: number }) {
  const t = useTranslations('landing');
  const servingsRef = useRef<HTMLSpanElement>(null);
  const kgRef       = useRef<HTMLSpanElement>(null);
  const countRef    = useRef<HTMLSpanElement>(null);

  useCountUp(servingsRef, servings);  // tokens/motion.ts line 99 — signature: (ref, to, opts?)
  useCountUp(kgRef, kg);
  useCountUp(countRef, count);

  return (
    <section aria-label={t('counter.label')}>
      <div>
        <span ref={servingsRef} className="tabular-nums font-display text-5xl font-extrabold text-primary">0</span>
        <p className="text-sm text-muted-foreground">{t('counter.servings', { count: servings })}</p>
      </div>
      <div>
        <span ref={kgRef} className="tabular-nums font-display text-5xl font-extrabold text-primary">0</span>
        <p className="text-sm text-muted-foreground">{t('counter.kg', { count: kg })}</p>
      </div>
      <div>
        <span ref={countRef} className="tabular-nums font-display text-5xl font-extrabold text-primary">0</span>
        <p className="text-sm text-muted-foreground">{t('counter.deliveries', { count: count })}</p>
      </div>
    </section>
  );
}
```

**Key detail:** `useCountUp` already handles `useReducedMotion` (tokens/motion.ts line 109: `if (reduced) { ref.current.textContent = format(to); return; }`) — no extra motion guard needed in this component.

**useCountUp signature** (tokens/motion.ts lines 99–103):
```typescript
export function useCountUp(
  ref: RefObject<HTMLElement>,
  to: number,
  opts: { duration?: number; format?: (n: number) => string } = {}
)
// Default format: Math.round(n).toLocaleString('en-IN')  ← uses en-IN regardless of locale.
// For locale-aware formatting pass: opts.format = (n) => Math.round(n).toLocaleString(locale)
```

---

#### Volunteer signup wiring (D-04)

**Analog:** `src/app/sign-up/[[...sign-up]]/page.tsx` (lines 1–11) + `src/app/onboarding/page.tsx` + `src/features/auth/components/OnboardingForm.tsx` lines 36–64.

The CTA link in LandingPage uses: `href={ROUTES.signUp + '?role=volunteer'}`. The onboarding page then reads `searchParams.role` and sets it as the default value in OnboardingForm:

```tsx
// src/app/onboarding/page.tsx — modify to accept searchParams
export default function OnboardingPage({
  searchParams,
}: { searchParams: Promise<{ role?: string }> }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>...</CardHeader>
        <CardContent>
          <OnboardingForm defaultRole={searchParams.then(sp => sp.role)} />
        </CardContent>
      </Card>
    </main>
  );
}
```

In `OnboardingForm.tsx`, add `defaultRole?: string` prop and pass it to `defaultValues`:
```tsx
// OnboardingForm.tsx — add defaultRole prop to defaultValues
const {
  ...
} = useForm<OnboardingInput>({
  resolver: zodResolver(onboardingSchema),
  defaultValues: {
    city: DEFAULT_CITY,
    role: (defaultRole === 'volunteer' || defaultRole === 'donor') ? defaultRole : undefined,
  },
});
```

The `SELECTABLE_ROLES` check (from `src/config/constants.ts` line 10) guards against invalid role injection. No change to `completeOnboarding` server action — role is still validated by `onboardingSchema`.

---

#### `src/features/public/components/LanguageSwitcher.tsx` (component, request-response)

**Analog:** `src/features/admin/components/ImpactReport.tsx` lines 1–50 — a `'use client'` component that fires an action + `useRouter` for navigation. The `ImpactReport` uses `router.push()`; `LanguageSwitcher` uses `router.refresh()` instead (re-renders server components in place). Also `useTransition` shape from any portal button with pending state.

**Imports pattern** (mirrors ImpactReport.tsx lines 1–5):
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { setLocaleCookieAction } from '../actions/setLocale';
```

**Core pattern:**
```tsx
const LOCALE_LABELS: Record<'en' | 'gu' | 'hi', string> = {
  en: 'EN', gu: 'ગુ', hi: 'हि',
};

export function LanguageSwitcher() {
  const router  = useRouter();
  const locale  = useLocale();  // next-intl hook — reflects server-set cookie, no independent detection
  const t       = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(next: 'en' | 'gu' | 'hi') {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleCookieAction(next);
      router.refresh();  // re-runs Server Components with new cookie — RESEARCH §Pattern 2
    });
  }
  // render: map over ['en','gu','hi'], highlight current locale, disable while isPending
}
```

**PITFALL (RESEARCH §Pitfall 3):** `useLocale()` reads the server-set locale (consistent). Do NOT use `navigator.language` or any client-side locale detection — causes hydration mismatch.

---

### Work-stream 4: PWA (Serwist)

---

#### `app/sw.ts` (utility, event-driven)

**Analog:** `public/sw.js` lines 1–41 — the EXACT push + notificationclick handlers to inline. This file REPLACES `public/sw.js` at build time; the git-committed `public/sw.js` is deleted from the repository in Wave 0.

**Push handler** (VERBATIM from `public/sw.js` lines 8–23 — do not paraphrase):
```javascript
// public/sw.js lines 8–23 — copy verbatim into app/sw.ts as TypeScript
self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = {};
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'Food Rescue', {
      body: d.body || '',
      data: { url: d.url || '/portal/dashboard' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});
```

**Notificationclick handler** (VERBATIM from `public/sw.js` lines 25–41):
```javascript
// public/sw.js lines 25–41 — copy verbatim
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    '/portal/dashboard';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if (w.url.includes(url) && 'focus' in w) return w.focus();
        }
        return clients.openWindow(url);
      }),
  );
});
```

**Full `app/sw.ts` template** (push handlers BEFORE `serwist.addEventListeners()` — RESEARCH §Pattern 3):
```typescript
// app/sw.ts
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

// ── Phase 4 push handlers (VERBATIM from public/sw.js) ─────────────
// [paste push handler above]
// [paste notificationclick handler above]

// ── Serwist precache (must come AFTER push handlers) ───────────────
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
serwist.addEventListeners();
```

**SW registration** — `usePushSubscription.ts` line 51 already registers at `'/sw.js'`. The Serwist output path is `swDest: 'public/sw.js'`, so the path stays identical. No change to `usePushSubscription.ts`.

---

#### `src/app/manifest.ts` (config, request-response)

**Analog:** `src/app/page.tsx` — same pattern of a default-export function at the `app/` layer returning data. The difference: `manifest.ts` returns `MetadataRoute.Manifest` instead of JSX.

**Core pattern** (full file — short, RESEARCH §Pattern 4):
```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rajyash Food Rescue',
    short_name: 'Food Rescue',
    description: 'Rescue surplus food and get it to people in need across Ahmedabad.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF7F0',   // --color-background (cream) from design tokens
    theme_color: '#C04E12',        // --color-primary (saffron) from design tokens
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png',         sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png',         sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png',sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

**Note:** Use hex values from design tokens here — the manifest requires static strings, not CSS custom properties.

---

#### `next.config.ts` (modify)

**Analog:** itself — read lines 1–10 above. The modification wraps the existing `nextConfig` with both plugins.

**Current** (next.config.ts lines 1–10):
```typescript
import './src/config/env';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {};

export default nextConfig;

initOpenNextCloudflareForDev();
```

**After modification:**
```typescript
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
  // RESEARCH §Anti-Patterns: exclude authed routes — no stale auth HTML served offline
  exclude: [/\/api\//, /\/__clerk\//, /\/admin\//, /\/portal\//],
});

const nextConfig: NextConfig = {};

// RESEARCH §Pitfall 1: Serwist outermost (wraps withNextIntl wraps nextConfig)
// Run `pnpm preview` in Wave 0 BEFORE writing full precache config — go/no-go gate.
export default withSerwist(withNextIntl(nextConfig));

initOpenNextCloudflareForDev();
```

**CRITICAL RISK:** If `pnpm preview` returns HTTP 500 on all routes after this change, the Serwist + opennext build is incompatible. Fallback: remove `withSerwist`, keep `app/manifest.ts` + icons + extend `public/sw.js` manually (RESEARCH §Pitfall 1 fallback path).

---

#### `tsconfig.json` (modify)

**Analog:** itself — read lines 1–27 above.

**Current `lib`** (line 7): `["dom", "dom.iterable", "esnext"]`

**After modification** — add `"webworker"` to lib + Serwist types + exclude built SW:
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  },
  "exclude": ["node_modules", "public/sw.js", "public/swe-worker*"]
}
```

**Note:** Adding `"webworker"` globally is the clean approach vs. `/// <reference lib="webworker" />` per-file (RESEARCH §Pattern 6). The `exclude` prevents the built SW output from being type-checked as a module (it's the build artifact, not source).

---

#### `src/config/constants.ts` (modify — add public routes)

**Analog:** itself lines 15–32 (`ROUTES` object). Extend with new public route constants.

**Addition** after line 20 (`onboarding: '/onboarding'`):
```typescript
// Public site (Phase 7)
becomeVolunteer: '/sign-up?role=volunteer',
// No new page route needed — volunteer CTA is a queryParam on sign-up
```

If a separate `/volunteer` page is created in `app/(public)/volunteer/page.tsx`, add:
```typescript
volunteer: '/volunteer',
```

---

## Shared Patterns

### Server action shape (apply to `setLocale.ts`)

**Source:** `src/features/pickups/actions/pickupActions.ts` lines 1–3 and `src/features/auth/actions/onboardingActions.ts` lines 1–11

Every server action in this project:
- Starts with `'use server'` directive
- Uses named exports (not default exports)
- Uses `logger` from `@/lib/logger` for errors (no `console.error`)
- Returns a typed result or `void` — no untyped `any`

`setLocale.ts` is simpler (returns `void`, no session check) but must still follow the `'use server'` + named-export convention.

### Design tokens (apply to all new components)

**Source:** `src/app/globals.css` (imported from `tokens/globals.css`)

All new public components must use Tailwind token classes. Quick reference for the public site:
- Primary/saffron: `text-primary`, `bg-primary`, `border-primary`, `bg-primary-soft`
- Background/cream: `bg-background`, `bg-surface`, `bg-card`
- Text: `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`
- Green (volunteer CTAs): `text-secondary`, `bg-secondary`
- No hardcoded `#C04E12`, `#2E7D46`, or `#FBF7F0` in className (manifest.ts is the only exception — needs raw hex for static JSON)

### Motion (apply to public site components only)

**Source:** `tokens/motion.ts` lines 27–51 — `revealContainer` + `revealItem` + `safe()`

Public pages use the **generous** motion budget. Pattern for scroll-reveal sections:
```tsx
// src/features/public/components/HowItWorks.tsx
import { motion, useReducedMotion } from 'motion/react';
import { revealContainer, revealItem, safe } from '@/../tokens/motion';

export function HowItWorks() {
  const reduced = useReducedMotion();
  return (
    <motion.section
      variants={safe(!!reduced, revealContainer)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3, margin: '-10% 0px' }}
    >
      {/* steps */}
      <motion.div variants={safe(!!reduced, revealItem)}>{/* step */}</motion.div>
    </motion.section>
  );
}
```

### Import path aliases (apply to all new files)

**Source:** `tsconfig.json` lines 22–24 — `"@/*": ["./src/*"]`

All imports from `src/` use `@/`. Example: `import { logger } from '@/lib/logger'`. The `tokens/` directory is NOT under `src/`, so it needs a relative import or should be moved to `src/lib/` as part of Phase 7 cleanup.

### `'server-only'` guard (apply to repository files)

**Source:** `src/server/db/repositories/pickups.ts` line 1 — `import 'server-only'`

Every file in `src/server/db/repositories/` starts with `import 'server-only'`. The new `impact.ts` must too.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/i18n/messages/gu/*.json` | config | — | No Gujarati content exists anywhere in the codebase; must be machine-generated from EN source |
| `src/i18n/messages/hi/*.json` | config | — | No Hindi content exists; same as above |

These are pure content files. Executor should generate them by translating the EN JSON values to Gujarati and Hindi, adding a top-level `"_review": "pending"` marker per D-08.

---

## Metadata

**Analog search scope:** `src/app/`, `src/features/`, `src/server/`, `public/`, `tokens/`, `next.config.ts`, `tsconfig.json`
**Files scanned:** 19 source files read + 8 glob searches
**Pattern extraction date:** 2026-06-27

---

## Wave 0 Gates (from RESEARCH.md — executor must do these first)

Before any implementation:
1. `pnpm add next-intl @serwist/next && pnpm add -D serwist`
2. Add `withSerwist(withNextIntl(nextConfig))` to `next.config.ts`
3. Run `pnpm preview` (opennext full build + Cloudflare preview) — if HTTP 500 on all routes, switch to Serwist fallback path immediately
4. Delete `public/sw.js` from git; add `public/sw.js` and `public/swe-worker*` to `.gitignore`
5. Generate 3 icon files: `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`
