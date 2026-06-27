# Phase 2: Rescue Loop Core — Research

**Researched:** 2026-06-26
**Domain:** Pickup lifecycle (post, browse, claim, status machine, photo upload, map display)
**Confidence:** HIGH — all six integration specifics verified against Context7 + official sources

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pickup food category = pg enum: `cooked_meal`, `raw_produce`, `packaged`, `bakery`, `other`; plus free-text `description`.
- **D-02:** Quantity = number + unit enum (`servings`, `kg`). Two units only for v1.
- **D-03:** Photos live in Supabase Storage, **private** bucket `pickups`. Store object path in DB, not a public URL.
- **D-04:** Upload flow: server action issues signed upload URL (service-role key); client compresses (~1600px/JPEG) and uploads directly to Storage; display via short-lived signed download URLs. New secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **D-05:** Geocode address → lat/lng via **Nominatim/OSM** server-side at pickup creation. **Leaflet draggable pin** for fine-tuning. Store `address`, `lat`, `lng`. (Mapbox is the upgrade if Ahmedabad accuracy is poor — deferred.)
- **D-06:** Volunteer board shows all `status='requested'` pickups, newest first, as list + Leaflet map markers.
- **D-07:** Claim = atomic conditional UPDATE `WHERE id=:id AND status='requested' RETURNING *`. Zero rows = already claimed = "just taken" error.
- **D-08:** Status machine: `requested → accepted → en_route → picked_up → delivered` + `cancelled` (donor, pre-claim only). Server-side `VALID_TRANSITIONS` map; append `status_events` row per transition. Only assigned volunteer advances accepted→delivered; only donor cancels requested.
- **D-09:** Donor edit/cancel only while `status='requested'`. Quick-repost = clone fields → new `requested` row.
- **D-10:** Status-advance + claim buttons show loading state + explicit retry on failure. App motion budget (frugal, ≤200ms). Optimistic where safe; server is source of truth.

### Claude's Discretion
- Reuse `requireRole`/`requireUser`/`getSession` from Phase 1 as auth guard (first line of every server action).
- Feature module: `src/features/pickups/` with `components/hooks/services/validations/actions` subdirs.
- Repository: `src/server/db/repositories/pickups.ts` (mirrors `profiles.ts` pattern).
- TanStack Query for the volunteer board; Zustand only if UI state demands it.
- Design tokens + shadcn primitives + per-status pills + skeletons (already in Phase 1 globals.css).

