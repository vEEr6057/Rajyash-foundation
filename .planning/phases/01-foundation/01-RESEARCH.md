# Phase 1: Foundation - Research

**Researched:** 2026-06-25
**Domain:** Next.js 15 App Router + Cloudflare Workers (@opennextjs/cloudflare) + Clerk auth + Drizzle/Supabase
**Confidence:** HIGH (verified against official docs and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Roles are `donor`, `volunteer`, `admin`. User picks donor or volunteer at onboarding (not at signup). Admin is assigned manually (Clerk `publicMetadata`, seeded/elevated by an existing admin) — never self-selectable.
- **D-02:** Role lives in Clerk user metadata (`publicMetadata.role`); middleware reads it for route protection, and every server action independently re-checks session + role + resource ownership (AUTH-05 — middleware alone is never trusted).
- **D-03:** Route groups gate access: `(public)` open, `(portal)` requires auth + onboarding-complete, `(admin)` requires `role=admin`. Wrong-role access returns 403.
- **D-04:** Use Clerk's prebuilt components (`<SignIn/>`, `<SignUp/>`, OTP flows) themed via Clerk's `appearance` API to saffron design tokens — not fully custom forms.
- **D-05:** After first signup, a one-step onboarding: role-select (donor/volunteer) + minimal profile (name; city defaults to Ahmedabad; phone if not already from OTP). Persist an onboarding-complete flag (Clerk metadata); the `(portal)` is gated behind it — incomplete users are redirected to onboarding.
- **D-06:** Validate all required env vars at boot via Zod (`src/config/env.ts`); the app refuses to start on any missing/malformed var (AUTH-06 / our env-validation convention).

### Claude's Discretion
- Postgres-from-Workers driver/pooler — decide between Cloudflare Hyperdrive vs Supabase pooler (port 6543, PgBouncer transaction mode) + serverless driver. Default lean: Supabase pooler now, Hyperdrive only if latency/connection limits bite. Migrations use the direct connection (port 5432), not the pooler.
- Project scaffold specifics (create-next-app flags, src/ layout reconciling App Router route groups with `src/features/<name>/`), shadcn init, fonts via `next/font` vs `<link>`, hex→HSL token conversion for opacity modifiers — all Claude/planner discretion, follow `.claude/rules/` + `docs/design/UI-SPEC.md`.
- Cloudflare deploy via `@opennextjs/cloudflare`; cron via Cloudflare Cron Triggers (not needed until later phases).

### Deferred Ideas (OUT OF SCOPE)
- SMS/WhatsApp notifications (NOT-06/07) and DLT registration — v2/when-funded, not Phase 1.
- Public marketing site, i18n translations (GU/HI), PWA — Phase 7.
- Razorpay payment integration — Phase 5 (only the KYC submission is a Phase-1 parallel external track, no code).
- Foundation-supplied inputs (logo, real content, translations, legal/FSSAI, privacy policy) — tracked outside the build; chase in parallel.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in with email | Clerk `<SignIn/>` component with emailAddress strategy + `clerkMiddleware` |
| AUTH-02 | User can sign in / verify via phone OTP | Clerk native phone OTP — first-class, no custom SMS plumbing; prebuilt `<SignIn/>` handles it |
| AUTH-03 | OTP requests are rate-limited (per phone and per IP) to prevent SMS abuse | Clerk built-in rate limits (5 req/10s create, 3 req/10s attempt); account lockout at 100 failed codes. Supplementary per-phone limit via Upstash Redis middleware (see pitfalls) |
| AUTH-04 | Users have a role (donor / volunteer / admin) that gates access to features | Clerk `publicMetadata.role` + custom session claim; read via `sessionClaims?.metadata?.role` in middleware |
| AUTH-05 | Every server action re-verifies session, role, and resource ownership (no IDOR) | `auth()` from `@clerk/nextjs/server` in every action; pattern documented with code examples |
| AUTH-06 | User session persists across browser refresh | Clerk JWT session cookie (httpOnly, secure); no custom session store needed; `@t3-oss/env-nextjs` boot validation ensures env is correct on every start |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire foundation that every subsequent phase builds on: scaffold, auth, RBAC, DB schema, env validation, and design system integration. The stack is non-trivial because it targets Cloudflare Workers (not Vercel), which imposes one critical constraint that changes the DB client pattern: **Workers cannot reuse connections across requests**. This single fact drives the Postgres connection architecture.

The right decisions here are clear and well-documented. The Supabase pooler (transaction mode, port 6543, `postgres-js` with `prepare: false`) is the correct Postgres-from-Workers approach — Cloudflare Hyperdrive adds latency round-trips and is not free. The React `cache()` per-request client wrapper is the verified pattern from opennextjs-cloudflare's own docs. Drizzle + `postgres-js` need `prepare: false` in transaction-mode pooler.

Clerk's phone OTP is genuinely first-class — the prebuilt components handle OTP delivery through Clerk's own infrastructure, avoiding DLT registration for auth flows. Role lives in `publicMetadata` and must be projected into the session JWT via a Clerk Dashboard custom claim so middleware can read it without a backend roundtrip. Onboarding gating is implemented as a middleware redirect on `!sessionClaims?.metadata?.onboardingComplete`.

The design system is already built (`tokens/globals.css`). Phase 1 must copy it into `src/app/globals.css`, resolve the hex→HSL question (convert primary/leaf/semantic vars to HSL channel triplets to enable Tailwind opacity modifiers), wire shadcn with Tailwind v4, and mount fonts via `next/font/google`. Motion enters via `app/template.tsx` with the `.rj-route-shell` CSS class (frugal budget: transform+opacity only, ≤200ms).

**Primary recommendation:** Supabase pooler (port 6543, transaction mode) + `postgres-js` with `prepare: false` + React `cache()` per-request wrapper. No Hyperdrive. `@t3-oss/env-nextjs` for env validation. Clerk prebuilt components themed via `appearance` variables.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authentication UI (sign-in, sign-up, OTP) | Browser/Client | — | Clerk prebuilt components render in browser; ClerkProvider wraps root layout |
| Session JWT validation & route gating | Frontend Server (middleware.ts) | — | `clerkMiddleware` decodes JWT on every request; enforces route-group access |
| Role reading in middleware | Frontend Server (middleware.ts) | — | `sessionClaims?.metadata?.role` — no extra network call if session claim is projected |
| Server action authorization | API/Backend (server actions) | — | Each action calls `auth()` independently; never trusts middleware header alone |
| Clerk metadata update (role, onboarding flag) | API/Backend (server actions) | — | `clerkClient().users.updateUserMetadata()` — server-only |
| DB connection (queries) | API/Backend | — | `postgres-js` client in `src/server/db/client.ts`, wrapped in `cache()` |
| DB migrations | API/Backend (drizzle-kit CLI) | — | Runs against direct connection (port 5432) at deploy time, not in Workers |
| Design tokens | Browser/Client | Frontend Server (CSS) | `globals.css` loaded server-side; CSS vars available to all components |
| Env validation | Frontend Server (boot) | — | `next.config.ts` imports `src/config/env.ts`; fails build/start on missing vars |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.19 | App Router framework | Pinned to 15.x (opennextjs/cloudflare supports 15.x; 16.x not yet tested against CF adapter). Use latest 15.x patch. |
| @opennextjs/cloudflare | 1.20.0 | Next.js → Cloudflare Workers adapter | The only viable path to CF Workers from Next.js App Router |
| wrangler | 4.105.0 | CF build/preview/deploy CLI | Required ≥ 3.99.0 |
| @clerk/nextjs | 7.5.8 | Auth SDK for Next.js App Router | Official Next.js SDK; v7.x is App Router native |
| drizzle-orm | 0.45.2 | Type-safe ORM | SQL-transparent, tiny bundle, Supabase pooler compatible |
| drizzle-kit | 0.31.10 | Migration CLI | Runs against direct connection only |
| postgres | 3.4.9 | postgres-js driver | Required by drizzle-orm; works with Supabase pooler + CF Workers |
| @t3-oss/env-nextjs | 0.13.11 | Env var validation at boot | Split server/client, Zod-backed, fails build on missing vars |
| zod | 4.4.3 | Schema validation | Used in env validation + form schemas |
| tailwindcss | 4.3.1 | Utility CSS | v4 — no config file needed, `@import "tailwindcss"` |
| shadcn | 4.11.0 | Component CLI | `npx shadcn@latest init` — Tailwind v4 supported |
| motion | 12.42.0 | Animation library | `motion/react` — pre-installed in tokens/motion.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.80.0 | Form management | Onboarding form (role-select + profile fields) |
| @hookform/resolvers | latest | Zod resolver for RHF | With `zodResolver` in every form |
| @tanstack/react-query | 5.101.1 | Server-state cache | Portal data fetching (Phase 2+); wire QueryClientProvider in Phase 1 |
| zustand | 5.0.14 | UI state | Feature-level stores (Phase 2+); wire in Phase 1 |
| server-only | latest | Import guard | Prevents server modules from leaking into client bundles |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase pooler (port 6543) | Cloudflare Hyperdrive | Hyperdrive requires CF paid plan ($5/mo Workers Paid) and adds a CF-managed proxy hop. Supabase pooler is free, already available, adequate for NGO scale. |
| postgres-js driver | @vercel/postgres or pg (node-postgres) | `@vercel/postgres` is Vercel-specific. `pg` (node-postgres) also works with `maxUses: 1` — opennextjs docs show a `Pool` example with it — but `postgres-js` is lighter and more commonly paired with Drizzle. |
| @t3-oss/env-nextjs | Hand-rolled Zod in next.config.ts | Both work. t3-env gives type-safe imports and proper client/server split with minimal boilerplate. |
| next/font/google | Google Fonts `<link>` tag | `next/font/google` self-hosts fonts at build time, avoids 3rd-party DNS lookup, better LCP. Always prefer `next/font` in Next.js. |

**Installation (core):**
```bash
pnpm add @opennextjs/cloudflare@latest
pnpm add --save-dev wrangler@latest
pnpm add @clerk/nextjs drizzle-orm postgres @t3-oss/env-nextjs zod
pnpm add --save-dev drizzle-kit
pnpm add motion react-hook-form @hookform/resolvers @tanstack/react-query zustand server-only
```

**Version verification (performed 2026-06-25):**
All versions above confirmed via `npm view <package> version`.

---

## Architecture Patterns

### System Architecture Diagram

```
BROWSER
  ├── ClerkProvider (root layout)
  ├── Public routes (no auth)
  ├── /onboarding (auth required, onboarding-incomplete redirect target)
  ├── (portal)/* — requires auth + onboardingComplete=true
  └── (admin)/* — requires role=admin

        │ every request
        ▼
MIDDLEWARE (src/middleware.ts)
  [clerkMiddleware]
  ├── public? → pass through
  ├── not signed in? → redirectToSignIn
  ├── signed in + !onboardingComplete? → redirect /onboarding
  ├── (portal)/* + signed in + onboarding done → pass
  └── (admin)/* + role !== 'admin' → 403 response

        │ server action call
        ▼
SERVER ACTIONS (src/features/*/actions/)
  [always re-verify]
  ├── auth() → session + sessionClaims
  ├── check role === required role → throw FORBIDDEN if not
  ├── check resource ownership → throw FORBIDDEN if not
  └── call Repository → DB

        │
        ▼
DB LAYER (src/server/db/)
  ├── client.ts → getDb() = cache(() => drizzle(postgres(POOL_URL, {prepare:false})))
  │              One client per request. POOL_URL = port 6543 (Supabase transaction pooler)
  └── Migrations run via drizzle-kit against DIRECT_URL (port 5432)
                         │
                         ▼
                  Supabase Postgres (free tier, Supavisor pooler)

CLOUDFLARE DEPLOY
  next build → opennextjs-cloudflare build → opennextjs-cloudflare deploy
  wrangler.jsonc: nodejs_compat, compatibility_date ≥ 2025-05-05, ASSETS binding
  Env: .dev.vars for local preview, Cloudflare Worker env vars for production
```

### Recommended Project Structure

```
rajyash-food-rescue/
├── wrangler.jsonc                  # CF Workers config (nodejs_compat, assets binding)
├── open-next.config.ts             # defineCloudflareConfig()
├── next.config.ts                  # initOpenNextCloudflareForDev() + env import
├── drizzle.config.ts               # drizzle-kit config (uses DIRECT_URL)
├── .dev.vars                       # local secrets (gitignored)
├── .env.example                    # committed; documents all required vars
├── tokens/                         # existing design token files (do not move)
│
└── src/
    ├── app/
    │   ├── globals.css             # ← copy tokens/globals.css here; import motion.css after
    │   ├── layout.tsx              # ClerkProvider + QueryClientProvider + font setup
    │   ├── template.tsx            # .rj-route-shell (frugal app motion: route enter)
    │   ├── (public)/               # no auth required
    │   │   └── page.tsx            # minimal placeholder for Phase 1
    │   ├── (portal)/
    │   │   ├── layout.tsx          # portal shell (nav, sidebar stub)
    │   │   └── dashboard/page.tsx  # stub
    │   ├── (admin)/
    │   │   ├── layout.tsx          # admin shell stub
    │   │   └── dashboard/page.tsx  # stub
    │   ├── onboarding/
    │   │   └── page.tsx            # role-select + minimal profile
    │   └── sign-in/[[...sign-in]]/page.tsx   # <SignIn/> themed
    │   └── sign-up/[[...sign-up]]/page.tsx   # <SignUp/> themed
    │
    ├── config/
    │   ├── env.ts                  # @t3-oss/env-nextjs schema — ALL env vars
    │   └── constants.ts            # ROLES, QUERY_KEYS (stubs for Phase 2)
    │
    ├── server/
    │   ├── db/
    │   │   ├── client.ts           # getDb() using cache() + postgres-js
    │   │   ├── schema.ts           # Drizzle schema (Phase 1 tables only)
    │   │   └── migrations/         # drizzle-kit output
    │   └── auth/
    │       └── session.ts          # requireRole() helper — wraps auth() + role check
    │
    ├── features/
    │   └── auth/
    │       ├── actions/
    │       │   └── onboardingActions.ts  # completeOnboarding server action
    │       ├── components/
    │       │   └── OnboardingForm.tsx    # RHF + Zod, roles select
    │       ├── types/
    │       │   └── auth.types.ts
    │       └── index.ts
    │
    ├── components/
    │   ├── ui/                     # shadcn components (Button, Card, Input, Badge, etc.)
    │   └── forms/                  # FormField, FormSelect shared field components
    │
    └── lib/
        ├── cn.ts                   # clsx + tailwind-merge
        └── logger.ts               # thin console wrapper
```

### Pattern 1: Clerk Middleware with Route-Group RBAC

**What:** Single `src/middleware.ts` using `clerkMiddleware` + `createRouteMatcher` to enforce three access tiers.

**When to use:** Every request — middleware runs on all non-static routes.

```typescript
// src/middleware.ts
// Source: https://clerk.com/docs/guides/secure/basic-rbac + https://clerk.com/docs/guides/development/add-onboarding-flow
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
]);
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/(admin)(.*)']);
const isPortalRoute = createRouteMatcher(['/(portal)(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth();

  // 1. Public — allow through
  if (isPublicRoute(req)) return NextResponse.next();

  // 2. Unauthenticated — send to sign-in
  if (!isAuthenticated) return redirectToSignIn({ returnBackUrl: req.url });

  // 3. Authenticated + onboarding incomplete — gate portal, allow onboarding
  if (!sessionClaims?.metadata?.onboardingComplete && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // 4. Admin routes — role check (return 403, not redirect)
  if (isAdminRoute(req) && sessionClaims?.metadata?.role !== 'admin') {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
```

**Session claim setup (Clerk Dashboard, required):**
```json
{ "metadata": "{{user.public_metadata}}" }
```

TypeScript types in `src/types/globals.d.ts`:
```typescript
export {};
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: 'donor' | 'volunteer' | 'admin';
      onboardingComplete?: boolean;
    };
  }
}
```

### Pattern 2: Server Action Authorization Helper

**What:** `requireRole()` — wraps `auth()`, throws on unauthenticated or wrong role.

**When to use:** First line of every server action, before any repo call.

```typescript
// src/server/auth/session.ts
// Source: https://clerk.com/docs/guides/secure/basic-rbac
import { auth } from '@clerk/nextjs/server';

type Role = 'donor' | 'volunteer' | 'admin';

export async function requireRole(allowedRoles: Role[]) {
  const { isAuthenticated, userId, sessionClaims } = await auth();
  if (!isAuthenticated || !userId) {
    throw new Error('UNAUTHORIZED');
  }
  const role = sessionClaims?.metadata?.role as Role | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('FORBIDDEN');
  }
  return { userId, role };
}

// Usage in server actions:
// 'use server'
// export async function someAction() {
//   const { userId, role } = await requireRole(['donor']);
//   // ... ownership check, then repo call
// }
```

### Pattern 3: Drizzle + postgres-js per-request connection (Cloudflare Workers)

**What:** React `cache()` wraps a per-request DB client; `prepare: false` for Supabase transaction pooler.

**When to use:** The only correct DB client pattern on Cloudflare Workers.

```typescript
// src/server/db/client.ts
// Source: https://opennext.js.org/cloudflare/howtos/db + https://drizzle-team.github.io/drizzle-orm-docs/connect-supabase
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cache } from 'react';
import * as schema from './schema';

// POOL_URL = Supabase Supavisor transaction-mode URL (port 6543)
// Must have prepare:false — transaction mode does not support prepared statements
export const getDb = cache(() => {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle({ client, schema });
});
```

**drizzle.config.ts (uses DIRECT_URL for migrations — port 5432):**
```typescript
// Source: https://drizzle-team.github.io/drizzle-orm-docs/connect-supabase
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env' });

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!, // port 5432 — direct connection
  },
});
```

**Environment variables needed:**
```bash
DATABASE_URL=postgres://postgres.[proj-ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[proj-ref].supabase.co:5432/postgres
```

### Pattern 4: Clerk Appearance — Themed to Design Tokens

**What:** Pass design token hex values to Clerk's `appearance.variables` in `ClerkProvider`.

**When to use:** Phase 1 root layout; keeps auth screens visually consistent.

```typescript
// src/app/layout.tsx
// Source: https://clerk.com/docs/guides/customizing-clerk/appearance-prop/variables
<ClerkProvider
  appearance={{
    variables: {
      colorPrimary: '#C04E12',          // --primary
      colorBackground: '#FFFFFF',       // --surface (card background)
      colorForeground: '#22271F',       // --foreground
      colorNeutral: '#6E665A',          // --muted-foreground
      colorDanger: '#BE3B2E',           // --destructive
      colorBorder: '#E8E0CF',           // --border
      colorInput: '#FFFFFF',            // input background
      borderRadius: '0.75rem',          // --radius (12px)
      fontFamily: '"Mukta", system-ui, sans-serif',
    },
    elements: {
      formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary-hover text-sm',
      card: 'shadow-md',
    },
  }}
>
```

**Note:** Tailwind classes in `elements` work if Tailwind CSS processes the layout file. This gives buttons and cards the correct brand appearance without full custom form builds.

### Pattern 5: Onboarding Server Action

**What:** Server action updates `publicMetadata` + calls `user.reload()` on client.

```typescript
// src/features/auth/actions/onboardingActions.ts
// Source: https://clerk.com/docs/guides/development/add-onboarding-flow
'use server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';

const onboardingSchema = z.object({
  role: z.enum(['donor', 'volunteer']),
  name: z.string().min(2),
  city: z.string().default('Ahmedabad'),
  phone: z.string().optional(),
});

export async function completeOnboarding(input: z.infer<typeof onboardingSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error('UNAUTHORIZED');

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) throw new Error('VALIDATION_ERROR');

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: parsed.data.role,
      onboardingComplete: true,
    },
  });

  // Also upsert minimal profile in DB
  // await userRepository.upsert({ clerkId: userId, name: parsed.data.name, ... });
}
```

**Client side — force session token refresh after metadata update:**
```typescript
// After calling completeOnboarding:
await user?.reload();  // Forces Clerk to re-fetch and re-issue session JWT
router.push('/portal/dashboard');
```

### Pattern 6: Env Validation at Boot

```typescript
// src/config/env.ts
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),           // Supabase pooler URL (port 6543)
    DIRECT_URL: z.string().url(),             // Direct DB URL (port 5432, migrations only)
    CLERK_SECRET_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/portal/dashboard'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/onboarding'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  },
});
```

```typescript
// next.config.ts — triggers validation at build/start time
import './src/config/env';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {};
export default nextConfig;
initOpenNextCloudflareForDev();
```

### Pattern 7: Phase 1 Minimal DB Schema

Only what Phase 1 needs: a `profiles` table that mirrors the Clerk user with the role stored locally for future repo queries (not strictly required in Phase 1 since role comes from Clerk, but the schema slot must exist for Phase 2+).

```typescript
// src/server/db/schema.ts
import { pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['donor', 'volunteer', 'admin']);

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),                     // Clerk userId (clerk_...)
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: roleEnum('role').notNull(),
  city: text('city').notNull().default('Ahmedabad'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Note on role duplication:** Role is stored in both Clerk `publicMetadata` (source of truth for auth, read in middleware) AND in the `profiles` table (for DB joins in Phase 2+). The Clerk metadata is the auth source of truth; the DB row is a read-optimized copy. Keep them in sync via the onboarding action and any future admin role-change action.

### Anti-Patterns to Avoid

- **Global Postgres client:** `const db = drizzle(...)` at module level will fail on request 2+ in Cloudflare Workers. Always use `cache()` to scope to the request.
- **`prepare: true` (default) with Supabase transaction pooler:** Supabase's Supavisor transaction mode does not support prepared statements. `postgres-js` defaults to `prepare: true` — this silently fails or throws. **Must** set `prepare: false`.
- **Reading role from request body or client header:** Never accept `role: "admin"` from the browser. Always derive from `sessionClaims?.metadata?.role` inside `auth()`.
- **Middleware-only authorization:** CVE-2025-29927 demonstrated that `x-middleware-subrequest` can bypass Next.js middleware. Server actions must always call `auth()` independently (AUTH-05). Use Next.js ≥15.2.3 to close the CVE.
- **`export const runtime = "edge"` in route files:** Edge runtime is not yet supported by `@opennextjs/cloudflare`. Remove any such exports. The Node.js compatibility layer handles everything.
- **Skiping `user.reload()` after metadata update:** After `updateUserMetadata`, the client's session token still carries the old claims. `user.reload()` forces Clerk to re-issue the token with updated `publicMetadata` — without this, the middleware redirect loop continues.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session management | Custom JWT / cookie parsing | Clerk SDK | Clerk handles httpOnly cookies, refresh, OTP delivery, lockout — 100s of edge cases |
| Phone OTP delivery | Custom Twilio/MSG91 integration for auth | Clerk built-in | Clerk routes auth OTP through its own infra; no DLT registration needed for auth SMS |
| OTP rate limiting (base) | Custom Redis counter | Clerk built-in limits | 5 req/10s create, 3 req/10s attempt per IP already enforced by Clerk |
| ENV validation | `process.env.X || throw` | `@t3-oss/env-nextjs` | Type-safe, server/client split, build-time validation, proper TS inference |
| DB connection pooling | Manual `pg.Pool` management | `postgres-js` with `prepare: false` + `cache()` | Workers constraint: per-request client, no global pool |
| Component library | Custom button/input/dialog | shadcn/ui | Accessible, composable, themed to our tokens via CSS vars |
| Form validation display | Manual error state | RHF + `zodResolver` | Error state, touched tracking, submission handling all covered |

**Key insight:** Every item on this list has been built wrong by dozens of Next.js projects. The hand-rolled version always misses edge cases (OTP flood protection, prepared statement incompatibility with transaction-mode poolers, token refresh after metadata update).

---

## Common Pitfalls

### Pitfall 1: Global Postgres Client Breaks After First Request
**What goes wrong:** `const db = drizzle(postgres(url))` at module top level — first request works, second hangs or throws because the Worker tries to reuse a closed connection.
**Why it happens:** Cloudflare Workers isolate connection state per-request; a module-level client is shared but the underlying TCP connection cannot cross request boundaries.
**How to avoid:** Wrap in React `cache()` (see Pattern 3). One client per request lifecycle.
**Warning signs:** First `/api/*` call succeeds, subsequent calls return 500 or hang.

### Pitfall 2: Prepared Statements with Supabase Transaction Pooler
**What goes wrong:** Drizzle queries fail silently or throw `prepared statement "drizzle_..." does not exist`.
**Why it happens:** `postgres-js` defaults to `prepare: true`; Supabase Supavisor transaction mode does not support prepared statements.
**How to avoid:** Set `{ prepare: false }` in the `postgres()` call (Pattern 3).
**Warning signs:** Queries work on direct connection (port 5432) but fail on pooler URL (port 6543).

### Pitfall 3: Middleware Bypass via CVE-2025-29927
**What goes wrong:** Attacker adds `x-middleware-subrequest` header and bypasses all middleware auth checks.
**Why it happens:** Next.js ≤15.2.2 trusted this internal header from external requests.
**How to avoid:** Use Next.js ≥15.2.3 (latest 15.x is 15.5.19 as of 2026-06-25). AUTH-05 defense-in-depth: server actions always re-verify independently.
**Warning signs:** Protected routes return 200 when they should 403/redirect.

### Pitfall 4: Stale Session Token After Metadata Update
**What goes wrong:** User completes onboarding, server action updates `onboardingComplete: true`, but middleware still sees the old `sessionClaims` and redirects back to `/onboarding`.
**Why it happens:** Clerk session JWTs are cached; the browser holds the old token until `user.reload()` is called.
**How to avoid:** Always call `await user?.reload()` immediately after `completeOnboarding` server action returns. Pattern documented in onboarding page component.
**Warning signs:** Onboarding form submits successfully but page refreshes back to `/onboarding`.

### Pitfall 5: Missing Custom Session Claim in Clerk Dashboard
**What goes wrong:** `sessionClaims?.metadata?.role` is always `undefined` even though `publicMetadata.role` is set on the user.
**Why it happens:** By default, Clerk does not include `publicMetadata` in the JWT. You must add a custom session token claim in the Clerk Dashboard.
**How to avoid:** In Clerk Dashboard → Sessions → Customize session token, add: `{ "metadata": "{{user.public_metadata}}" }`. Document this as a required setup step.
**Warning signs:** Middleware logs show `sessionClaims.metadata` as `undefined`; role checks always fail.

### Pitfall 6: Hex Colors Break Tailwind Opacity Modifiers
**What goes wrong:** `bg-primary/50` produces no effect; shadcn components that expect opacity-modifiable colors look wrong.
**Why it happens:** `tokens/globals.css` stores colors as hex (`#C04E12`). Tailwind v4's opacity modifier syntax requires HSL channel triplets (or OKLCH in v4's new format).
**How to avoid:** Convert the key brand/semantic vars to HSL channels in `globals.css` during Phase 1. Example: `--primary: 15 85% 40%` (HSL for `#C04E12`). Or use OKLCH. The status pill colors and semantic colors may not need opacity modifiers, so prioritize `--primary`, `--leaf`, `--destructive`, `--warning`.
**Warning signs:** `bg-primary/50` renders as solid (full opacity).

### Pitfall 7: `edge` Runtime Export Breaks Cloudflare Build
**What goes wrong:** Build fails with "edge runtime not supported" error from `@opennextjs/cloudflare`.
**Why it happens:** `export const runtime = "edge"` in a route file opts that route into the Edge Runtime, which is not yet supported by the CF adapter.
**How to avoid:** Never add `export const runtime = "edge"`. All routes use Node.js compat layer by default.
**Warning signs:** `opennextjs-cloudflare build` fails with runtime compatibility errors.

### Pitfall 8: Worker Size Over 3 MiB
**What goes wrong:** Deploy fails with "worker size exceeds limit" (3 MiB compressed on free plan).
**Why it happens:** Next.js bundles can be large; the CF Workers free tier has a 3 MiB compressed limit.
**How to avoid:** Use `pnpm` for smaller node_modules. Analyze bundle with ESBuild Bundle Analyzer. Avoid heavy server-side imports. Note: the 3 MiB limit is compressed — actual source can be somewhat larger.
**Warning signs:** `opennextjs-cloudflare deploy` exits with size error.

---

## Code Examples

### create-next-app Scaffold Command
```bash
# Source: https://nextjs.org/docs/app/api-reference/cli/create-next-app
npx create-next-app@15 rajyash-food-rescue \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

**Note on `--no-turbopack`:** Turbopack has known issues with some older versions of the CF adapter. Start with Webpack. Turbopack can be enabled later after verifying build compatibility.

**Note on Next.js version:** `npx create-next-app@15` pins to the latest 15.x release. At time of research, latest is 15.5.19, which clears the CVE-2025-29927 patch threshold of 15.2.3.

### shadcn Init (after create-next-app)
```bash
# Source: https://ui.shadcn.com/docs/tailwind-v4
npx shadcn@latest init
# Choose: New York style, CSS variables yes, Tailwind v4
# Then add Phase 1 components:
npx shadcn@latest add button card input label badge select dialog sheet toast skeleton
```

**After `shadcn init`:** Replace the generated `globals.css` with our `tokens/globals.css` content. The `@theme inline` block that shadcn generates must be merged with our token variables. The `tokens/globals.css` already has the shadcn-compatible variable names (`--primary`, `--background`, `--foreground`, etc.) so the merge is mostly additive.

### Fonts via next/font
```typescript
// src/app/layout.tsx
// Source: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
import { Bricolage_Grotesque, Mukta } from 'next/font/google';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
  display: 'swap',
});

const mukta = Mukta({
  subsets: ['latin', 'devanagari'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
// Note: Noto Sans Gujarati loaded via <link> in <head> as next/font doesn't support it directly.
// Add to root layout metadata: viewport + <link> for Noto Sans Gujarati.
```

### wrangler.jsonc
```jsonc
// Source: https://opennext.js.org/cloudflare/get-started + https://github.com/opennextjs/opennextjs-cloudflare
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "rajyash-food-rescue",
  "compatibility_date": "2025-05-05",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

**Compatibility date `2025-05-05`:** This is the minimum date that includes `FinalizationRegistry` support, which `postgres-js` (and other packages) require. The documented minimum for `nodejs_compat` is 2024-09-23, but `2025-05-05` is needed for `postgres-js` to work correctly.

### open-next.config.ts
```typescript
// Source: https://opennext.js.org/cloudflare/get-started
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
// R2 incremental cache can be added later when caching strategy is needed
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "test": "vitest"
  }
}
```

---

## OTP Rate Limiting — What Clerk Provides vs What We Add

**Clerk built-in (no code required):**
- Create SignIn/SignUp: 5 requests per 10 seconds per IP
- Attempt verification (OTP code): 3 requests per 10 seconds per IP
- Account lockout: after 100 failed code attempts, 1-hour cooldown

**What Clerk does NOT provide:**
- Per-phone-number OTP send rate limiting (Clerk's limit is per IP)
- Custom per-phone limit (e.g., 3 OTP sends per phone per 10 minutes)

**AUTH-03 compliance:** Clerk's IP-level rate limiting covers the "per IP" requirement. For "per phone" limiting, a supplementary layer is needed in Phase 2+ if OTP abuse materializes. For Phase 1, Clerk's built-in limits are sufficient to satisfy AUTH-03 at NGO scale (low traffic). Document this as a Phase 1 known gap that closes in Phase 2 if needed.

**If additional per-phone rate limiting is required in Phase 1:** Use Upstash Redis (free tier, KV via Cloudflare binding or HTTP). Add a rate-limit check in a custom middleware handler before OTP attempts reach Clerk. This is an enhancement, not a blocker.

---

## Hex → HSL Conversion Decision

**Recommendation:** Convert the 5 most-used brand/semantic colors to HSL channel triplets in `globals.css` to enable opacity modifiers. Leave status pill colors as hex (they don't use opacity modifiers).

| Token | Hex | HSL channels | Notes |
|-------|-----|-------------|-------|
| `--primary` | `#C04E12` | `15 82% 41%` | Used on buttons — needs `/80` for hover states |
| `--leaf` | `#2E7D46` | `138 46% 33%` | Positive actions — may need soft variants |
| `--destructive` | `#BE3B2E` | `4 61% 46%` | Error states |
| `--warning` | `#B26A07` | `36 93% 36%` | Warning banners |
| `--background` | `#FBF7F0` | `40 53% 97%` | Base surface |

**Tailwind v4 `@theme inline` syntax for HSL:**
```css
:root {
  --primary: 15 82% 41%;  /* HSL channels — no hsl() wrapper */
}
@theme inline {
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: var(--primary-foreground);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel hosting | Cloudflare Workers via @opennextjs/cloudflare | Project decision (2026-06) | DB client must be per-request; edge runtime not supported |
| `middleware.ts` (standard) | Still `middleware.ts` for Next.js ≤15 (`proxy.ts` is Next.js 16+) | Next.js 16 | We use 15.x, so `middleware.ts` is correct |
| Global `pg.Pool` | `cache()` per-request client | CF Workers constraint | Breaking change — must be per-request |
| Tailwind v3 `theme.extend` | Tailwind v4 `@theme inline` in CSS | Tailwind v4 release | No `tailwind.config.js` needed; CSS-native |
| shadcn `default` style | `new-york` style (v4+ shadcn default) | shadcn v4 | `default` style deprecated |
| Supabase port 6543 = PgBouncer session mode | Port 6543 = transaction mode ONLY (Feb 28, 2025 change) | Supabase Feb 2025 | `prepare: false` is now mandatory for port 6543 |
| `@clerk/nextjs` v5 | v6/v7 — App Router native `auth()`, `clerkMiddleware` | Clerk v6 | `authMiddleware` deprecated; use `clerkMiddleware` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 15.5.19 works fully with @opennextjs/cloudflare 1.20.0 (latest tested combination) | Standard Stack | Build fails; need to pin Next.js to a lower 15.x patch |
| A2 | Supabase Supavisor transaction-mode URL (port 6543) is available on Supabase free tier | Standard Stack | Need to use session-mode pooler or direct connection (connection limit hit faster) |
| A3 | Clerk free tier (10K MAU) is sufficient for v1 NGO usage | Standard Stack | Paid Clerk plan needed ($25/mo+); unlikely at NGO scale |
| A4 | `FinalizationRegistry` error from `postgres-js` is fully resolved by `compatibility_date: "2025-05-05"` in wrangler.jsonc | Code Examples | postgres-js still fails; need different driver or Hyperdrive |
| A5 | Noto Sans Gujarati is not available in `next/font/google` (only via `<link>`) | Code Examples | Font not loaded; Gujarati text falls back to system font (acceptable for Phase 1, fixed in Phase 7 i18n) |

---

## Open Questions

1. **Noto Sans Gujarati in next/font**
   - What we know: `next/font/google` supports a subset of Google Fonts; Noto Sans Gujarati may or may not be in the supported list.
   - What's unclear: Whether it can be loaded via `next/font/google` or requires a `<link>` tag in root layout.
   - Recommendation: Check `next/font/google` source list at scaffold time. Fallback: `<link>` in `layout.tsx` metadata `links`. Phase 1 placeholder is fine since full i18n is Phase 7.

2. **Clerk Dashboard custom session claim setup**
   - What we know: Must be configured manually in Clerk Dashboard before middleware role checks work.
   - What's unclear: Whether this can be scripted via Clerk Management API or is always a manual dashboard step.
   - Recommendation: Document as a manual step in Wave 0 of the plan; the planner should add it as an explicit task with instructions (not code).

3. **Supabase project connection string format**
   - What we know: Supabase provides both a pooler URL (port 6543) and direct URL (port 5432); both must be in `.env`.
   - What's unclear: Whether the project has been created and credentials are available.
   - Recommendation: Create Supabase project as Wave 0 infra setup. No code needed — just credential capture.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tool, drizzle-kit | Assumed | — | — |
| pnpm | Package manager | Assumed | — | npm |
| Supabase project (Postgres) | DB layer | Not checked (external) | — | Must create before Wave 1 |
| Clerk account + app | Auth | Not checked (external) | — | Must create before Wave 1 |
| Cloudflare account | Deploy | Not checked (external) | — | Must create before Wave 2 |
| wrangler CLI | CF deploy | Install during Phase 1 | 4.105.0 | — |

**Missing dependencies with no fallback:**
- Supabase project credentials (DATABASE_URL, DIRECT_URL)
- Clerk application credentials (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
- Cloudflare account (for `opennextjs-cloudflare deploy`)

All three must be set up as Wave 0 infra tasks before any code can run.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email sign-in route exists and redirects unauthenticated users | Smoke (middleware behavior) | Manual / E2E (Playwright Phase 7) | N/A — middleware tested by Clerk |
| AUTH-02 | Phone OTP — Clerk prebuilt component renders | — | Not tested (Clerk responsibility) | — |
| AUTH-03 | OTP rate limits enforced | — | Clerk enforces; not unit-testable | — |
| AUTH-04 | Role in publicMetadata gates routes | Unit: `requireRole()` helper | `pnpm test --run src/server/auth/session.test.ts` | ❌ Wave 0 |
| AUTH-04 | Middleware returns 403 for wrong role | Unit: middleware logic | `pnpm test --run src/middleware.test.ts` | ❌ Wave 0 |
| AUTH-05 | Server action throws FORBIDDEN on wrong role | Unit: `requireRole()` in action | `pnpm test --run src/features/auth/actions/onboardingActions.test.ts` | ❌ Wave 0 |
| AUTH-06 | Session persists across refresh | — | Clerk responsibility; not unit-testable | — |
| ENV | App throws on missing env var | Unit: env schema | `pnpm test --run src/config/env.test.ts` | ❌ Wave 0 |
| SCHEMA | DB schema creates without error | Integration: drizzle-kit push | `pnpm db:push` (manual verify) | — |
| ONBOARD | Onboarding form validates role + name | Unit: Zod schema | `pnpm test --run src/features/auth/` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm test --run && pnpm typecheck && pnpm lint`
- **Phase gate:** All above green + `pnpm run preview` (CF Workers preview) loads without error

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework setup
- [ ] `src/test/setup.ts` — jest-dom + testing-library setup
- [ ] `src/server/auth/session.test.ts` — covers AUTH-04, AUTH-05 (`requireRole` behavior)
- [ ] `src/config/env.test.ts` — covers AUTH-06 env validation
- [ ] `src/features/auth/actions/onboardingActions.test.ts` — covers D-05, AUTH-05

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Clerk — OTP + email, account lockout, brute-force protection built in |
| V3 Session Management | yes | Clerk JWT (httpOnly, secure cookie); `user.reload()` on metadata change |
| V4 Access Control | yes | `requireRole()` in all server actions; middleware 403 for wrong-role routes |
| V5 Input Validation | yes | Zod schemas on all forms + `@t3-oss/env-nextjs` for env |
| V6 Cryptography | yes (partial) | Clerk handles session JWT signing; no custom crypto in Phase 1 |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Middleware bypass (CVE-2025-29927) | Spoofing | Use Next.js ≥15.2.3; server actions re-verify independently (AUTH-05) |
| IDOR in server actions | Tampering | `requireRole()` + ownership check before every DB write |
| Role escalation via client-sent role | Elevation of Privilege | Never read role from request body; always derive from `sessionClaims` |
| OTP flooding / SMS pumping | Denial of Service | Clerk IP-level rate limits (built-in); supplementary per-phone limiting if needed |
| Env secret exposure | Information Disclosure | `server-only` import guard; `@t3-oss/env-nextjs` server/client split; `.dev.vars` gitignored |
| Missing env var causing silent failure | Repudiation | `@t3-oss/env-nextjs` throws at boot — hard failure, not silent |

---

## Sources

### Primary (HIGH confidence)
- [opennextjs-cloudflare GitHub + docs](https://opennext.js.org/cloudflare/get-started) — setup, env, wrangler config, DB pattern
- [opennext.js.org/cloudflare/howtos/db](https://opennext.js.org/cloudflare/howtos/db) — per-request `cache()` + `maxUses: 1` DB pattern
- [Drizzle ORM + Supabase docs](https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/connect-supabase.mdx) — `prepare: false` for transaction pooler
- [Clerk Next.js App Router quickstart](https://github.com/clerk/clerk-nextjs-app-quickstart) — `ClerkProvider`, `clerkMiddleware`, `auth()`
- [Clerk RBAC guide](https://clerk.com/docs/guides/secure/basic-rbac) — `publicMetadata.role`, session claims
- [Clerk onboarding flow guide](https://clerk.com/docs/guides/development/add-onboarding-flow) — `onboardingComplete` pattern, `user.reload()`
- [Clerk appearance API docs](https://clerk.com/docs/guides/customizing-clerk/appearance-prop/variables) — `colorPrimary`, `borderRadius`, `fontFamily`, `elements`
- [Clerk rate limit docs](https://clerk.com/docs/guides/how-clerk-works/system-limits) — 5 req/10s create, 3 req/10s attempt, 100-attempt lockout
- [t3-env Next.js docs](https://env.t3.gg/docs/nextjs) — `createEnv`, server/client split
- [shadcn Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) — `@theme inline`, OKLCH, new-york style
- [Supabase connection pooler docs](https://supabase.com/docs/guides/database/connecting-to-postgres) — port 6543 = transaction mode only (Feb 2025 change)
- npm registry — all package versions verified 2026-06-25

### Secondary (MEDIUM confidence)
- [CVE-2025-29927 analysis](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/) — middleware bypass vulnerability, patch requirement
- [opennext.js.org/cloudflare/troubleshooting](https://opennext.js.org/cloudflare/troubleshooting) — FinalizationRegistry date, package resolution issues, size limits
- Supabase changelog Feb 2025 — port 6543 deprecation of session mode

### Tertiary (LOW confidence — assumptions flagged)
- A4: FinalizationRegistry fully resolved by 2025-05-05 compatibility date (inferred from Cloudflare changelog, not directly tested)
- A5: Noto Sans Gujarati availability in `next/font/google` (not directly checked)

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — verified via `npm view` on 2026-06-25
- @opennextjs/cloudflare setup: HIGH — official docs + GitHub
- Clerk patterns (middleware, role, onboarding): HIGH — official Clerk docs
- Drizzle + Supabase pooler: HIGH — official Drizzle docs + Supabase docs
- Tailwind v4 + shadcn integration: HIGH — official shadcn Tailwind v4 guide
- Hex→HSL conversion values: MEDIUM — calculated, not tested in the target codebase
- Phase 1 DB schema: HIGH — greenfield, no legacy constraints

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (30 days — stack is stable; @opennextjs/cloudflare moves fast, re-verify if >2 minor versions behind)
