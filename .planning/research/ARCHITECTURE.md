# Architecture Research

**Domain:** Food-rescue logistics web app (Next.js App Router + PostgreSQL, single-tenant)
**Researched:** 2026-06-25
**Confidence:** HIGH (Next.js App Router patterns); MEDIUM (real-time on Vercel — see live-tracking section)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BROWSER / CLIENT                                │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Public Site  │  │  Volunteer/Donor │  │     Admin Portal         │  │
│  │  (SC, static) │  │  Portal (SC+CC)  │  │     (SC+CC)              │  │
│  └───────┬───────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
│          │ TanStack Query    │ TanStack Query + SSE      │                │
└──────────┼───────────────────┼──────────────────────────┼────────────────┘
           │                   │                          │
┌──────────▼───────────────────▼──────────────────────────▼────────────────┐
│                     NEXT.JS APP ROUTER (Vercel)                          │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Middleware (src/middleware.ts)                                    │   │
│  │  — Session decode → attach role → route-group guard              │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Route Groups:                                                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ (public)/    │  │ (portal)/        │  │ (admin)/                  │  │
│  │ page.tsx     │  │ dashboard/       │  │ pickups/ users/ reports/  │  │
│  │ about/       │  │ pickups/         │  │ (SC server components)    │  │
│  │ donate/      │  │ tracking/[id]/   │  └───────────────────────────┘  │
│  └──────────────┘  └──────────────────┘                                 │
│                                                                          │
│  Route Handlers (src/app/api/):                                         │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ /api/tracking/[id] │  │ /api/payments/   │  │ /api/cron/*      │    │
│  │  SSE stream        │  │  webhook         │  │  background jobs │    │
│  └────────────────────┘  └──────────────────┘  └──────────────────┘    │
│                                                                          │
│  Server Actions (src/features/*/actions/):                              │
│  pickup mutations, user mutations, admin mutations                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
           │                                        │