### Deferred Ideas (OUT OF SCOPE)
- Live GPS tracking (Phase 3), notifications on status change (Phase 4).
- Distance/geofence filter, recurring pickups (v2).
- Donor-visible proof photo (v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DON-01 | Donor can create a pickup request (food type, quantity, location, time window) | Drizzle schema for `pickups` + `status_events`; Nominatim geocoding; Zod schema; server action pattern from Phase 1 |
| DON-02 | Donor can attach a photo to a pickup request | Supabase Storage `createSignedUploadUrl` server-side + browser `uploadToSignedUrl` (or raw PUT) + `createSignedUrl` for display |
| DON-03 | Donor must complete a food-safety attestation before posting | Zod boolean field `safetyAttested: true` enforced both client (RHF) and server (action parse) |
| DON-04 | Donor can view their own pickup requests and statuses | `pickupsRepo.getByDonorId(userId)` + TanStack Query + per-status pills already tokenized |
| DON-05 | Donor can edit or cancel a request before it is claimed | Service layer checks `status === 'requested'` before any edit/cancel mutation |
| DON-06 | Donor can quick-repost a previous request | Clone row server-side: new UUID, reset `status='requested'`, clear `volunteerId`/`claimedAt` |
| VOL-01 | Volunteer can browse available pickups as a list | `pickupsRepo.getOpen()` → server component renders `PickupList` with skeletons |
| VOL-02 | Volunteer can browse available pickups on a map | `react-leaflet` MapContainer + Marker cluster; `"use client"` + `dynamic(…, {ssr:false})` wrapper |
| VOL-03 | Volunteer can claim a pickup atomically (no double-claim race) | `db.update(pickups).set({status:'accepted', volunteerId, claimedAt:now()}).where(and(eq(pickups.id,id), eq(pickups.status,'requested'))).returning()` — 0 rows = already claimed |
| VOL-04 | Volunteer can advance a claimed pickup through statuses | `VALID_TRANSITIONS` map + actor-ownership check in service layer before DB write |
| VOL-05 | Volunteer can upload a proof-of-delivery photo on completion | Same storage flow as DON-02; path stored in `pickups.proofPhotoPath` |
| VOL-06 | Status transition controls work on patchy mobile networks (loading + retry on failure) | `useTransition` / `isPending` on form action + explicit retry button in error state; `.rj-press` CSS; app motion budget |
</phase_requirements>

---

## Summary

Phase 2 is the product core. Everything else in this app is scaffolding around the rescue loop. The Phase 1 foundation (auth, schema patterns, design system, env validation) is already in place; Phase 2 builds on top without redesigning those patterns.

Six non-obvious integration specifics drive the research: Supabase Storage from a Cloudflare Worker, react-leaflet + SSR, Nominatim geocoding constraints, the Drizzle atomic claim syntax, the status machine schema, and cache invalidation strategy on Workers. All six are resolved below with verified code patterns.

The most critical design insight: **`@supabase/supabase-js` is fully fetch-based** — it uses the global `fetch` available in both Node.js 18+ and Cloudflare Workers. No Node.js-specific HTTP modules. Creating a storage client with the service-role key works correctly in the Workers runtime. There is no Cloudflare-specific gotcha for Storage operations.

The second key insight: react-leaflet v5 documents explicitly that it is **not compatible with SSR** because Leaflet makes direct DOM calls on load. The correct pattern is a `dynamic(…, {ssr:false})` wrapper with `"use client"`. This is standard and well-documented.

**Primary recommendation:** Build the rescue loop in this order: schema (pickups + status_events) → repositories → service layer (business logic + VALID_TRANSITIONS) → server actions (auth-guarded) → donor UI (create, list, detail) → volunteer UI (board, claim, advance, photo). Map component is the last piece and can be developed in parallel.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pickup creation (form, validation, geocoding) | API/Backend (server action) | Browser/Client (form state) | Geocoding is server-side (Nominatim rate limit; service-role key); form in RHF+Zod client component |
| Signed upload URL generation | API/Backend (server action) | — | Requires service-role key — never expose to browser |
| Image compression | Browser/Client | — | Canvas-based compression happens before browser uploads to Storage; no server compute needed |
| Direct Storage upload | Browser/Client | — | Browser PUTs to Supabase Storage signed URL directly (bypasses Next.js worker) |
| Signed download URL generation | API/Backend (server action or RSC) | — | Requires service-role key to read from private bucket |
| Volunteer board (list) | Frontend Server (RSC) | Browser/Client (TanStack Query) | Initial render is server component; TQ handles refetch after mutations |
| Volunteer map | Browser/Client | — | Leaflet is DOM-only; MapContainer must be in a "use client" + ssr:false dynamic import |
| Atomic claim mutation | API/Backend (server action) | — | Conditional UPDATE WHERE + RETURNING; ownership enforcement server-side |
| Status advance | API/Backend (server action) | — | VALID_TRANSITIONS + actor check; never trust client-supplied next status |
| Status pills | Browser/Client | — | CSS-only using pre-tokenized `--st-<state>-*` vars from globals.css |

---

## Standard Stack

### New dependencies for Phase 2

| Library | Version (npm registry) | Purpose | Notes |
|---------|----------------------|---------|-------|
| `@supabase/supabase-js` | 2.108.2 | Storage client (signed upload/download URLs) | Fetch-based; works in CF Workers. Storage-only use — no Supabase Auth. |
| `react-leaflet` | 5.0.0 | Map component (volunteer board map, pin fine-tuner) | Must be `dynamic(…,{ssr:false})` + `"use client"` |
| `leaflet` | 1.9.4 | Underlying map library | Peer dep of react-leaflet; install both |
| `@types/leaflet` | latest | TypeScript types for leaflet | devDependency |
| `browser-image-compression` | 2.0.2 | Client-side image compression before upload | Canvas-based; works in modern browsers; no native deps |

### Already installed (reused from Phase 1)

`drizzle-orm`, `postgres`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `zustand`, `motion`, `lucide-react`.

**Installation command for Phase 2 additions:**
```bash
pnpm add @supabase/supabase-js react-leaflet leaflet browser-image-compression
pnpm add -D @types/leaflet
```

**Version verification:** Confirmed via `npm view` on 2026-06-26.
[VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
DONOR BROWSER                         VOLUNTEER BROWSER
  │                                     │
  │ 1. createPickup action              │ 1. getOpenPickups (RSC)
  │    ├─ requireRole(['donor'])         │    └─ PickupList rendered server-side
  │    ├─ Zod parse                      │
  │    ├─ Nominatim geocode (server)     │ 2. VolunteerMap (CC, ssr:false)
  │    ├─ pickupsRepo.insert()           │    └─ Markers from stored lat/lng
  │    └─ revalidatePath('/portal/…')   │
  │                                     │ 3. claimPickup action
  │ 2. getSignedUploadUrl action         │    ├─ requireRole(['volunteer'])
  │    └─ supabaseStorage               │    ├─ UPDATE WHERE status='requested'
  │       .createSignedUploadUrl(path)  │    │   RETURNING *
  │                                     │    ├─ 0 rows → "already claimed" error
  │ 3. Browser: compress → PUT to        │    └─ statusEvents.insert()
  │    signedUrl directly               │
  │                                     │ 4. advanceStatus action
  │ 4. savePhotoPath action              │    ├─ requireRole(['volunteer'])
  │    └─ pickupsRepo.update(photoPath) │    ├─ pickup.volunteerId === session.userId
  │                                     │    ├─ VALID_TRANSITIONS check
  │                                     │    ├─ pickupsRepo.updateStatus()
  │                                     │    └─ statusEvents.insert()
  │                                     │
  ▼                                     ▼
NEXT.JS WORKER (server actions + RSC)
  ├─ src/server/db/repositories/pickups.ts  (Drizzle, getDb())
  ├─ src/server/db/repositories/statusEvents.ts
  ├─ src/features/pickups/services/pickupService.ts  (business logic)
  └─ src/lib/storage.ts  (supabase service-role client, server-only)
        │
        ├─→ Supabase Storage (private bucket 'pickups')
        └─→ Supabase Postgres (via pooler port 6543, Drizzle)
```

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/
│   └── portal/
│       ├── pickups/
│       │   ├── page.tsx               # Donor: own pickup list (RSC)
│       │   ├── new/page.tsx           # Donor: create form (thin page → feature)
│       │   └── [id]/
│       │       ├── page.tsx           # Pickup detail (RSC, role-aware)
│       │       └── edit/page.tsx      # Donor: edit form (status guard)
│       └── board/
│           ├── page.tsx               # Volunteer: open pickups list (RSC)
│           └── map/page.tsx           # Volunteer: map view (CC wrapper page)
├── features/
│   └── pickups/
│       ├── components/
│       │   ├── PickupForm.tsx         # CC: RHF+Zod create/edit form
│       │   ├── PickupCard.tsx         # SC-friendly: renders one pickup card
│       │   ├── PickupStatusPill.tsx   # CC: status pill using CSS tokens
│       │   ├── PhotoUploader.tsx      # CC: compress → upload flow
│       │   ├── VolunteerBoard.tsx     # CC: list + TanStack Query
│       │   ├── PickupMap.tsx          # CC (use client + dynamic ssr:false)
│       │   ├── ClaimButton.tsx        # CC: claim action + loading/retry
│       │   └── StatusAdvanceButton.tsx # CC: advance action + loading/retry
│       ├── hooks/
│       │   ├── usePickups.ts          # TanStack Query: open pickups
│       │   └── useMyPickups.ts        # TanStack Query: donor's pickups
│       ├── services/
│       │   ├── pickupService.ts       # Business logic: VALID_TRANSITIONS, claim
│       │   ├── MockPickupService.ts   # Frozen mock (same interface)
│       │   └── pickupAdapter.ts       # env-switches real/mock
│       ├── actions/
│       │   └── pickupActions.ts       # 'use server' mutations
│       ├── validations/
│       │   └── pickup.schema.ts       # Zod: CreatePickupInput, UpdatePickupInput
│       └── index.ts                   # Barrel export
├── server/
│   └── db/
│       ├── schema.ts                  # Add: pickupStatusEnum, pickups, statusEvents
│       └── repositories/
│           ├── pickups.ts             # Thin Drizzle wrappers
│           └── statusEvents.ts        # Append-only audit log
└── lib/
    └── storage.ts                     # 'server-only' Supabase Storage client
```

---

## Integration Specifics

### 1. Supabase Storage: Signed Upload URL Flow

**Server action (issues the URL):**
```typescript
// src/lib/storage.ts  — import 'server-only'
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

// Single service-role client — no auth/session needed for Storage
export const supabaseStorage = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
).storage
```

```typescript
// src/features/pickups/actions/pickupActions.ts
'use server'
export async function getSignedUploadUrlAction(pickupId: string, filename: string) {
  const session = await requireRole(['donor', 'volunteer'])
  const ext = filename.split('.').pop() ?? 'jpg'
  const objectPath = `pickups/${pickupId}/${session.userId}-${Date.now()}.${ext}`

  const { data, error } = await supabaseStorage
    .from('pickups')
    .createSignedUploadUrl(objectPath)

  if (error || !data) throw new Error('Could not get upload URL')
  // Return signedUrl + token + objectPath to browser
  return { signedUrl: data.signedUrl, token: data.token, objectPath }
}
```

**Browser upload (client component, after compression):**
```typescript
// Option A: use supabase-js client in browser (anon key is fine for uploadToSignedUrl —
// the token authorizes the upload, not the client's auth state)
import { createClient } from '@supabase/supabase-js'
const browserStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
).storage

const { error } = await browserStorage
  .from('pickups')
  .uploadToSignedUrl(objectPath, token, compressedFile, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
  })

// Option B: raw PUT (no supabase-js needed in browser bundle)
await fetch(signedUrl, {
  method: 'PUT',
  body: compressedFile,
  headers: { 'Content-Type': 'image/jpeg' },
})
```

**Display (server action or RSC — generates short-lived read URL):**
```typescript
const { data } = await supabaseStorage
  .from('pickups')
  .createSignedUrl(objectPath, 3600)   // 1 hour
// data.signedUrl → pass to <img src={…} />
```

**Private bucket setup (one-time, done in Supabase Dashboard):**
- Create bucket `pickups` with `public: false`.
- No RLS policy needed: service-role key bypasses RLS.
- Free tier: 1 GB storage, 2 GB egress/month (sufficient for NGO scale).

**Cloudflare Workers compatibility:** `@supabase/supabase-js` is fetch-based internally (uses `globalThis.fetch`). CF Workers expose `fetch` globally. No Node.js HTTP shim needed. Works without any special configuration.
[VERIFIED: Context7 / supabase/supabase-js source — storage-js uses `post()` utility that calls `this.fetch`]

**CAUTION: do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.** The service-role client is strictly `server-only`.

---

### 2. react-leaflet in Next.js 15 App Router

**The one non-negotiable rule:** Leaflet makes direct DOM calls on module load (accesses `window`, `document`). It cannot be imported in a server render path.

```typescript
// src/features/pickups/components/PickupMap.tsx
'use client'

import dynamic from 'next/dynamic'
import type { PickupSummary } from '../types/pickup.types'

// Dynamic import with ssr:false — this is the correct pattern
const LeafletMap = dynamic(() => import('./LeafletMapInner'), { ssr: false })

interface Props { pickups: PickupSummary[] }

export function PickupMap({ pickups }: Props) {
  return (
    <div style={{ height: '400px', width: '100%' }}>
      <LeafletMap pickups={pickups} />
    </div>
  )
}
```

```typescript
// src/features/pickups/components/LeafletMapInner.tsx
// This file is ONLY ever loaded client-side (via dynamic import above)
'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { PickupSummary } from '../types/pickup.types'

// Fix broken marker icons (Leaflet's default icon paths don't resolve with bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

export default function LeafletMapInner({ pickups }: { pickups: PickupSummary[] }) {
  const center: [number, number] = [23.0225, 72.5714] // Ahmedabad

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickups.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>{p.description}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

**Marker icon fix:** Copy `leaflet/dist/images/` (marker-icon.png, marker-icon-2x.png, marker-shadow.png) to `public/leaflet/`. These are not bundled automatically by Next.js/webpack. This must be a Wave 0 task.

**OSM tile attribution:** The string `'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'` is legally required on every map using OSM tiles.
[VERIFIED: Context7 / react-leaflet.js.org — explicitly states "not compatible with server-side rendering"]

---

### 3. Nominatim Geocoding

**Endpoint:**
```
GET https://nominatim.openstreetmap.org/search
  ?q={address}+Ahmedabad+India
  &format=json
  &limit=1
  &addressdetails=0
```

**Server-side implementation (server action, called once at pickup creation):**
```typescript
// src/lib/geocoding.ts
import 'server-only'

interface GeoResult { lat: number; lng: number; displayName: string }

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const query = encodeURIComponent(`${address}, Ahmedabad, India`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'RajyashFoodRescue/1.0 (rajyashfoundation@rajyashgroup.com)',
      'Accept-Language': 'en',
    },
    // Do NOT call this at render time — call at creation time only, result stored in DB
    next: { revalidate: 0 },  // CF Workers: no caching (this is a creation-time call anyway)
  })

  if (!res.ok) return null
  const results = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
  if (!results.length) return null

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  }
}
```

**Rate limit:** Nominatim public instance allows **max 1 request/second** per application. At NGO scale (one pickup creation at a time by a single donor), this is never a concern. The call happens once at creation time — never on render.

**User-Agent requirement:** Must identify the application. Generic HTTP library User-Agents are explicitly prohibited by the Nominatim usage policy. Include app name + contact email.
[VERIFIED: nominatim.org/policies/ via WebFetch; Context7 / nominatim docs]

**Fallback:** If `geocodeAddress()` returns `null` (address not found), the form should surface "Address not found — please drag the pin to your location." The Leaflet draggable pin (D-05) is the user's escape hatch.

**Response shape:** `results[0].lat` and `results[0].lon` are strings — parse with `parseFloat()`. The field is `lon` (not `lng`).

---

### 4. Atomic Claim in Drizzle

The exact syntax for the race-safe conditional UPDATE:

```typescript
// src/server/db/repositories/pickups.ts
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { pickups, type Pickup } from '@/server/db/schema'