┌──────────▼──────────────────────────┐  ┌─────────▼──────────────────────┐
│   SERVICE + REPOSITORY LAYER        │  │   EXTERNAL SERVICES             │
│   src/features/*/services/          │  │                                 │
│   src/server/repositories/          │  │  Razorpay (payments)           │
│   Drizzle ORM + pg                  │  │  Twilio (SMS/WhatsApp)         │
└──────────────────────────┬──────────┘  │  Resend/Nodemailer (email)     │
                           │             │  Firebase FCM (push)           │
┌──────────────────────────▼──────────┐  │  Google Maps JS API (map UI)   │
│   PostgreSQL (Neon / Supabase)      │  │  Maps Places API (geocoding)   │
│   Connection pool: pg-pool          │  └────────────────────────────────┘
│   LISTEN/NOTIFY channel: pg Client  │
└─────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `src/middleware.ts` | Decode session JWT, inject `x-user-role` header, enforce route-group access gates | App Router, every request |
| Route Group `(public)` | Marketing pages, impact stats, monetary donation flow | Server actions, Razorpay |
| Route Group `(portal)` | Donor and volunteer/driver portal — post pickup, claim, track | Server actions, SSE endpoint, TanStack Query |
| Route Group `(admin)` | Foundation staff dashboard — manage pickups/users/partners, reports | Server actions, TanStack Query |
| Route Handlers (`/api/tracking/[id]`) | SSE stream — holds persistent pg Client, fans out location pings | PostgreSQL NOTIFY, browser EventSource |
| Route Handler (`/api/payments/webhook`) | Razorpay webhook receiver — verifies signature, updates payment record | Razorpay, payment repository |
| Route Handler (`/api/cron/*`) | Vercel Cron endpoints — stale pickup cleanup, notification retries | Service layer |
| Server Actions (`src/features/*/actions/`) | All data mutations — authorize server-side by role before executing | Repository layer, notification dispatcher |
| `src/server/repositories/` | Thin typed wrappers over Drizzle queries — one file per entity | Drizzle + pg (PostgreSQL) |
| `src/features/*/services/` | Business logic orchestration — calls repositories, fires events | Repositories, notification dispatcher |
| `src/features/*/services/Mock*.ts` | Frozen mock implementations matching real service interface | Used when `NEXT_PUBLIC_USE_MOCK_DATA=true` |
| `src/features/*/services/*Adapter.ts` | Picks real vs mock based on env | Real service, mock service |
| `src/lib/notifications/dispatcher.ts` | Fan-out abstraction — accepts event, routes to all relevant channels | Twilio, Resend, FCM |
| `src/lib/mapper/` | Pure transform functions — DB row → domain type → API DTO | No I/O, no hooks |

---

## Recommended Project Structure

```
src/
├── app/                              # Next.js App Router root — routing ONLY
│   ├── (public)/                     # Route group: no auth required
│   │   ├── page.tsx                  # Landing page (SC)
│   │   ├── about/page.tsx
│   │   ├── impact/page.tsx           # Public impact dashboard
│   │   └── donate/page.tsx           # Monetary donation form
│   ├── (portal)/                     # Route group: requires role = donor | volunteer | driver
│   │   ├── layout.tsx                # Middleware-enforced; renders portal shell (SC)
│   │   ├── dashboard/page.tsx
│   │   ├── pickups/
│   │   │   ├── page.tsx              # Browse available pickups (SC)
│   │   │   ├── new/page.tsx          # Donor: create pickup request
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Pickup detail
│   │   │       └── track/page.tsx    # Live tracking map (CC — SSE consumer)
│   │   └── profile/page.tsx
│   ├── (admin)/                      # Route group: requires role = admin | staff
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── pickups/page.tsx
│   │   ├── users/page.tsx
│   │   ├── partners/page.tsx
│   │   └── reports/page.tsx
│   └── api/
│       ├── tracking/
│       │   └── [pickupId]/route.ts   # SSE — export const dynamic = "force-dynamic"
│       ├── payments/
│       │   └── webhook/route.ts      # Razorpay webhook receiver
│       └── cron/
│           ├── expire-pickups/route.ts
│           └── retry-notifications/route.ts
│
├── features/                         # All domain logic — feature-module layout
│   ├── pickup/
│   │   ├── components/
│   │   │   ├── PickupCard.tsx
│   │   │   ├── PickupStatusBadge.tsx
│   │   │   ├── PickupForm.tsx
│   │   │   └── shared/PickupList.tsx
│   │   ├── hooks/
│   │   │   ├── usePickups.ts         # TanStack Query wrapper
│   │   │   └── usePickupTracking.ts  # SSE hook → updates Zustand tracking store
│   │   ├── services/
│   │   │   ├── pickupService.ts      # Real service
│   │   │   ├── MockPickupService.ts  # Frozen mock
│   │   │   └── pickupAdapter.ts      # Env-switches real/mock
│   │   ├── actions/
│   │   │   └── pickupActions.ts      # Server actions (create, claim, updateStatus)
│   │   ├── store/
│   │   │   └── pickupTrackingStore.ts # Zustand — in-flight driver position
│   │   ├── types/
│   │   │   └── pickup.types.ts
│   │   ├── validations/
│   │   │   └── pickup.schema.ts      # Zod schemas
│   │   └── index.ts                  # Barrel
│   ├── auth/                         # Session, OTP, role guards
│   ├── donation/                     # Monetary donations + Razorpay
│   ├── notification/                 # In-app notification feed
│   ├── user/                         # User profile, preferences
│   ├── admin/                        # Admin-specific views / logic
│   └── partner/                      # Partner/donor org management
│
├── server/                           # Server-only — never imported by client components
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema definitions (all tables)
│   │   ├── client.ts                 # pg-pool (for normal queries) + pg Client factory (for LISTEN)
│   │   └── migrations/               # Drizzle Kit migration files
│   ├── repositories/                 # One file per entity — thin Drizzle wrappers
│   │   ├── pickup.repository.ts
│   │   ├── user.repository.ts
│   │   ├── statusEvent.repository.ts
│   │   ├── payment.repository.ts
│   │   ├── notification.repository.ts
│   │   └── partner.repository.ts
│   └── auth/
│       └── session.ts                # Session decode/encode (jose or iron-session)
│
├── lib/                              # Shared utilities — framework-agnostic
│   ├── notifications/
│   │   ├── dispatcher.ts             # Fan-out: accepts NotificationEvent, routes channels
│   │   ├── channels/
│   │   │   ├── emailChannel.ts       # Resend adapter
│   │   │   ├── smsChannel.ts         # Twilio SMS adapter
│   │   │   ├── whatsappChannel.ts    # Twilio WhatsApp adapter
│   │   │   └── pushChannel.ts        # FCM adapter
│   │   └── types.ts                  # NotificationEvent, NotificationChannel interface
│   ├── mapper/
│   │   ├── pickup.mapper.ts
│   │   ├── user.mapper.ts
│   │   └── payment.mapper.ts
│   ├── logger.ts
│   ├── cn.ts
│   └── utils.ts
│
├── components/
│   ├── ui/                           # shadcn/Radix primitives — never re-create
│   └── forms/                        # Shared FormField, FormSelect, FormPhoneInput, etc.
│
└── config/
    ├── env.ts                        # Zod env validation — refuse to boot on missing vars
    └── constants.ts                  # QUERY_KEYS, ROLES, STATUS_TRANSITIONS
```

---

## Data Model

### Core Entities and Relationships

```
users ─────────────────────────────────────────────────────────────────┐
  id (uuid PK)                                                          │
  name, email, phone                                                    │
  role: 'donor' | 'volunteer' | 'driver' | 'admin' | 'staff'           │
  auth_provider: 'otp' | 'email_password'                              │
  is_active                                                             │
  created_at                                                            │
                                                                        │
partners (donor orgs — restaurants, corporates, families)              │
  id, name, type, contact_user_id → users.id                          │
  address, lat, lng                                                     │
                                                                        │
delivery_sites (beneficiary drop-off points — shelters, temples)      │
  id, name, address, lat, lng, contact_name, contact_phone            │
                                                                        │
pickups ──────────────────────────────────────────────────────────────┐ │
  id (uuid PK)                                                         │ │
  donor_id → users.id               (who posted)                      │ │
  partner_id → partners.id          (nullable: org donor)             │ │
  volunteer_id → users.id           (nullable: assigned after claim)  │ │
  delivery_site_id → delivery_sites.id                                │ │
  food_description, quantity_kg, servings_estimate                    │ │
  pickup_address, pickup_lat, pickup_lng                              │ │
  window_start, window_end          (availability time window)        │ │
  status: 'requested'|'accepted'|'en_route'|'picked_up'|'delivered'  │ │
         |'cancelled'|'expired'                                        │ │
  created_at, updated_at                                               │ │
                                                                        │ │
status_events ───────────────────────────────────────────────────────┘ │
  id, pickup_id → pickups.id                                            │
  from_status, to_status                                                │
  actor_id → users.id                                                   │
  note (optional)                                                       │
  occurred_at                                                           │
                                                                        │
location_pings  (ephemeral — short TTL, purged after delivery)        │
  id, pickup_id → pickups.id                                            │
  driver_id → users.id                                                  │
  lat, lng, accuracy_m                                                  │
  recorded_at                                                           │
                                                                        │
donations (monetary)                                                    │
  id (uuid PK)                                                          │
  donor_id → users.id   (nullable: guest)                              │
  amount_paise, currency = 'INR'                                        │
  razorpay_order_id, razorpay_payment_id, razorpay_signature          │
  status: 'created'|'authorized'|'captured'|'failed'|'refunded'       │
  donor_name, donor_email, donor_phone  (for guest donors)            │
  created_at                                                            │
                                                                        │
notifications ──────────────────────────────────────────────────────┘
  id, recipient_id → users.id
  pickup_id → pickups.id   (nullable)
  event_type  (e.g. 'pickup.accepted', 'pickup.delivered')
  channel: 'in_app'|'email'|'sms'|'whatsapp'|'push'
  status: 'pending'|'sent'|'failed'
  payload (jsonb)
  sent_at, failed_reason
  created_at
```

**Key constraints:**
- `status_events` is append-only — never update, only insert. It is the audit log.
- `location_pings` accumulates only during active pickups; a cron job purges rows older than 24 h post-delivery.
- `donations.razorpay_signature` stored for idempotency checks on webhook replay.
- `pickups.status` transitions are validated in the server action before insert, not enforced solely by the DB (though a CHECK constraint is a good belt-and-suspenders addition).

---

## Data Flows

### 1. Rescue Loop (Happy Path)

```
Donor (browser)
  → Server Action: createPickup()
      → authorize(role === 'donor')
      → pickupRepository.insert()
      → notificationDispatcher.fire('pickup.created', [volunteer targets])
      → return pickup.id

Volunteer (browser)
  → Server Action: claimPickup(pickupId)
      → authorize(role === 'volunteer' | 'driver')
      → pickupRepository.updateStatus('requested' → 'accepted', volunteerId)
      → statusEventRepository.insert()
      → notificationDispatcher.fire('pickup.accepted', [donor, admin])

Volunteer (browser)
  → Server Action: advanceStatus(pickupId, 'en_route' | 'picked_up' | 'delivered')
      → authorize(actor === pickup.volunteer_id)
      → pickupRepository.updateStatus()
      → statusEventRepository.insert()
      → notificationDispatcher.fire(event, recipients)
```

### 2. Live Tracking Flow

```
DRIVER BROWSER
  → POST /api/tracking/[pickupId]/ping  (every ~5 s while en_route/picked_up)
      body: { lat, lng, accuracy }
      → authorize: actor === pickup.volunteer_id AND pickup is in active status
      → locationPingRepository.insert()
      → pg.query("SELECT pg_notify('pickup_<id>', JSON)")
                                │
                                │ PostgreSQL NOTIFY on channel "pickup_<id>"
                                ▼
ROUTE HANDLER: GET /api/tracking/[pickupId]
  export const dynamic = "force-dynamic"
  → authorize: recipient in [pickup.donor_id, pickup.volunteer_id, admin roles]
  → open dedicated pg.Client (NOT pool) and LISTEN on "pickup_<id>"
  → return ReadableStream (Content-Type: text/event-stream)
  → on notification: enqueue SSE data chunk to stream
  → on client disconnect: pg.Client.end(), stream close
                                │
                                │ SSE event stream
                                ▼
SUBSCRIBER BROWSER (donor watching / admin watching)
  → usePickupTracking(pickupId) hook
      → opens EventSource("/api/tracking/[pickupId]")
      → on message: pickupTrackingStore.setPosition(lat, lng)
      → Zustand store update → map component re-renders marker
```

**Vercel SSE caveat (MEDIUM confidence — verified):** Vercel's serverless functions have a max response duration (default 10 s on Hobby, configurable up to 800 s on Pro). Long-lived SSE connections with `LISTEN/NOTIFY` are incompatible with Vercel Hobby. Mitigation options in priority order:
1. **Vercel Pro / configurable timeout** — upgrade plan and set `maxDuration: 300` in route config. Covers most NGO-scale sessions.
2. **Polling fallback** — if SSE disconnects (EventSource auto-reconnects), the client polls `GET /api/tracking/[pickupId]/latest` on a 10 s interval instead. Simpler, slightly laggier.
3. **Supabase Realtime** — if on Supabase Postgres, its built-in Realtime channel handles this problem without persistent Next.js connections. Zero additional infra.

**Recommendation:** Start with Supabase as the Postgres host (free tier includes Realtime). Replace the custom SSE + LISTEN/NOTIFY design with Supabase Realtime channels on `location_pings` for the pickup tracking feature. This eliminates the Vercel serverless incompatibility entirely while staying within budget constraints.

### 3. Notification Fan-Out Flow

```
Service layer fires:
  notificationDispatcher.fire(event: NotificationEvent)
      │
      ├─→ determine recipients (query DB for pickup stakeholders)
      ├─→ determine channels per user (preferences, role defaults)
      │
      ├─→ notificationRepository.insertMany(pending records)  ← create audit trail first
      │
      ├─→ emailChannel.send()      → Resend API
      ├─→ smsChannel.send()        → Twilio SMS
      ├─→ whatsappChannel.send()   → Twilio WhatsApp
      └─→ pushChannel.send()       → Firebase FCM
              │
              └─→ update notification.status → 'sent' | 'failed'
                  (failed rows eligible for cron retry)
```

**Dispatcher interface:**
```typescript
// src/lib/notifications/types.ts
interface NotificationChannel {
  send(notification: NotificationRecord): Promise<void>;
}

interface NotificationEvent {
  type: 'pickup.created' | 'pickup.accepted' | 'pickup.en_route'
      | 'pickup.picked_up' | 'pickup.delivered' | 'pickup.cancelled'
      | 'donation.captured';
  pickupId?: string;
  donationId?: string;
  actorId: string;
}
```

Each channel adapter is independently swappable and testable. Adding WhatsApp templates or a new channel (Slack for staff) requires only a new file implementing `NotificationChannel` and registering it in the dispatcher's channel map — existing code unchanged.

### 4. Payment Flow (Razorpay)

```
Browser (donate/page.tsx)
  → Server Action: createRazorpayOrder(amountPaise)
      → Razorpay.orders.create() with server-side API key
      → donationRepository.insert(status='created', orderId)
      → return { orderId, key }

Browser
  → Opens Razorpay checkout widget (client-side JS)
  → User pays (UPI / card / netbanking)
  → Razorpay calls payment success handler in browser (do NOT trust this alone)

Razorpay servers → POST /api/payments/webhook
  → verify X-Razorpay-Signature (HMAC-SHA256) against RAZORPAY_WEBHOOK_SECRET
  → on payment.captured event:
      → donationRepository.updateStatus(orderId, 'captured', paymentId, signature)
      → notificationDispatcher.fire('donation.captured', donor)
  → return 200 (always — Razorpay retries on non-2xx)

SECURITY RULE: Never mark a donation captured from the client callback alone.
               The webhook is the authoritative signal.
```

### 5. RBAC Enforcement (Four-Layer Model)

```
Layer 1 — Middleware (src/middleware.ts):
  → decode session cookie → extract role
  → (public)  routes: pass through
  → (portal)  routes: deny if no session
  → (admin)   routes: deny if role not in ['admin', 'staff']
  → attach role to request headers for server components

Layer 2 — Server Components:
  → call getServerSession() / getRole()
  → conditionally render sections (volunteer sees claim button, donor does not)
  → never expose admin data to portal route groups

Layer 3 — Server Actions:
  → first line: const session = await requireRole(['volunteer', 'driver'])
  → throw FORBIDDEN before any repository call on mismatch
  → enforce ownership: actor === pickup.volunteer_id for status advances

Layer 4 — Repository / DB:
  → WHERE clauses enforce ownership at query level as belt-and-suspenders
  → No RLS needed (single-tenant), but CHECK constraints on status transitions
```

### 6. Background Jobs

```
vercel.json cron schedule → Route Handler /api/cron/*

Job: expire-pickups  (every 30 min)
  → pickupRepository.expireStale()   — set status='expired' where window_end < now AND status='requested'
  → notificationDispatcher.fire('pickup.expired', [donor])

Job: retry-notifications  (every 15 min)
  → notificationRepository.findFailed(olderThanMinutes: 5, limit: 50)
  → for each: re-attempt channel.send() → update status

Job: purge-location-pings  (daily)
  → locationPingRepository.deleteOlderThan(hoursAfterDelivery: 24)
```

For complex multi-step jobs (unlikely in v1), Inngest is the next step up from Vercel Cron without adding infrastructure.

---

## Architectural Patterns

### Pattern 1: Repository Thin-Wrapper (Service/Mock/Adapter matches conventions)

The frontend-practices rule mandates service + mock parity. On the server side, repositories are the data-access layer; services add business logic on top.

```typescript
// src/server/repositories/pickup.repository.ts
// Thin — only Drizzle queries, no business logic
export async function findPickupById(id: string): Promise<PickupRow | null> {
  return db.query.pickups.findFirst({ where: eq(pickups.id, id) }) ?? null;
}

// src/features/pickup/services/pickupService.ts
// Business logic — calls repository, fires events, validates transitions
export async function claimPickup(pickupId: string, volunteerId: string) {
  const pickup = await pickupRepository.findPickupById(pickupId);
  if (!pickup || pickup.status !== 'requested') throw new Error('Not claimable');
  await pickupRepository.updateStatus(pickupId, 'accepted', volunteerId);
  await statusEventRepository.insert({ pickupId, from: 'requested', to: 'accepted', actorId: volunteerId });
  await notificationDispatcher.fire({ type: 'pickup.accepted', pickupId, actorId: volunteerId });
}

// src/features/pickup/services/pickupAdapter.ts
export const PickupService = isUsingMockData() ? MockPickupService : RealPickupService;
```

Mapper functions sit between repository output and domain types — the component never imports a raw Drizzle row.

### Pattern 2: Server Action as the Primary Mutation Path

Avoid creating API route handlers for mutations. Server Actions colocate authorization, validation, and the repository call — less boilerplate, full TypeScript, zero API surface to protect separately.

```typescript
// src/features/pickup/actions/pickupActions.ts
'use server';
export async function createPickupAction(input: CreatePickupInput) {
  const session = await requireRole(['donor']);       // throws on fail
  const parsed = createPickupSchema.safeParse(input); // Zod validation
  if (!parsed.success) throw new ValidationError(parsed.error);
  const pickup = await PickupService.createPickup({ ...parsed.data, donorId: session.userId });
  revalidatePath('/portal/pickups');
  return pickup.id;
}
```

Route handlers are reserved for: SSE streams, webhook receivers (Razorpay), and cron endpoints.

### Pattern 3: Server Components by Default, Client Components at the Leaf

- `app/(portal)/pickups/page.tsx` — Server Component, fetches initial list via repository, passes to `PickupList`
- `PickupList` — Server Component, renders cards
- `ClaimButton` — Client Component (needs onClick); receives pickupId as prop, calls Server Action
- `TrackingMap` — Client Component (browser-only MapLibre/Leaflet), subscribes to SSE via `usePickupTracking`

This keeps the JS bundle minimal. The rule: add `'use client'` at the lowest component that actually needs it.

### Pattern 4: Notification Channel Interface (Open/Closed)

Adding a new channel (e.g. Telegram for staff) = add one file implementing `NotificationChannel`, register in dispatcher map. No existing channel code changes.

### Pattern 5: Status Machine Validated in Service Layer

Valid transitions defined as a constant map:

```typescript
const VALID_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  requested:  ['accepted', 'cancelled', 'expired'],
  accepted:   ['en_route', 'cancelled'],
  en_route:   ['picked_up', 'cancelled'],
  picked_up:  ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
  expired:    [],
};
```

Services validate before calling the repository. This prevents impossible states from being persisted even if client sends a rogue action.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Trusting the Razorpay Client Callback for Payment Confirmation

**What people do:** Mark donation as captured when the Razorpay checkout widget calls `onSuccess` in the browser.
**Why it's wrong:** Client callbacks can be intercepted or faked. Razorpay's own docs say webhooks are the authoritative signal.
**Do this instead:** Insert donation as `created` on order creation, update to `captured` only inside the verified webhook handler. Client callback triggers a polling UI update only.

### Anti-Pattern 2: Direct DB Queries Inside Route Group Pages

**What people do:** `import { db } from '@/server/db/client'` directly in `app/(portal)/pickups/page.tsx`.
**Why it's wrong:** Bypasses the service + repository layers, kills mock/adapter parity, makes the code untestable.
**Do this instead:** Pages call feature services (or repositories at most). Business logic stays in the service layer.

### Anti-Pattern 3: Encoding Role in a Client-Provided Header or Body

**What people do:** Send `role: "admin"` from the browser in a request body or header and trust it on the server.
**Why it's wrong:** Any user can set that value.
**Do this instead:** Always derive role from the server-side session (`requireRole()`). Never accept role from the client.

### Anti-Pattern 4: Long-Running SSE Connections on Vercel Hobby Plan

**What people do:** Implement SSE without checking the hosting plan's function timeout.
**Why it's wrong:** Vercel Hobby has a 10 s max function duration by default. SSE will silently be cut off.
**Do this instead:** Use Supabase Realtime (if on Supabase Postgres) or upgrade to Vercel Pro with `maxDuration: 300`. Document this constraint prominently at the start of the tracking phase.

### Anti-Pattern 5: Storing All Notification Sends as Fire-and-Forget

**What people do:** Call `emailChannel.send()` and never check the result.
**Why it's wrong:** Failed notifications are invisible. No retry path.
**Do this instead:** Insert notification rows as `pending` first, update to `sent` or `failed`, run a cron retry on failed rows.

### Anti-Pattern 6: Importing from a Feature's Deep Path in Another Feature

**What people do:** `import { PickupCard } from '@/features/pickup/components/PickupCard'` from inside `features/admin`.
**Why it's wrong:** Creates hidden coupling between features; breaks when the internals of `pickup` change.
**Do this instead:** Import only from the feature's `index.ts` barrel: `import { PickupCard } from '@/features/pickup'`.

---

## Build Order / Dependency Graph

Dependencies flow top to bottom. Each layer must be substantially complete before the next is useful.

```
Phase 1 — Foundation
  DB schema + Drizzle setup + migrations (schema.ts → repositories)
  Env validation (config/env.ts)
  Session/auth (server/auth/session.ts, auth feature)
  Middleware RBAC skeleton (route group guards)
  Shared UI shell (shadcn primitives, layout components)

Phase 2 — Rescue Loop Core  [depends on Phase 1]
  Pickup feature: create, list, claim, status advance
  StatusEvent repository (audit log)
  Pickup server actions with RBAC enforcement
  Pickup list + detail pages (portal route group)
  Mock services for all pickup operations

Phase 3 — Live Tracking  [depends on Phase 2 — needs active pickups to track]
  location_pings table + repository
  Driver ping endpoint (POST /api/tracking/[id]/ping)
  SSE stream route handler (GET /api/tracking/[id])
  usePickupTracking hook + Zustand tracking store
  TrackingMap component (Leaflet/MapLibre)
  Supabase Realtime integration OR Vercel Pro configuration

Phase 4 — Notifications  [depends on Phase 2 — needs status events to notify on]
  Notification dispatcher + channel adapters (email, SMS, WhatsApp)
  Notification repository + in-app feed
  Push (FCM) channel adapter
  Wire dispatcher into pickup service and cron retry job

Phase 5 — Payments  [depends on Phase 1 — auth; independent of Phases 2-4]
  Razorpay order creation server action
  Donate page (public route group)
  Webhook handler (/api/payments/webhook)
  donation repository

Phase 6 — Admin Portal  [depends on Phases 1-5 mostly complete]
  Admin route group pages (pickups, users, partners, reports)
  Impact metrics queries
  Partner/DeliverySite management

Phase 7 — Polish & Public Site  [can partly parallelize with Phase 6]
  Public landing, about, impact dashboard
  i18n (EN + Gujarati)
  PWA manifest, push notification subscription UI
  Background cron jobs (expire-pickups, purge-pings, retry-notifications)
```

**Critical path:** Phase 1 → Phase 2 → Phase 3 (live tracking is the riskiest phase; front-load the Vercel/Supabase hosting decision before Phase 3 starts). Phases 4 and 5 can be parallelized after Phase 2.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Razorpay | Server Action (create order) + Route Handler (webhook) | Verify HMAC-SHA256 signature on webhook; never trust client callback alone |
| Twilio SMS | HTTP API via `twilio` npm SDK, called from `smsChannel.ts` | India: DLT template registration required for transactional SMS |
| Twilio WhatsApp | Same SDK, `whatsapp:+91...` prefix | Requires approved WhatsApp Business template |
| Resend (email) | HTTP API via `resend` npm SDK | Free tier: 3 000 emails/mo — sufficient for NGO scale |
| Firebase FCM | `firebase-admin` SDK server-side for push | Requires service account JSON in env; web push requires VAPID key |
| Google Maps / MapLibre | Client-side JS library in TrackingMap component only | MapLibre (open-source) avoids per-load billing; Google Places for geocoding only |
| Supabase Realtime | Supabase JS client, Realtime channel subscription | Replaces custom SSE+LISTEN/NOTIFY if using Supabase Postgres |
| Neon Postgres | pg-pool for standard queries; direct pg.Client for LISTEN if not using Supabase | Neon HTTP transport does NOT support LISTEN/NOTIFY — must use direct TCP connection |

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| `app/` ↔ `features/` | Server Components call feature services; pages import via feature barrel `index.ts` | app/ has no business logic |
| `features/` ↔ `server/repositories/` | Services call repositories directly | No page/component imports repositories |
| `features/*/services/` ↔ `lib/notifications/` | Services call `dispatcher.fire()` | Dispatcher does not import from features |
| Client Components ↔ Server Actions | `import { actionFn } from '@/features/*/actions'` | Actions always declare `'use server'` |
| `server/` ↔ client components | NEVER — `server/` is server-only; use `import 'server-only'` guard | Prevents accidental client bundle inclusion |

---

## Scaling Considerations

| Scale | Approach |
|-------|----------|
| 0–500 concurrent users (NGO v1) | Monolith on Vercel Pro + Neon/Supabase free tier is entirely sufficient. No optimization needed. |
| 500–5 000 users | Add database connection pooling (PgBouncer or Neon's built-in pooling). Add Redis cache for public impact stats (Upstash free tier). Optimize notification dispatch to be async (Inngest queue instead of inline await). |
| 5 000+ users | Extract notification service to a separate worker. Add CDN for public pages. Consider read replicas for reporting queries. This is unlikely for a single-city NGO app in v1. |

**First bottleneck:** Notification fan-out is synchronous inline in v1. If a single rescue event triggers 50 SMS sends, the server action response will be slow. Move to a queue (Inngest or Trigger.dev) at the first sign of timeout issues.

**Second bottleneck:** Location pings table grows fast during active rescues. The daily purge cron is essential; add a partial index on `(pickup_id, recorded_at)` from the start.

---

## Sources

- [Next.js App Router: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js App Router: Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder)
- [App Router Directory Design: Project Structure Patterns](https://dev.to/pipipi-dev/app-router-directory-design-nextjs-project-structure-patterns-31eo)
- [Real-Time Notifications with SSE in Next.js](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/)
- [PostgreSQL LISTEN/NOTIFY + SSE](https://spin.atomicobject.com/postgres-listen-notify-events/)
- [Event-Driven Architecture: Postgres LISTEN/NOTIFY + Next.js](https://dohost.us/index.php/2026/06/10/event-driven-architectures-in-next-js-using-postgres-listen-notify-for-real-time-updates/)
- [SSE in Next.js App Router — Vercel serverless limitation](https://github.com/vercel/next.js/discussions/48427)
- [Authorization in Next.js App Router: RBAC + Middleware](https://medium.com/codetodeploy/authorization-in-next-js-app-router-rbac-middleware-production-safe-patterns-bfd9d529a617)
- [Pluggable Notification System — Factory Pattern](https://dev.to/lakshaykalra/building-a-pluggable-notification-system-in-javascript-using-the-factory-pattern-3lcp)
- [Razorpay + Next.js App Router Integration](https://www.akkhil.dev/blogs/razorpay-integration-with-nextjs)
- [Drizzle ORM + PostgreSQL in Next.js 15](https://strapi.io/blog/how-to-use-drizzle-orm-with-postgresql-in-a-nextjs-15-project)
- [Background Jobs: Inngest vs Trigger.dev vs Vercel Cron](https://www.hashbuilds.com/articles/next-js-background-jobs-inngest-vs-trigger-dev-vs-vercel-cron)

---

*Architecture research for: Rajyash Food Rescue (food-rescue logistics web app)*
*Researched: 2026-06-25*