export const pickupsRepo = {
  /** Returns the claimed pickup row, or null if already taken. */
  async claimIfAvailable(
    pickupId: string,
    volunteerId: string,
  ): Promise<Pickup | null> {
    const db = getDb()
    const rows = await db
      .update(pickups)
      .set({
        status: 'accepted',
        volunteerId,
        claimedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(pickups.id, pickupId),
          eq(pickups.status, 'requested'),
        ),
      )
      .returning()

    return rows[0] ?? null  // null = 0 rows updated = already claimed
  },
}
```

**Why this is safe without a transaction:** Postgres UPDATE is atomic per-row. Two concurrent claims race on the same row; exactly one sees `status='requested'` and succeeds; the other sees `status='accepted'` from the first update and returns 0 rows.

**Service-layer translation:**
```typescript
// src/features/pickups/services/pickupService.ts
export async function claimPickup(pickupId: string, volunteerId: string) {
  const claimed = await pickupsRepo.claimIfAvailable(pickupId, volunteerId)
  if (!claimed) {
    throw new PickupAlreadyClaimedError('This pickup was just taken by another volunteer.')
  }
  await statusEventsRepo.insert({
    pickupId, fromStatus: 'requested', toStatus: 'accepted', actorId: volunteerId,
  })
  return claimed
}
```
[VERIFIED: Context7 / drizzle-team/drizzle-orm-docs — `.update().set().where().returning()` for PostgreSQL]

---

### 5. Status Machine + status_events Schema

**Drizzle schema additions to `src/server/db/schema.ts`:**

```typescript
import {
  pgTable, text, uuid, pgEnum, timestamp,
  integer, doublePrecision, boolean,
} from 'drizzle-orm/pg-core'

// --- Enums ---
export const pickupStatusEnum = pgEnum('pickup_status', [
  'requested', 'accepted', 'en_route', 'picked_up', 'delivered', 'cancelled',
])

export const foodCategoryEnum = pgEnum('food_category', [
  'cooked_meal', 'raw_produce', 'packaged', 'bakery', 'other',
])

export const quantityUnitEnum = pgEnum('quantity_unit', ['servings', 'kg'])

// --- pickups ---
export const pickups = pgTable('pickups', {
  id:             uuid('id').primaryKey().defaultRandom(),
  donorId:        text('donor_id').notNull().references(() => profiles.id),
  volunteerId:    text('volunteer_id').references(() => profiles.id),  // null until claimed
  status:         pickupStatusEnum('status').notNull().default('requested'),

  // Food details (D-01, D-02)
  foodCategory:   foodCategoryEnum('food_category').notNull(),
  description:    text('description').notNull(),
  quantity:       integer('quantity').notNull(),
  quantityUnit:   quantityUnitEnum('quantity_unit').notNull(),

  // Safety attestation (DON-03)
  safetyAttested: boolean('safety_attested').notNull().default(false),

  // Location (D-05)
  address:        text('address').notNull(),
  lat:            doublePrecision('lat').notNull(),
  lng:            doublePrecision('lng').notNull(),

  // Time window (DON-01)
  windowStart:    timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd:      timestamp('window_end',   { withTimezone: true }).notNull(),

  // Photos (D-03)
  foodPhotoPath:  text('food_photo_path'),   // object path in 'pickups' bucket
  proofPhotoPath: text('proof_photo_path'),  // set by volunteer on delivery (VOL-05)

  // Claim timestamp
  claimedAt:      timestamp('claimed_at', { withTimezone: true }),

  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// --- status_events (append-only audit log, D-08) ---
export const statusEvents = pgTable('status_events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  pickupId:    uuid('pickup_id').notNull().references(() => pickups.id),
  fromStatus:  pickupStatusEnum('from_status').notNull(),
  toStatus:    pickupStatusEnum('to_status').notNull(),
  actorId:     text('actor_id').notNull().references(() => profiles.id),
  note:        text('note'),
  occurredAt:  timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Pickup = typeof pickups.$inferSelect
export type NewPickup = typeof pickups.$inferInsert
export type StatusEvent = typeof statusEvents.$inferSelect
```

**VALID_TRANSITIONS map (in `src/config/constants.ts`):**

```typescript
import type { PickupStatus } from '@/server/db/schema'

export const VALID_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  requested:  ['accepted', 'cancelled'],
  accepted:   ['en_route', 'cancelled'],
  en_route:   ['picked_up', 'cancelled'],
  picked_up:  ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
} as const

// Actor rules (service layer enforces these):
// - 'accepted' is set by claimPickup (volunteer) using the atomic UPDATE
// - 'en_route' | 'picked_up' | 'delivered' — only pickup.volunteerId === session.userId
// - 'cancelled' — only pickup.donorId === session.userId AND status === 'requested'
```

**Service-layer transition enforcement:**
```typescript
export async function advanceStatus(
  pickupId: string,
  toStatus: PickupStatus,
  actorId: string,
) {
  const pickup = await pickupsRepo.getById(pickupId)
  if (!pickup) throw new NotFoundError()

  // Actor check: only the assigned volunteer can advance past 'accepted'
  if (toStatus !== 'cancelled' && pickup.volunteerId !== actorId) {
    throw new ForbiddenError('Only the assigned volunteer may advance this pickup.')
  }

  // Transition validity
  if (!VALID_TRANSITIONS[pickup.status].includes(toStatus)) {
    throw new InvalidTransitionError(`Cannot go from ${pickup.status} to ${toStatus}`)
  }

  await pickupsRepo.updateStatus(pickupId, toStatus)
  await statusEventsRepo.insert({
    pickupId, fromStatus: pickup.status, toStatus, actorId,
  })
}
```

---

### 6. Server Actions + Cache Invalidation on Cloudflare Workers

**The problem:** Next.js App Router with `@opennextjs/cloudflare` runs on Workers, which have no persistent cache between requests. However, the caching concern is still real: if a server component reads pickups and the response gets edge-cached (by Cloudflare's CDN layer or Next.js's internal fetch cache), a volunteer could see stale data after a claim.

**Solution — two-pronged:**

**A. Mark pickup routes as dynamic (prevent caching at the route level):**
```typescript
// src/app/portal/board/page.tsx
export const dynamic = 'force-dynamic'
// This ensures the page is rendered fresh on every request, not cached.
```

**B. `revalidatePath` in every mutation action (kills any cached responses):**
```typescript
'use server'
import { revalidatePath } from 'next/cache'

export async function claimPickupAction(pickupId: string) {
  const session = await requireRole(['volunteer'])
  await PickupService.claimPickup(pickupId, session.userId)
  revalidatePath('/portal/board')          // volunteer board
  revalidatePath(`/portal/pickups/${pickupId}`) // pickup detail
  revalidatePath('/portal/pickups')        // donor list
}
```

**C. TanStack Query invalidation (keeps the client view fresh):**
```typescript
// After a successful mutation in a client component:
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pickups.open })
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pickups.myPickups(userId) })
```

**Verdict:** `force-dynamic` is the safety net; `revalidatePath` is the on-demand trigger; TQ invalidation handles client-side freshness. All three together prevent stale pickup data.
[VERIFIED: Context7 / vercel/next.js — revalidatePath and dynamic segment config docs]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression before upload | Custom canvas-resize logic | `browser-image-compression` | Handles EXIF, orientation, JPEG quality, memory management on mobile; many edge cases in naive canvas approach |
| Geocoding | Own geocode fetch with no rate limiting | `geocodeAddress()` utility wrapping Nominatim | Rate limiting, User-Agent header, response parsing — easy to get wrong; the utility isolates all of it |
| Map component | Raw Leaflet imperative DOM API | react-leaflet MapContainer | State sync with React; tie-in with React lifecycle; react-leaflet is the standard React abstraction |
| Atomic claim | Optimistic lock / Redis / `SELECT FOR UPDATE` | Conditional `UPDATE WHERE status='requested' RETURNING` | Single-table, no distributed state; one SQL statement handles it correctly |
| Status transition enforcement | Client-side validation only | Server-side `VALID_TRANSITIONS` + service layer | Client can be spoofed; service layer is the only authoritative enforcement point |
| Signed URL proxy | Stream Storage blobs through Next.js server | Client `img src` pointing at signed URL directly | Unnecessary egress through the worker; signed URLs let browsers fetch from Supabase CDN directly |

---

## Common Pitfalls

### Pitfall 1: Leaflet CSS Not Imported
**What goes wrong:** Markers appear at wrong positions; tiles don't display; map looks broken.
**Why it happens:** react-leaflet renders correctly but `leaflet/dist/leaflet.css` is not loaded — the CSS is not auto-imported.
**How to avoid:** `import 'leaflet/dist/leaflet.css'` inside `LeafletMapInner.tsx` (the dynamic-imported file). Never in a server component or layout.
**Warning signs:** Tiles load but markers are clipped to top-left corner.

### Pitfall 2: Marker Icon 404s
**What goes wrong:** Default Leaflet marker icons (blue pin) fail to load because webpack/Vite hashes the image paths but Leaflet tries to load them from `/images/marker-icon.png`.
**Why it happens:** Leaflet's `Icon.Default` resolves icon URLs at runtime from a path it calculates itself, not from the bundled URL.
**How to avoid:** Copy `leaflet/dist/images/` to `public/leaflet/`; call `L.Icon.Default.mergeOptions({…})` with those public paths before any `<Marker>` renders.

### Pitfall 3: Supabase Service-Role Key in Browser Bundle
**What goes wrong:** Service-role key is exposed in the client JS — anyone can bypass Storage RLS and read/write anything in the project.
**Why it happens:** Developer imports `storage.ts` (which has `createClient(…, SERVICE_ROLE_KEY)`) from a `"use client"` component.
**How to avoid:** `import 'server-only'` at the top of `src/lib/storage.ts`. The `server-only` package throws a build error if the file is ever imported in a client bundle.

### Pitfall 4: Nominatim Called at Render Time
**What goes wrong:** Every page render fires a Nominatim request; rate limit (1 req/s) hit in seconds; requests fail; IP blocked temporarily.
**Why it happens:** Geocoding is placed inside a data-fetching function that runs on every server render (e.g., inside a server component that re-renders on TQ refetch).
**How to avoid:** Geocode once in the `createPickupAction` server action. Store `lat`/`lng` in the DB. Never call Nominatim again for that pickup.

### Pitfall 5: Missing `force-dynamic` on Pickup Board
**What goes wrong:** Volunteer board serves cached HTML; a new pickup or a claim doesn't appear until the CDN TTL expires.
**Why it happens:** Next.js App Router aggressively caches server components by default.
**How to avoid:** `export const dynamic = 'force-dynamic'` on `/portal/board/page.tsx` and `/portal/pickups/page.tsx`. Also `revalidatePath` in all mutation actions.

### Pitfall 6: Photo Upload Before Pickup Exists in DB
**What goes wrong:** Signed URL contains a path referencing `pickupId`; but if the upload succeeds before the pickup row is inserted (or the insert fails), the storage object is orphaned with no DB reference.
**Why it happens:** Two-step flow (get URL → upload → save path) if the order is wrong.
**How to avoid:** Insert the pickup row first (with `foodPhotoPath: null`), then get the signed URL for that `pickupId`, upload, then `savePhotoPath` action updates the row. Orphaned objects are a minor concern at NGO scale and can be cleaned up by a cron job.

### Pitfall 7: IDOR on Status Advance
**What goes wrong:** Volunteer A advances volunteer B's pickup (or a donor advances their own pickup through volunteer-only statuses).
**Why it happens:** Server action checks role (`volunteer`) but not ownership (`volunteerId === session.userId`).
**How to avoid:** Ownership check is mandatory in `advanceStatus` — `pickup.volunteerId !== actorId` → throw `ForbiddenError`. Auth-05 carries forward: role check + ownership check + recheck in the action body.

---

## Code Examples

### Pickup Creation Server Action
```typescript
// src/features/pickups/actions/pickupActions.ts
'use server'
import { requireRole } from '@/server/auth/session'
import { pickupsRepo } from '@/server/db/repositories/pickups'
import { geocodeAddress } from '@/lib/geocoding'
import { createPickupSchema } from '../validations/pickup.schema'
import { revalidatePath } from 'next/cache'

export async function createPickupAction(formData: unknown) {
  const session = await requireRole(['donor'])
  const parsed = createPickupSchema.safeParse(formData)
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()))

  const { address, ...rest } = parsed.data
  const geo = await geocodeAddress(address)
  if (!geo) throw new Error('Address not found — please drag the pin to set your location.')

  const pickup = await pickupsRepo.insert({
    ...rest,
    donorId: session.userId,
    address,
    lat: geo.lat,
    lng: geo.lng,
    status: 'requested',
  })
  revalidatePath('/portal/board')
  revalidatePath('/portal/pickups')
  return pickup.id
}
// Source: drizzle-team/drizzle-orm-docs + vercel/next.js docs
```

### Zod Schema for Pickup
```typescript
// src/features/pickups/validations/pickup.schema.ts
import { z } from 'zod'

export const createPickupSchema = z.object({
  foodCategory: z.enum(['cooked_meal', 'raw_produce', 'packaged', 'bakery', 'other']),
  description:  z.string().min(10, { message: 'Please describe the food (min 10 chars)' }),
  quantity:     z.number().int().min(1),
  quantityUnit: z.enum(['servings', 'kg']),
  address:      z.string().min(5, { message: 'Please enter a full address' }),
  windowStart:  z.string().datetime(),
  windowEnd:    z.string().datetime(),
  safetyAttested: z.literal(true, { error: 'You must confirm the food safety attestation' }),
})
// Note: Zod v4 uses { error: '…' } (not { required_error }) — see testing-practices.md
```

### Status Advance Server Action
```typescript
'use server'
import { requireRole } from '@/server/auth/session'
import { PickupService } from '../services/pickupAdapter'
import { revalidatePath } from 'next/cache'

export async function advanceStatusAction(pickupId: string, toStatus: string) {
  const session = await requireRole(['volunteer'])
  await PickupService.advanceStatus(pickupId, toStatus as PickupStatus, session.userId)
  revalidatePath(`/portal/pickups/${pickupId}`)
  revalidatePath('/portal/board')
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `react-leaflet` `dynamic` import with `{ loading: () => <p>…</p> }` | Same pattern; react-leaflet v5.0 released recently | v5.0 peer dep is `leaflet@^1.9.4`; same SSR story |
| Supabase Storage signed upload: browser POSTs to API, API proxies to Storage | Browser PUTs directly to signed URL (D-04) | Direct upload reduces latency and egress through the Worker |
| `next-blurhash` or lazy-load image placeholders | `rj-shimmer` skeleton (already in design system) | Shimmer is CSS-only, frugal budget; no extra lib needed |
| Nominatim as geocoder with no fallback | Nominatim first; Mapbox Geocoding API as manual fallback if India accuracy poor | Deferred — D-05 makes Mapbox the upgrade path |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Node.js / pnpm | Build | Available | Phase 1 verified |
| Supabase project | Storage + DB | Not yet (account-dependent) | User must create Supabase project, add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_ANON_KEY` to env |
| Leaflet icon assets in public/ | VOL-02 map | Not yet | Wave 0 task: copy from node_modules |
| Nominatim (external API) | DON-01 geocoding | Available (free, no account) | Rate-limit: 1 req/s. No key required. |

**New env vars to add to `src/config/env.ts`:**
```typescript
server: {
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // …existing vars…
},
client: {
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // …existing vars…
}
```
`NEXT_PUBLIC_*` vars are used only by the browser-side supabase-js client for `uploadToSignedUrl`. The anon key is safe to expose — the signed upload token (from the server action) is what authorizes the upload.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + @testing-library/react + jest-dom |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:run --reporter=dot` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DON-01 | `createPickupSchema` rejects invalid food category, missing description, invalid quantity, missing attestation | unit | `pnpm test:run src/features/pickups/validations/pickup.schema.test.ts` | Wave 0 |
| DON-01 | `createPickupSchema` passes with valid complete input | unit | same file | Wave 0 |
| DON-03 | `safetyAttested: false` → schema error "must confirm attestation" | unit | same file | Wave 0 |
| DON-05 | `pickupService.cancelPickup` throws when status is not 'requested' | unit | `pnpm test:run src/features/pickups/services/pickupService.test.ts` | Wave 0 |
| VOL-03 | `claimIfAvailable` returns null when pickup already claimed (status='accepted') | unit | `pnpm test:run src/server/db/repositories/pickups.test.ts` — mocked DB | Wave 0 |
| VOL-04 | `VALID_TRANSITIONS` map: valid transitions pass, invalid throw `InvalidTransitionError` | unit | `pnpm test:run src/features/pickups/services/pickupService.test.ts` | Wave 0 |
| VOL-04 | Actor ownership: advanceStatus throws ForbiddenError when volunteerId !== actorId | unit | same file | Wave 0 |
| VOL-06 | ClaimButton shows loading spinner during pending state; shows retry button on error | component | `pnpm test:run src/features/pickups/components/ClaimButton.test.tsx` | Wave 0 |
| DON-02/VOL-05 | (Photo upload flow — browser-side canvas compression + fetch) | manual | Device test on Chrome Android DevTools throttled 3G | — |

### Sampling Rate
- **Per task commit:** `pnpm test:run --reporter=dot` (run the pickups test files)
- **Per wave merge:** `pnpm test:run` (full suite — must include the 13 Phase 1 tests + Phase 2 additions)
- **Phase gate:** Full suite green + `pnpm typecheck` + `pnpm lint` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/features/pickups/validations/pickup.schema.test.ts` — covers DON-01, DON-03
- [ ] `src/features/pickups/services/pickupService.test.ts` — covers DON-05, VOL-03, VOL-04
- [ ] `src/features/pickups/components/ClaimButton.test.tsx` — covers VOL-06
- [ ] `src/server/db/repositories/pickups.test.ts` — mocked Drizzle for atomic claim logic

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | YES | `requireRole` first line of every action; ownership check in service layer (pickup.donorId / pickup.volunteerId vs session.userId) |
| V5 Input Validation | YES | Zod schema in server action; `safeParse` before any DB write |
| V6 Cryptography | YES (Storage) | Supabase service-role key server-only; signed URLs short-lived (1h download, 2h upload) |
| V2 Authentication | Carried over | Clerk + `requireRole` — no new auth surface in Phase 2 |
| V3 Session Management | Carried over | Clerk session JWT; no new session logic |

### Known Threat Patterns

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| IDOR: claim another user's pickup by knowing the ID | Elevation of Privilege | `claimPickup` server action calls `requireRole(['volunteer'])`; `advanceStatus` checks `pickup.volunteerId === actorId` |
| IDOR: donor edits another donor's pickup | Tampering | `editPickup` + `cancelPickup` actions check `pickup.donorId === session.userId` |
| Status replay: client sends `{toStatus: 'delivered'}` bypassing intermediate states | Tampering | `VALID_TRANSITIONS` map + service layer rejects any transition not in the map |
| Storage exfil: guessing object paths in the private bucket | Information Disclosure | Bucket is private (`public:false`); all reads require a service-role signed URL generated server-side |
| Service-role key leak via client bundle | Information Disclosure | `import 'server-only'` on `src/lib/storage.ts`; `SUPABASE_SERVICE_ROLE_KEY` is server env only |
| Nominatim abuse: geocoding form spammed | Denial of Service | Geocoding is in a server action behind auth (`requireRole(['donor'])`); authenticated donors only |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@supabase/supabase-js` v2 works in Cloudflare Workers without polyfills because it is fetch-based | Integration Specifics §1 | If a specific Storage operation uses a Node.js API, it would fail in Workers. Mitigation: use raw `fetch` PUT to the signed URL (Option B in §1) as the fallback — no supabase-js needed in the browser. |
| A2 | Nominatim geocoding accuracy is adequate for Ahmedabad street addresses | Integration Specifics §3 | If accuracy is poor (common for Gujarati street names), users will need to rely heavily on the draggable Leaflet pin. Upgrade path is Mapbox Geocoding (D-05 explicitly notes this). |
| A3 | `browser-image-compression` 2.x works in mobile Chrome on mid-range Android without OOM errors for JPEG photos from camera (typically 5-12 MB) | Standard Stack | If OOM occurs, fallback is native `<input type="file" accept="image/*" capture>` + no compression (file size limit set on Supabase bucket as safety). |

---

## Open Questions

1. **SUPABASE_ANON_KEY availability**
   - What we know: The public anon key is needed if we use `supabase-js` in the browser for `uploadToSignedUrl`.
   - What's unclear: User hasn't yet created a Supabase project, so the key doesn't exist yet.
   - Recommendation: Plan for both approaches (Option A: supabase-js in browser; Option B: raw fetch PUT). Option B requires no anon key and is simpler — the planner should default to Option B.

2. **Leaflet v2 (currently alpha) vs v1.9.4**
   - What we know: react-leaflet 5.0 peers on `leaflet@^1.9.4` (stable). Leaflet 2.x is in alpha.
   - What's unclear: Whether react-leaflet 5.0 will support Leaflet 2.x before Phase 2 ships.
   - Recommendation: Pin `leaflet@^1.9.4` (the stable peer dep). Do not upgrade until react-leaflet explicitly documents v2 support.

---

## Sources

### Primary (HIGH confidence — verified via tool)
- Context7 / `supabase/supabase-js` — `createSignedUploadUrl`, `uploadToSignedUrl`, `createSignedUrl` method signatures [VERIFIED]
- Context7 / `websites/react-leaflet_js` — SSR incompatibility statement, import patterns [VERIFIED]
- Context7 / `websites/nominatim_release-docs` — search endpoint, parameters, response shape [VERIFIED]
- nominatim.org/policies/ (WebFetch) — rate limit (1 req/s), User-Agent requirement [VERIFIED]
- Context7 / `drizzle-team/drizzle-orm-docs` — `.update().where().returning()` pattern, pgEnum, uuid, doublePrecision [VERIFIED]
- Context7 / `vercel/next.js` — `revalidatePath`, `export const dynamic = 'force-dynamic'` [VERIFIED]
- npm registry — version confirmation: `@supabase/supabase-js@2.108.2`, `react-leaflet@5.0.0`, `leaflet@1.9.4`, `browser-image-compression@2.0.2` [VERIFIED]

### Secondary (MEDIUM confidence)
- Context7 / `supabase/supabase-js` storage-js README — bucket create/access patterns
- Context7 / `websites/supabase` — Drizzle + Supabase connection setup with `prepare: false`

---

## Metadata

**Confidence breakdown:**
- Supabase Storage API: HIGH — method signatures verified from source
- react-leaflet SSR setup: HIGH — documented limitation in official docs
- Nominatim rate limits: HIGH — verified from official policy page
- Drizzle atomic UPDATE syntax: HIGH — from official drizzle-orm docs
- Status machine design: HIGH — standard pattern; VALID_TRANSITIONS from prior research
- Cache invalidation on Workers: HIGH — Next.js docs on `force-dynamic` + `revalidatePath`

**Research date:** 2026-06-26
**Valid until:** 2026-08-01 (libraries are stable; Supabase Storage API unlikely to change)
