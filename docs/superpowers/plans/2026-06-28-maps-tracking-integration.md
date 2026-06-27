# Maps + Live-Tracking Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a pickup location be set from a Google Maps link *or* an address (resolve → confirm-pin → store), give the driver a one-tap "Navigate" deep-link into the Google Maps app, and upgrade the watcher's live map to a smoothly-interpolated marker with a route line + ETA — all on free tiers, no map-API billing.

**Architecture:** Three slices on top of the existing Phase-2/3 pickup + tracking code. (1) A pure URL-coordinate parser (`src/lib/maps-link.ts`) + a server action `resolvePickupLocation` that tries direct-parse → short-link redirect-follow → Nominatim geocode, persisting the original link alongside the confirmed lat/lng. (2) A `googleMapsDirectionsUrl` helper + a `NavigateButton` anchor on the pickup detail page. (3) Pure math modules (`interpolate.ts`, `routing.ts`) consumed by the existing `MapViewInner` (rAF-tweened marker + `<Polyline>`) and a new `usePickupRoute` hook backed by a `getPickupRoute` action (OSRM public demo with automatic haversine/straight-line fallback). The existing Supabase-realtime ping path is untouched.

**Tech Stack:** Next.js 15 App Router (server actions, `"use server"`), TypeScript, Drizzle + Supabase Postgres, Clerk, Leaflet + react-leaflet 5 + OpenStreetMap tiles, Nominatim geocoding, OSRM public demo routing, Vitest + Testing Library, next-intl (EN/GU/HI).

## Global Constraints

- **Zero budget — free tiers only.** No Google Maps Platform API key, no billing account. Google Maps is used only via (a) parsing coords out of a user-pasted link and (b) a no-cost `dir/?api=1` deep-link. In-app map display + routing stay on OSM/Leaflet/Nominatim/OSRM.
- **Cloudflare Workers runtime** — no Node-only APIs in server code. `fetch`, `AbortSignal.timeout`, `crypto.randomUUID` are available; `Date.now()`/`performance.now()` are fine in client components. `react-leaflet` is **client-only** (`ssr: false` via the existing `MapView` dynamic wrapper) — never import `leaflet`/`react-leaflet` into a server file.
- **Production bundle MUST be built on Linux** (opennext's Windows patcher bug → runtime 500). Do not run `pnpm run deploy` from Windows. CI (ubuntu, on push to `main`) is the deploy path; local check = `pnpm deploy:wsl`. See `DEPLOY.md`.
- **Definition of done** (per `.claude/rules/git-workflow.md`): passes `SKIP_ENV_VALIDATION=1 pnpm typecheck` + `pnpm lint` + `pnpm test:run`. Tests follow `.claude/rules/testing-practices.md` (test logic that can really break — schemas, mappers, hooks, decisions; never barrels/constants/"renders without throwing"). Reuse-first per `.claude/rules/frontend-practices.md`.
- **No `Co-Authored-By` trailers** on any commit. Conventional commits (`feat(maps): …`, `feat(tracking): …`).
- **Server actions re-check auth + ownership** (no IDOR). Mirror the existing `getLatestPing`/`recordPing` authorization exactly.
- **Validation command (run on every "run the tests" step):** `SKIP_ENV_VALIDATION=1 pnpm test:run -- <path>` (the vitest config sets `SKIP_ENV_VALIDATION=1`, but pass it explicitly to be safe). `pnpm` is the package manager.
- **Branch:** this is a feature on shipped `main` (not a GSD phase). Work on `feature/maps-tracking` cut from `main`; PR base = `main`. Commit per task; push the branch + open the PR; **do not merge** (merge to `main` auto-deploys — leave that to the user).

---

## File Structure

**New (pure, heavily tested):**
- `src/lib/maps-link.ts` — Google-Maps URL coord parser + URL classifiers + directions-deep-link builder.
- `src/lib/maps-link.test.ts`
- `src/lib/routing.ts` — haversine distance, ETA estimate, straight-line route, moved-enough throttle.
- `src/lib/routing.test.ts`
- `src/features/pickups/lib/interpolate.ts` — `lerp` + `interpolateLatLng`.
- `src/features/pickups/lib/interpolate.test.ts`

**New (server / network — thin, not unit-tested directly):**
- `src/lib/routing.server.ts` — `fetchOsrmRoute` (OSRM public demo).

**New (client):**
- `src/features/pickups/components/NavigateButton.tsx`
- `src/features/pickups/components/NavigateButton.test.tsx`
- `src/features/pickups/hooks/usePickupRoute.ts`
- `src/features/pickups/hooks/usePickupRoute.test.ts`

**Modified:**
- `src/lib/geocoding.ts` — add `resolveShortMapsUrl` (server-only redirect-follow).
- `src/features/pickups/actions/pickupActions.ts` — add `resolvePickupLocation`, `getPickupRoute`; thread `googleMapsUrl` through `createPickup`/`updatePickup`.
- `src/features/pickups/validations/pickup.ts` — add optional `googleMapsUrl`.
- `src/server/db/schema.ts` — add `googleMapsUrl` column to `pickups` (+ generated migration).
- `src/features/pickups/components/PickupForm.tsx` — link-or-address input → `resolvePickupLocation`; stash `googleMapsUrl`.
- `src/features/pickups/components/MapViewInner.tsx` — rAF-tweened `LiveMarker`; new `route` prop → `<Polyline>`.
- `src/features/pickups/components/LiveTrackingMap.tsx` — wire `usePickupRoute`; render ETA card; pass `route` to `MapView`.
- `src/app/portal/pickups/[id]/page.tsx` — render `NavigateButton` for the assigned volunteer.
- `messages/<locale>/portal.json` (en/gu/hi) — Navigate, ETA, link-hint strings (locate the dir that holds the existing `portal.json`; same place common.json was edited in PR #10).

---

## Task 1: Google-Maps URL parser (pure)

**Files:**
- Create: `src/lib/maps-link.ts`
- Test: `src/lib/maps-link.test.ts`

**Interfaces:**
- Produces: `parseLatLngFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null`, `isGoogleMapsUrl(s: string): boolean`, `isShortGoogleMapsUrl(s: string): boolean`, `googleMapsDirectionsUrl(lat: number, lng: number): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/maps-link.test.ts
import { describe, it, expect } from "vitest";
import {
  parseLatLngFromGoogleMapsUrl,
  isGoogleMapsUrl,
  isShortGoogleMapsUrl,
  googleMapsDirectionsUrl,
} from "./maps-link";

describe("parseLatLngFromGoogleMapsUrl", () => {
  it("reads the @lat,lng viewport form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/@23.0225,72.5714,15z"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("prefers the !3d!4d place pin over the @ viewport", () => {
    const url =
      "https://www.google.com/maps/place/Foo/@23.01,72.50,17z/data=!3m1!4b1!3d23.0225!4d72.5714";
    expect(parseLatLngFromGoogleMapsUrl(url)).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads the ?q=lat,lng query form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.google.com/?q=23.0225,72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads the api=1 &query= form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=23.0225%2C72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads a &destination= directions form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("returns null when there are no coordinates (e.g. an unresolved short link or a place name)", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/place/Some+Restaurant")).toBeNull();
  });
  it("rejects out-of-range coordinates", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/@999,72.5,15z")).toBeNull();
  });
  it("returns null for non-URLs / plain addresses", () => {
    expect(parseLatLngFromGoogleMapsUrl("Satellite, Ahmedabad")).toBeNull();
  });
});

describe("URL classifiers", () => {
  it("recognises google maps URLs", () => {
    expect(isGoogleMapsUrl("https://www.google.com/maps/@23,72,15z")).toBe(true);
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isGoogleMapsUrl("Satellite, Ahmedabad")).toBe(false);
  });
  it("recognises short links that need redirect-following", () => {
    expect(isShortGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isShortGoogleMapsUrl("https://goo.gl/maps/abc")).toBe(true);
    expect(isShortGoogleMapsUrl("https://www.google.com/maps/@23,72,15z")).toBe(false);
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("builds a zero-cost dir deep link", () => {
    expect(googleMapsDirectionsUrl(23.0225, 72.5714))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/lib/maps-link.test.ts`
Expected: FAIL — cannot find module `./maps-link`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/maps-link.ts
/**
 * Pure helpers for Google-Maps links (no network, no key). We never call the
 * Google Maps API — we only (a) extract coordinates a user already has in a
 * pasted link and (b) build a free `dir/?api=1` deep-link for turn-by-turn.
 * Short links (maps.app.goo.gl) carry no coords until resolved — see
 * resolveShortMapsUrl in src/lib/geocoding.ts (server-only redirect-follow).
 */

function validPair(latStr: string, lngStr: string): { lat: number; lng: number } | null {
  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Extract a lat/lng from a Google Maps URL, or null. Precedence: place-pin
 *  (!3d!4d) → explicit query params → @viewport. */
export function parseLatLngFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // !3dLAT!4dLNG — the actual place marker (most precise).
  const place = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (place) {
    const hit = validPair(place[1], place[2]);
    if (hit) return hit;
  }

  // Explicit "lat,lng" params: q / query / destination / ll / center / sll.
  try {
    const u = new URL(url);
    for (const key of ["q", "query", "destination", "ll", "center", "sll"]) {
      const v = u.searchParams.get(key);
      if (v && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(v.trim())) {
        const [la, ln] = v.trim().split(",");
        const hit = validPair(la, ln);
        if (hit) return hit;
      }
    }
  } catch {
    // not a parseable URL — fall through to the regex form below
  }

  // @LAT,LNG (viewport center).
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const hit = validPair(at[1], at[2]);
    if (hit) return hit;
  }
  return null;
}

const GMAPS_HOST = /(^|\.)(google\.[a-z.]+|goo\.gl)$/i;

export function isGoogleMapsUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    if (!GMAPS_HOST.test(u.hostname)) return false;
    return /\/maps/.test(u.pathname) || u.hostname.startsWith("maps.") || u.hostname.endsWith("goo.gl");
  } catch {
    return false;
  }
}

export function isShortGoogleMapsUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    if (u.hostname === "maps.app.goo.gl") return true;
    if (u.hostname === "goo.gl" && u.pathname.startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

/** Free, no-key turn-by-turn deep link — opens the Google Maps app/site. */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/lib/maps-link.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/maps-link.ts src/lib/maps-link.test.ts
git commit -m "feat(maps): pure Google-Maps URL coord parser + directions deep-link"
```

---

## Task 2: `resolvePickupLocation` server action (link → short-link → geocode)

**Files:**
- Modify: `src/lib/geocoding.ts` (add `resolveShortMapsUrl`)
- Modify: `src/features/pickups/actions/pickupActions.ts` (add `resolvePickupLocation`)
- Test: `src/features/pickups/actions/resolvePickupLocation.test.ts`

**Interfaces:**
- Consumes: `parseLatLngFromGoogleMapsUrl`, `isGoogleMapsUrl`, `isShortGoogleMapsUrl` (Task 1); `geocodeAddress` (existing, `src/lib/geocoding.ts`).
- Produces: `resolvePickupLocation(input: string): Promise<Result<{ lat: number; lng: number; displayName: string; googleMapsUrl: string | null }>>` where `Result<T> = ({ ok: true } & T) | { ok: false; code: string; message: string }` (the existing type in `pickupActions.ts`); `resolveShortMapsUrl(url: string): Promise<string | null>`.

- [ ] **Step 1: Add `resolveShortMapsUrl` to `src/lib/geocoding.ts`**

Append to `src/lib/geocoding.ts` (it already has `import "server-only"` and the `USER_AGENT` const):

```ts
/**
 * Resolve a Google Maps short link (maps.app.goo.gl / goo.gl/maps) to its full
 * URL by following the redirect server-side, so the pure parser can read the
 * embedded coords. Returns the final URL, or null on any failure. The body is
 * never read — we only need res.url after redirects (Workers fetch follows them).
 */
export async function resolveShortMapsUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    return res.url || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/features/pickups/actions/resolvePickupLocation.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Auth: always authorised in these tests.
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn().mockResolvedValue({ userId: "u1", role: "donor" }),
  getSession: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

// geocoding lib: control geocodeAddress + resolveShortMapsUrl per test.
const geocodeAddress = vi.fn();
const resolveShortMapsUrl = vi.fn();
vi.mock("@/lib/geocoding", () => ({
  geocodeAddress: (...a: unknown[]) => geocodeAddress(...a),
  resolveShortMapsUrl: (...a: unknown[]) => resolveShortMapsUrl(...a),
}));

import { resolvePickupLocation } from "./pickupActions";

beforeEach(() => {
  geocodeAddress.mockReset();
  resolveShortMapsUrl.mockReset();
});

describe("resolvePickupLocation", () => {
  it("parses coords straight from a full Google Maps link (no network)", async () => {
    const res = await resolvePickupLocation("https://www.google.com/maps/@23.0225,72.5714,15z");
    expect(res).toMatchObject({ ok: true, lat: 23.0225, lng: 72.5714 });
    expect(res.ok && res.googleMapsUrl).toBe("https://www.google.com/maps/@23.0225,72.5714,15z");
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it("follows a short link, then parses coords from the resolved URL", async () => {
    resolveShortMapsUrl.mockResolvedValue("https://www.google.com/maps/place/X/data=!3d23.01!4d72.52");
    const res = await resolvePickupLocation("https://maps.app.goo.gl/abc");
    expect(res).toMatchObject({ ok: true, lat: 23.01, lng: 72.52 });
    expect(res.ok && res.googleMapsUrl).toBe("https://maps.app.goo.gl/abc"); // original link kept
    expect(resolveShortMapsUrl).toHaveBeenCalledOnce();
  });

  it("geocodes a plain address via Nominatim", async () => {
    geocodeAddress.mockResolvedValue({ lat: 23.03, lng: 72.58, displayName: "Satellite, Ahmedabad" });
    const res = await resolvePickupLocation("Satellite, Ahmedabad");
    expect(res).toMatchObject({ ok: true, lat: 23.03, lng: 72.58, googleMapsUrl: null });
  });

  it("fails clearly when a link has no coords and the short-link resolve yields none", async () => {
    resolveShortMapsUrl.mockResolvedValue("https://www.google.com/maps/place/No+Coords+Here");
    const res = await resolvePickupLocation("https://maps.app.goo.gl/nope");
    expect(res.ok).toBe(false);
  });

  it("fails when an address can't be geocoded", async () => {
    geocodeAddress.mockResolvedValue(null);
    const res = await resolvePickupLocation("asdfqwer nowhere");
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/actions/resolvePickupLocation.test.ts`
Expected: FAIL — `resolvePickupLocation` is not exported.

- [ ] **Step 4: Implement the action**

In `src/features/pickups/actions/pickupActions.ts`, extend the geocoding import and add the action next to `geocodePickupAddress`.

Change the existing import line:
```ts
import { geocodeAddress } from "@/lib/geocoding";
```
to:
```ts
import { geocodeAddress, resolveShortMapsUrl } from "@/lib/geocoding";
import {
  parseLatLngFromGoogleMapsUrl,
  isGoogleMapsUrl,
  isShortGoogleMapsUrl,
} from "@/lib/maps-link";
```

Add the action (place it right below `geocodePickupAddress`):
```ts
/**
 * DON-01 (bridge): resolve a pasted Google Maps link OR a typed address to a
 * lat/lng for the confirm-pin. Order: direct URL parse → short-link redirect +
 * parse → Nominatim geocode. Keeps the ORIGINAL pasted link (not the expanded
 * one) so the stored link stays human-friendly. Auth-gated like geocodePickupAddress.
 */
export async function resolvePickupLocation(
  input: string,
): Promise<
  Result<{ lat: number; lng: number; displayName: string; googleMapsUrl: string | null }>
> {
  try {
    await requireRole(["donor", "volunteer", "admin"]);
  } catch {
    return fail("UNAUTHORIZED", "Sign in first.");
  }
  const raw = input.trim();
  if (!raw) return fail("VALIDATION", "Enter an address or Google Maps link.");

  if (isGoogleMapsUrl(raw)) {
    let coords = parseLatLngFromGoogleMapsUrl(raw);
    if (!coords && isShortGoogleMapsUrl(raw)) {
      const resolved = await resolveShortMapsUrl(raw);
      if (resolved) coords = parseLatLngFromGoogleMapsUrl(resolved);
    }
    if (coords) {
      return {
        ok: true,
        lat: coords.lat,
        lng: coords.lng,
        displayName: "Pinned from Google Maps",
        googleMapsUrl: raw,
      };
    }
    return fail(
      "NOT_FOUND",
      "Couldn't read coordinates from that link — type the address or drag the pin.",
    );
  }

  const r = await geocodeAddress(raw);
  if (!r) return fail("NOT_FOUND", "Couldn't find that address — drag the pin instead.");
  return { ok: true, lat: r.lat, lng: r.lng, displayName: r.displayName, googleMapsUrl: null };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/actions/resolvePickupLocation.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 6: Typecheck + commit**

```bash
SKIP_ENV_VALIDATION=1 pnpm typecheck
git add src/lib/geocoding.ts src/features/pickups/actions/pickupActions.ts src/features/pickups/actions/resolvePickupLocation.test.ts
git commit -m "feat(maps): resolvePickupLocation — link/short-link/address → lat,lng"
```

---

## Task 3: Persist the original Google Maps link (schema + validation + actions + migration)

**Files:**
- Modify: `src/server/db/schema.ts` (add `googleMapsUrl` to `pickups`)
- Modify: `src/features/pickups/validations/pickup.ts` (add optional `googleMapsUrl`)
- Modify: `src/features/pickups/actions/pickupActions.ts` (`createPickup` + `updatePickup` mapping)
- Create: `src/server/db/migrations/0005_*.sql` (via drizzle-kit generate) + apply to remote
- Test: `src/features/pickups/validations/pickup.test.ts` (add a case if the file exists; else create)

**Interfaces:**
- Produces: `pickups.googleMapsUrl: text | null`; `PickupFormInput.googleMapsUrl?: string`.

- [ ] **Step 1: Add the column to the schema**

In `src/server/db/schema.ts`, inside the `pickups` table's "Where (D-05)" block, after the `lng` column:
```ts
    address: text("address").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    // Bridge: the original pasted Google Maps link, when location came from one.
    googleMapsUrl: text("google_maps_url"),
```

- [ ] **Step 2: Add the optional field to the Zod schema + a failing test**

In `src/features/pickups/validations/pickup.ts`, add to the object (after `foodPhotoPath`):
```ts
    googleMapsUrl: z.string().url().optional().or(z.literal("")),
```

Add a test (create `src/features/pickups/validations/pickup.test.ts` if absent; otherwise append the `describe`):
```ts
import { describe, it, expect } from "vitest";
import { pickupFormSchema } from "./pickup";

const base = {
  category: "cooked_meal",
  quantity: 10,
  quantityUnit: "servings",
  windowStart: "2026-07-01T10:00",
  windowEnd: "2026-07-01T12:00",
  address: "Satellite, Ahmedabad",
  lat: 23.0225,
  lng: 72.5714,
  safetyAttested: true,
};

describe("pickupFormSchema googleMapsUrl", () => {
  it("accepts a valid url", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "https://maps.app.goo.gl/x" });
    expect(r.success).toBe(true);
  });
  it("accepts an empty string (no link used)", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "" });
    expect(r.success).toBe(true);
  });
  it("accepts omission", () => {
    const r = pickupFormSchema.safeParse(base);
    expect(r.success).toBe(true);
  });
  it("rejects a non-url string", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "not a url" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/validations/pickup.test.ts`
Expected: FAIL — `not a url` case currently passes because the field doesn't exist yet (so the negative test fails). After Step 2's schema edit it should already pass; if you wrote the schema edit and the test together, run to confirm GREEN, then continue. (TDD note: if it's green immediately because you applied Step 2, that's fine — the value is the regression guard.)

- [ ] **Step 4: Thread `googleMapsUrl` through the actions**

In `createPickup` (the `pickupsRepo.create({ … })` call), add after `foodPhotoPath`:
```ts
      foodPhotoPath: d.foodPhotoPath || null,
      googleMapsUrl: d.googleMapsUrl || null,
      status: "requested",
```

In `updatePickup`, find the `pickupsRepo.updateIfRequested(...)` call (the fields object built from the parsed data) and add `googleMapsUrl: d.googleMapsUrl || null,` to that fields object alongside `address`, `lat`, `lng`. (Read the existing `updatePickup` body — mirror exactly how `address`/`lat`/`lng` are passed.)

- [ ] **Step 5: Generate + apply the migration**

```bash
pnpm drizzle-kit generate
```
Expected: creates `src/server/db/migrations/0005_*.sql` containing `ALTER TABLE "pickups" ADD COLUMN "google_maps_url" text;` plus a `meta/0005_snapshot.json`.

Apply to the remote Supabase DB using the Supabase MCP `apply_migration` tool, name `add_google_maps_url`, with the generated SQL (or the literal `ALTER TABLE "pickups" ADD COLUMN "google_maps_url" text;`). Verify with `list_tables` (or `execute_sql` `select column_name from information_schema.columns where table_name='pickups' and column_name='google_maps_url'`) that the column exists.

- [ ] **Step 6: Typecheck, test, commit**

```bash
SKIP_ENV_VALIDATION=1 pnpm typecheck
SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/validations/pickup.test.ts
git add src/server/db/schema.ts src/features/pickups/validations/pickup.ts src/features/pickups/validations/pickup.test.ts src/features/pickups/actions/pickupActions.ts src/server/db/migrations/
git commit -m "feat(maps): persist original Google Maps link on pickups"
```

---

## Task 4: Wire the pickup form to link-or-address resolution

**Files:**
- Modify: `src/features/pickups/components/PickupForm.tsx`
- Modify: `messages/<locale>/portal.json` (en/gu/hi) — add the link hint string

**Interfaces:**
- Consumes: `resolvePickupLocation` (Task 2).

- [ ] **Step 1: Add i18n strings**

Locate the locale message files (the dir containing `portal.json` for `en`, `gu`, `hi` — same place `common.json` was edited in PR #10; e.g. `messages/en/portal.json`). Under the existing `pickup.form` object add:
- en: `"locationLinkHint": "Paste a Google Maps link or type an address"`
- gu: `"locationLinkHint": "Google Maps લિંક પેસ્ટ કરો અથવા સરનામું લખો"`
- hi: `"locationLinkHint": "Google Maps लिंक पेस्ट करें या पता लिखें"`

(If a recursive catalog-parity test exists — it does, per the Phase-7 handoff — every key must be present in all three locales or that test fails. Add to all three.)

- [ ] **Step 2: Update the form**

In `src/features/pickups/components/PickupForm.tsx`:

1. Add `googleMapsUrl` to the `FormValues` interface:
```ts
  lat: number;
  lng: number;
  googleMapsUrl?: string;
  safetyAttested: boolean;
```

2. Replace the `geocodePickupAddress` import with `resolvePickupLocation`:
```ts
import {
  createPickup,
  updatePickup,
  resolvePickupLocation,
} from "@/features/pickups/actions/pickupActions";
```

3. Replace `findOnMap` with a resolver that also stashes the link:
```ts
  async function findOnMap() {
    if (!address) return;
    setGeocoding(true);
    const r = await resolvePickupLocation(address);
    setGeocoding(false);
    if (r.ok) {
      setValue("lat", r.lat, { shouldValidate: true });
      setValue("lng", r.lng, { shouldValidate: true });
      setValue("googleMapsUrl", r.googleMapsUrl ?? "");
    } else {
      setServerError(r.message);
    }
  }
```

4. Register the hidden field (so it submits) — add just below the address `<Input>`/Button row, inside the same location `<div>`:
```tsx
        <input type="hidden" {...register("googleMapsUrl")} />
```

5. Add the hint under the address label. Change the address `<Label>` block to include the hint paragraph:
```tsx
      <div>
        <Label htmlFor="address">{t("pickup.form.location")}</Label>
        <p className="mb-1.5 text-xs text-muted-foreground">{t("pickup.form.locationLinkHint")}</p>
        <div className="flex gap-2">
          <Input id="address" placeholder="Area, landmark, or Google Maps link" {...register("address")} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm lint`
Expected: 0 errors (1 pre-existing font lint warning is acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/features/pickups/components/PickupForm.tsx messages/
git commit -m "feat(maps): pickup form accepts a Google Maps link or address"
```

(No component test here: this is thin wiring — the resolution logic is covered by Task 2, the schema by Task 3. Per testing-practices, don't add a "renders without throwing" test.)

---

## Task 5: Driver "Navigate" deep-link button

**Files:**
- Create: `src/features/pickups/components/NavigateButton.tsx`
- Test: `src/features/pickups/components/NavigateButton.test.tsx`
- Modify: `src/app/portal/pickups/[id]/page.tsx`
- Modify: `messages/<locale>/portal.json` (en/gu/hi) — `pickup.detail.navigate`

**Interfaces:**
- Consumes: `googleMapsDirectionsUrl` (Task 1).

- [ ] **Step 1: Add i18n strings**

Under `pickup.detail` in each locale's `portal.json`:
- en: `"navigate": "Navigate"`
- gu: `"navigate": "દિશા બતાવો"`
- hi: `"navigate": "रास्ता दिखाओ"`

- [ ] **Step 2: Write the failing test**

```tsx
// src/features/pickups/components/NavigateButton.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

import { NavigateButton } from "./NavigateButton";

describe("NavigateButton", () => {
  it("links to the Google Maps directions deep-link for the coords", () => {
    render(<NavigateButton lat={23.0225} lng={72.5714} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/components/NavigateButton.test.tsx`
Expected: FAIL — cannot find module `./NavigateButton`.

- [ ] **Step 4: Implement the component**

First confirm the shadcn helpers: `buttonVariants` is exported from `src/components/ui/button.tsx` and `cn` from `src/lib/utils.ts` (shadcn default in this repo). If `cn` lives elsewhere, import from there (grep `export function cn`).

```tsx
// src/features/pickups/components/NavigateButton.tsx
"use client";

import { Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { googleMapsDirectionsUrl } from "@/lib/maps-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Driver one-tap navigation (bridge §4). Opens the Google Maps app/site with
 * turn-by-turn directions to the pickup coords — free deep-link, no API/billing.
 */
export function NavigateButton({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("portal");
  return (
    <a
      href={googleMapsDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
    >
      <Navigation className="size-4" aria-hidden />
      {t("pickup.detail.navigate")}
    </a>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/components/NavigateButton.test.tsx`
Expected: PASS.

- [ ] **Step 6: Place it on the detail page**

In `src/app/portal/pickups/[id]/page.tsx`:

1. Add the import alongside the other pickup-component imports:
```ts
import { NavigateButton } from "@/features/pickups/components/NavigateButton";
```

2. In the "Actions by viewer" block, render it for the assigned volunteer once they've claimed (so they can navigate to the restaurant before/while en route). Add **above** the `StatusAdvanceSection`:
```tsx
        {isAssignedVolunteer &&
          (pickup.status === "claimed" || isActive) && (
            <div className="mb-3">
              <NavigateButton lat={pickup.lat} lng={pickup.lng} />
            </div>
          )}
        {isAssignedVolunteer && (
          <StatusAdvanceSection
```

- [ ] **Step 7: Typecheck + commit**

```bash
SKIP_ENV_VALIDATION=1 pnpm typecheck
git add src/features/pickups/components/NavigateButton.tsx src/features/pickups/components/NavigateButton.test.tsx src/app/portal/pickups/[id]/page.tsx messages/
git commit -m "feat(tracking): driver Navigate deep-link on pickup detail"
```

---

## Task 6: Marker interpolation math (pure)

**Files:**
- Create: `src/features/pickups/lib/interpolate.ts`
- Test: `src/features/pickups/lib/interpolate.test.ts`

**Interfaces:**
- Produces: `lerp(a: number, b: number, t: number): number`; `interpolateLatLng(from: { lat: number; lng: number }, to: { lat: number; lng: number }, t: number): { lat: number; lng: number }` (t clamped to [0,1]).

- [ ] **Step 1: Write the failing test**

```ts
// src/features/pickups/lib/interpolate.test.ts
import { describe, it, expect } from "vitest";
import { lerp, interpolateLatLng } from "./interpolate";

describe("lerp", () => {
  it("returns endpoints at t=0 and t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });
  it("returns the midpoint at t=0.5", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe("interpolateLatLng", () => {
  const a = { lat: 23.0, lng: 72.0 };
  const b = { lat: 23.2, lng: 72.4 };
  it("interpolates both axes", () => {
    expect(interpolateLatLng(a, b, 0.5)).toEqual({ lat: 23.1, lng: 72.2 });
  });
  it("clamps t below 0 and above 1", () => {
    expect(interpolateLatLng(a, b, -1)).toEqual(a);
    expect(interpolateLatLng(a, b, 2)).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/lib/interpolate.test.ts`
Expected: FAIL — cannot find module `./interpolate`.

- [ ] **Step 3: Implement**

```ts
// src/features/pickups/lib/interpolate.ts
/** Pure tweening for the live marker — no jumps between 30s pings (TRK-02). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateLatLng(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  const c = Math.min(1, Math.max(0, t));
  return { lat: lerp(from.lat, to.lat, c), lng: lerp(from.lng, to.lng, c) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/lib/interpolate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/pickups/lib/interpolate.ts src/features/pickups/lib/interpolate.test.ts
git commit -m "feat(tracking): pure lat/lng interpolation helpers"
```

---

## Task 7: Smooth the live marker (rAF tween in `MapViewInner`)

**Files:**
- Modify: `src/features/pickups/components/MapViewInner.tsx`

**Interfaces:**
- Consumes: `interpolateLatLng` (Task 6).

- [ ] **Step 1: Replace the `LiveMarker` jump with a rAF tween**

In `src/features/pickups/components/MapViewInner.tsx`, add the import:
```ts
import { interpolateLatLng } from "@/features/pickups/lib/interpolate";
```

Replace the existing `LiveMarker` component body's effect (the one that does `ref.current.setLatLng(ll)` + `map.panTo`) with a tween from the previous position to the new one over ~1.2s. Full replacement of the component:

```tsx
function LiveMarker({
  pos,
  stale,
}: {
  pos: { lat: number; lng: number } | null;
  stale: boolean;
}) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const start = fromRef.current ?? pos; // first fix: no tween, snap into place
    const target = pos;
    const startTs = performance.now();
    const DURATION = 1200; // ms — smooth glide between 30s pings (TRK-02)

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / DURATION);
      const cur = interpolateLatLng(start, target, t);
      if (ref.current) ref.current.setLatLng([cur.lat, cur.lng]);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    map.panTo([target.lat, target.lng], { animate: true });
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Narrow deps to coords (a new `pos` object each render shouldn't restart the tween).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng, map]);

  if (!pos) return null;
  return (
    <Marker
      position={[pos.lat, pos.lng]}
      ref={(m) => {
        ref.current = m;
      }}
      opacity={stale ? 0.45 : 1}
    />
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/pickups/components/MapViewInner.tsx
git commit -m "feat(tracking): smooth rAF marker interpolation between pings"
```

(No unit test for the rAF loop — jsdom has no real animation frames and the math is already tested in Task 6. This is the kind of integration glue testing-practices says to leave to manual/E2E verification.)

---

## Task 8: Routing math (pure)

**Files:**
- Create: `src/lib/routing.ts`
- Test: `src/lib/routing.test.ts`

**Interfaces:**
- Produces: `LatLng` (`{ lat: number; lng: number }`); `haversineMeters(a: LatLng, b: LatLng): number`; `estimateEtaMinutes(meters: number, kmph?: number): number` (default 18 km/h urban rickshaw, min 1); `straightLineRoute(from: LatLng, to: LatLng): [number, number][]`; `movedEnough(from: LatLng | null, to: LatLng, thresholdM?: number): boolean` (default 200 m; `null` from → true).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/routing.test.ts
import { describe, it, expect } from "vitest";
import { haversineMeters, estimateEtaMinutes, straightLineRoute, movedEnough } from "./routing";

describe("haversineMeters", () => {
  it("is ~0 for identical points", () => {
    expect(haversineMeters({ lat: 23, lng: 72 }, { lat: 23, lng: 72 })).toBeCloseTo(0, 5);
  });
  it("matches a known short distance (~1.11km per 0.01° lat)", () => {
    const d = haversineMeters({ lat: 23.0, lng: 72.0 }, { lat: 23.01, lng: 72.0 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});

describe("estimateEtaMinutes", () => {
  it("estimates ~10 min for 3km at 18km/h", () => {
    expect(estimateEtaMinutes(3000, 18)).toBe(10);
  });
  it("never returns less than 1", () => {
    expect(estimateEtaMinutes(5)).toBe(1);
  });
});

describe("straightLineRoute", () => {
  it("returns the two endpoints as [lat,lng] pairs", () => {
    expect(straightLineRoute({ lat: 23, lng: 72 }, { lat: 24, lng: 73 })).toEqual([
      [23, 72],
      [24, 73],
    ]);
  });
});

describe("movedEnough", () => {
  it("is true when there is no previous fix", () => {
    expect(movedEnough(null, { lat: 23, lng: 72 })).toBe(true);
  });
  it("is false for a tiny move under the threshold", () => {
    expect(movedEnough({ lat: 23, lng: 72 }, { lat: 23.0001, lng: 72 })).toBe(false);
  });
  it("is true once the move exceeds ~200m", () => {
    expect(movedEnough({ lat: 23, lng: 72 }, { lat: 23.01, lng: 72 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/lib/routing.test.ts`
Expected: FAIL — cannot find module `./routing`.

- [ ] **Step 3: Implement**

```ts
// src/lib/routing.ts
/** Pure routing math for the watcher map's route line + ETA (bridge §5). */
export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutes to cover `meters` at `kmph` (default 18 — urban rickshaw). Floor of 1. */
export function estimateEtaMinutes(meters: number, kmph = 18): number {
  const minutes = Math.round(meters / 1000 / kmph * 60);
  return Math.max(1, minutes);
}

/** Fallback "route": the two endpoints, as Leaflet [lat,lng] pairs. */
export function straightLineRoute(from: LatLng, to: LatLng): [number, number][] {
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ];
}

/** Throttle gate: re-route only after the driver moved past the threshold. */
export function movedEnough(from: LatLng | null, to: LatLng, thresholdM = 200): boolean {
  if (!from) return true;
  return haversineMeters(from, to) >= thresholdM;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/lib/routing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/routing.ts src/lib/routing.test.ts
git commit -m "feat(tracking): pure routing math — haversine, ETA, straight-line, throttle"
```

---

## Task 9: OSRM route fetch + `getPickupRoute` action (with fallback)

**Files:**
- Create: `src/lib/routing.server.ts`
- Modify: `src/features/pickups/actions/pickupActions.ts`
- Test: `src/features/pickups/actions/getPickupRoute.test.ts`

**Decision (documented — lowest-risk free routing):** Use the **OSRM public demo server** (`router.project-osrm.org`, no key, no billing) for a real road polyline + duration, fetched **server-side** (no browser CORS, we control the timeout). On *any* failure (non-200, timeout, parse error, server down) fall back automatically to a **straight-line polyline + haversine/speed ETA** (Task 8) so tracking never breaks. The demo server has no SLA and a fair-use rate limit (~1 req/s) — fine for single-trip cadence (we throttle to one call per ~200 m of driver movement in Task 10). If the foundation later funds it, swap `fetchOsrmRoute` for a self-hosted OSRM or Mapbox/ORS free tier — the action's fallback contract is unchanged.

**Interfaces:**
- Consumes: `haversineMeters`, `estimateEtaMinutes`, `straightLineRoute`, `LatLng` (Task 8).
- Produces: `fetchOsrmRoute(from: LatLng, to: LatLng): Promise<{ coords: [number, number][]; durationSec: number } | null>`; `getPickupRoute(pickupId: string, fromLat: number, fromLng: number): Promise<Result<{ coords: [number, number][]; etaMinutes: number; source: "osrm" | "line" }>>`.

- [ ] **Step 1: Implement the OSRM fetch (server-only)**

```ts
// src/lib/routing.server.ts
import "server-only";
import type { LatLng } from "@/lib/routing";

const OSRM = "https://router.project-osrm.org/route/v1/driving";

/**
 * Real road route via the free OSRM demo server. Returns Leaflet-ordered
 * [lat,lng] coords + duration, or null on any failure (caller falls back to a
 * straight line). No key, no billing. 3.5s timeout so a slow demo server never
 * stalls the watcher map.
 */
export async function fetchOsrmRoute(
  from: LatLng,
  to: LatLng,
): Promise<{ coords: [number, number][]; durationSec: number } | null> {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{ duration: number; geometry: { coordinates: [number, number][] } }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    // OSRM/GeoJSON is [lng,lat]; Leaflet wants [lat,lng].
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    if (coords.length < 2) return null;
    return { coords, durationSec: route.duration };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write the failing test for the action**

```ts
// src/features/pickups/actions/getPickupRoute.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getSession: () => getSession(),
  requireRole: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

const getById = vi.fn();
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: { getById: (...a: unknown[]) => getById(...a) },
}));

const fetchOsrmRoute = vi.fn();
vi.mock("@/lib/routing.server", () => ({
  fetchOsrmRoute: (...a: unknown[]) => fetchOsrmRoute(...a),
}));

import { getPickupRoute } from "./pickupActions";

const PICKUP = { id: "p1", donorId: "d1", volunteerId: "v1", lat: 23.05, lng: 72.6 };

beforeEach(() => {
  getSession.mockReset();
  getById.mockReset();
  fetchOsrmRoute.mockReset();
  getById.mockResolvedValue(PICKUP);
});

describe("getPickupRoute", () => {
  it("rejects an unauthenticated caller", async () => {
    getSession.mockResolvedValue(null);
    expect((await getPickupRoute("p1", 23, 72)).ok).toBe(false);
  });

  it("forbids a user who is neither owner, assigned volunteer, nor admin", async () => {
    getSession.mockResolvedValue({ userId: "stranger", role: "volunteer" });
    expect((await getPickupRoute("p1", 23, 72)).ok).toBe(false);
  });

  it("returns the OSRM route when available", async () => {
    getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    fetchOsrmRoute.mockResolvedValue({
      coords: [[23, 72], [23.05, 72.6]],
      durationSec: 600,
    });
    const res = await getPickupRoute("p1", 23, 72);
    expect(res).toMatchObject({ ok: true, source: "osrm", etaMinutes: 10 });
    expect(res.ok && res.coords).toHaveLength(2);
  });

  it("falls back to a straight line + estimated ETA when OSRM fails", async () => {
    getSession.mockResolvedValue({ userId: "v1", role: "volunteer" }); // assigned driver
    fetchOsrmRoute.mockResolvedValue(null);
    const res = await getPickupRoute("p1", 23.0, 72.0);
    expect(res).toMatchObject({ ok: true, source: "line" });
    expect(res.ok && res.coords).toEqual([[23.0, 72.0], [23.05, 72.6]]);
    expect(res.ok && res.etaMinutes).toBeGreaterThanOrEqual(1);
  });

  it("rejects non-finite coordinates", async () => {
    getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    expect((await getPickupRoute("p1", NaN, 72)).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/actions/getPickupRoute.test.ts`
Expected: FAIL — `getPickupRoute` not exported.

- [ ] **Step 4: Implement the action**

In `src/features/pickups/actions/pickupActions.ts`, add imports:
```ts
import { haversineMeters, estimateEtaMinutes, straightLineRoute } from "@/lib/routing";
import { fetchOsrmRoute } from "@/lib/routing.server";
```

Add the action (place near `getLatestPing`):
```ts
/**
 * Watcher route + ETA (bridge §5). Driver's current pos comes from the client
 * (it already has it via the realtime/polling subscription); the destination is
 * read server-side from the pickup row (never trust a client-supplied dest).
 * OSRM road route when available, else a straight line + haversine ETA. Auth
 * mirrors getLatestPing: pickup owner, the assigned volunteer, or an admin.
 */
export async function getPickupRoute(
  pickupId: string,
  fromLat: number,
  fromLng: number,
): Promise<
  Result<{ coords: [number, number][]; etaMinutes: number; source: "osrm" | "line" }>
> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return fail("VALIDATION", "Invalid coordinates.");
  }
  const pickup = await pickupsRepo.getById(pickupId);
  if (!pickup) return fail("NOT_FOUND", "Pickup not found.");

  const allowed =
    pickup.donorId === session.userId ||
    pickup.volunteerId === session.userId ||
    session.role === "admin";
  if (!allowed) return fail("FORBIDDEN", "Not allowed to view this route.");

  const from = { lat: fromLat, lng: fromLng };
  const to = { lat: pickup.lat, lng: pickup.lng };

  const osrm = await fetchOsrmRoute(from, to);
  if (osrm) {
    return {
      ok: true,
      coords: osrm.coords,
      etaMinutes: Math.max(1, Math.round(osrm.durationSec / 60)),
      source: "osrm",
    };
  }
  return {
    ok: true,
    coords: straightLineRoute(from, to),
    etaMinutes: estimateEtaMinutes(haversineMeters(from, to)),
    source: "line",
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/actions/getPickupRoute.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 6: Typecheck + commit**

```bash
SKIP_ENV_VALIDATION=1 pnpm typecheck
git add src/lib/routing.server.ts src/features/pickups/actions/pickupActions.ts src/features/pickups/actions/getPickupRoute.test.ts
git commit -m "feat(tracking): getPickupRoute — OSRM road route with straight-line fallback"
```

---

## Task 10: `usePickupRoute` hook (throttled re-routing)

**Files:**
- Create: `src/features/pickups/hooks/usePickupRoute.ts`
- Test: `src/features/pickups/hooks/usePickupRoute.test.ts`

**Interfaces:**
- Consumes: `getPickupRoute` (Task 9); `movedEnough`, `LatLng` (Task 8).
- Produces: `usePickupRoute(opts: { pickupId: string; live: LatLng | null; active: boolean }): { route: [number, number][] | null; etaMinutes: number | null; source: "osrm" | "line" | null }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/pickups/hooks/usePickupRoute.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const getPickupRoute = vi.fn();
vi.mock("@/features/pickups/actions/pickupActions", () => ({
  getPickupRoute: (...a: unknown[]) => getPickupRoute(...a),
}));

import { usePickupRoute } from "./usePickupRoute";

beforeEach(() => {
  getPickupRoute.mockReset();
  getPickupRoute.mockResolvedValue({
    ok: true,
    coords: [[23, 72], [23.05, 72.6]],
    etaMinutes: 10,
    source: "osrm",
  });
});

describe("usePickupRoute", () => {
  it("does not fetch while inactive", () => {
    renderHook(() => usePickupRoute({ pickupId: "p1", live: { lat: 23, lng: 72 }, active: false }));
    expect(getPickupRoute).not.toHaveBeenCalled();
  });

  it("fetches a route for the first live fix and exposes ETA", async () => {
    const { result } = renderHook(() =>
      usePickupRoute({ pickupId: "p1", live: { lat: 23, lng: 72 }, active: true }),
    );
    await waitFor(() => expect(result.current.etaMinutes).toBe(10));
    expect(getPickupRoute).toHaveBeenCalledTimes(1);
    expect(result.current.source).toBe("osrm");
  });

  it("does NOT re-fetch for a sub-threshold move", async () => {
    const { result, rerender } = renderHook(
      ({ live }) => usePickupRoute({ pickupId: "p1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(getPickupRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.0001, lng: 72 } }); // ~11m — under 200m
    await new Promise((r) => setTimeout(r, 0));
    expect(getPickupRoute).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the driver moves past the threshold", async () => {
    const { rerender } = renderHook(
      ({ live }) => usePickupRoute({ pickupId: "p1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(getPickupRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.01, lng: 72 } }); // ~1.1km — over 200m
    await waitFor(() => expect(getPickupRoute).toHaveBeenCalledTimes(2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/hooks/usePickupRoute.test.ts`
Expected: FAIL — cannot find module `./usePickupRoute`.

- [ ] **Step 3: Implement**

```ts
// src/features/pickups/hooks/usePickupRoute.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { getPickupRoute } from "@/features/pickups/actions/pickupActions";
import { movedEnough, type LatLng } from "@/lib/routing";

/**
 * Watcher route + ETA (bridge §5). Calls getPickupRoute when the driver first
 * appears and again only after they move past the re-route threshold (~200m),
 * so we never hammer the OSRM demo server. Tears down on inactive.
 */
export function usePickupRoute(opts: {
  pickupId: string;
  live: LatLng | null;
  active: boolean;
}): {
  route: [number, number][] | null;
  etaMinutes: number | null;
  source: "osrm" | "line" | null;
} {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [source, setSource] = useState<"osrm" | "line" | null>(null);
  const lastRoutedFrom = useRef<LatLng | null>(null);

  const liveLat = opts.live?.lat;
  const liveLng = opts.live?.lng;

  useEffect(() => {
    if (!opts.active) {
      setRoute(null);
      setEtaMinutes(null);
      setSource(null);
      lastRoutedFrom.current = null;
      return;
    }
    if (liveLat === undefined || liveLng === undefined) return;
    const here: LatLng = { lat: liveLat, lng: liveLng };
    if (!movedEnough(lastRoutedFrom.current, here)) return; // throttle
    lastRoutedFrom.current = here;

    let cancelled = false;
    void (async () => {
      const res = await getPickupRoute(opts.pickupId, here.lat, here.lng);
      if (cancelled || !res.ok) return;
      setRoute(res.coords);
      setEtaMinutes(res.etaMinutes);
      setSource(res.source);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.active, opts.pickupId, liveLat, liveLng]);

  return { route, etaMinutes, source };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `SKIP_ENV_VALIDATION=1 pnpm test:run -- src/features/pickups/hooks/usePickupRoute.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/features/pickups/hooks/usePickupRoute.ts src/features/pickups/hooks/usePickupRoute.test.ts
git commit -m "feat(tracking): usePickupRoute hook with movement-throttled re-routing"
```

---

## Task 11: Render the route line + ETA on the watcher map

**Files:**
- Modify: `src/features/pickups/components/MapViewInner.tsx` (add `route` prop → `<Polyline>`)
- Modify: `src/features/pickups/components/LiveTrackingMap.tsx` (wire `usePickupRoute`, ETA card)
- Modify: `messages/<locale>/portal.json` (en/gu/hi) — ETA strings

**Interfaces:**
- Consumes: `usePickupRoute` (Task 10).

- [ ] **Step 1: Add i18n strings**

Under `pickup.detail` in each locale's `portal.json`:
- en: `"etaAway": "~{minutes} min away"`, `"etaEstimate": "estimate"`
- gu: `"etaAway": "~{minutes} મિનિટ દૂર"`, `"etaEstimate": "અંદાજ"`
- hi: `"etaAway": "~{minutes} मिनट दूर"`, `"etaEstimate": "अनुमान"`

- [ ] **Step 2: Add the `route` prop + `<Polyline>` to `MapViewInner`**

In `src/features/pickups/components/MapViewInner.tsx`:

1. Add `Polyline` to the react-leaflet import:
```ts
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
```

2. Add `route` to the prop type (after `destination`):
```ts
  /** Live mode: the road/straight route from the volunteer to the destination. */
  route?: [number, number][] | null;
```

3. Add the param to the destructure (default `null`):
```ts
  destination = null,
  route = null,
```

4. Render the polyline in the non-draggable branch, just before `<LiveMarker … />`:
```tsx
            {route && route.length > 1 && (
              <Polyline
                positions={route}
                pathOptions={{ color: "#C04E12", weight: 4, opacity: 0.7 }}
              />
            )}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} />
            )}
            <LiveMarker pos={live} stale={liveStale} />
```
(`#C04E12` = the saffron `primary` brand token; Leaflet `pathOptions` takes a raw color string, not a CSS var.)

- [ ] **Step 3: Wire the route + ETA into `LiveTrackingMap`**

Replace `src/features/pickups/components/LiveTrackingMap.tsx` with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { MapView } from "./MapView";
import { useLivePickupLocation } from "@/features/pickups/hooks/useLivePickupLocation";
import { usePickupRoute } from "@/features/pickups/hooks/usePickupRoute";

/**
 * Donor/admin live view (TRK-02/03). Subscribes via useLivePickupLocation
 * (realtime + 10s polling fallback), renders the interpolated volunteer marker,
 * a route line + ETA (usePickupRoute), and a freshness badge.
 */
export function LiveTrackingMap({
  pickupId,
  active,
  destination,
}: {
  pickupId: string;
  active: boolean;
  destination: { lat: number; lng: number };
}) {
  const t = useTranslations("portal");
  const { position, stale, lastSeen, connection } = useLivePickupLocation({
    pickupId,
    active,
  });
  const live = position ? { lat: position.lat, lng: position.lng } : null;
  const { route, etaMinutes, source } = usePickupRoute({ pickupId, live, active });

  return (
    <div className="space-y-2">
      <MapView
        markers={[]}
        destination={destination}
        live={live}
        liveStale={stale}
        route={route}
        height={280}
      />
      {etaMinutes != null && !stale && (
        <div className="flex items-center justify-between rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
          <span>{t("pickup.detail.etaAway", { minutes: etaMinutes })}</span>
          {source === "line" && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("pickup.detail.etaEstimate")}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          {!stale && position ? (
            <span
              className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright"
              aria-hidden
            />
          ) : (
            <span
              className="inline-block size-2 rounded-full bg-muted-foreground/50"
              aria-hidden
            />
          )}
          <span className={stale ? "text-muted-foreground" : "text-leaf"}>
            {position
              ? stale
                ? "Location may be outdated"
                : "Live"
              : "Waiting for location…"}
          </span>
        </span>
        {lastSeen && <span className="text-muted-foreground">updated {lastSeen}</span>}
        {connection === "polling" && (
          <span className="text-muted-foreground">reconnecting…</span>
        )}
      </div>
    </div>
  );
}
```

(Note: `bg-leaf/10` uses a Tailwind opacity modifier on the `leaf` token — confirm `leaf`/`leaf-bright` resolve to HSL so the `/10` works; per CLAUDE.md the color-token HSL decision was made in Phase 1, and `bg-leaf-bright` is already used in this file, so the token exists. If the opacity modifier doesn't render, fall back to a static `bg-leaf/[0.1]`-equivalent utility already used elsewhere, or `border border-leaf/30`.)

- [ ] **Step 4: Typecheck + lint**

Run: `SKIP_ENV_VALIDATION=1 pnpm typecheck && pnpm lint`
Expected: 0 errors. (`MapView`'s props type is `ComponentProps<typeof MapViewInner>`, so the new `route` prop flows through automatically.)

- [ ] **Step 5: Commit**

```bash
git add src/features/pickups/components/MapViewInner.tsx src/features/pickups/components/LiveTrackingMap.tsx messages/
git commit -m "feat(tracking): route polyline + ETA card on the watcher map"
```

---

## Task 12: Full validation + stacked PR

**Files:** none (verification + delivery)

- [ ] **Step 1: Full local validation**

```bash
SKIP_ENV_VALIDATION=1 pnpm typecheck
pnpm lint
SKIP_ENV_VALIDATION=1 pnpm test:run
```
Expected: typecheck 0 errors; lint 0 errors (1 pre-existing font warning OK); all tests green (existing suite + the new maps-link / resolvePickupLocation / pickup-validation / interpolate / routing / getPickupRoute / NavigateButton / usePickupRoute tests).

- [ ] **Step 2: Catalog parity**

If the i18n catalog-parity test flags a missing GU/HI key, add it. Re-run `SKIP_ENV_VALIDATION=1 pnpm test:run` until green.

- [ ] **Step 3: Push the branch + open the PR (do not merge)**

```bash
git push -u origin feature/maps-tracking
gh pr create --base main --head feature/maps-tracking \
  --title "feat: maps (link/address → pin) + driver Navigate + tracking precision (route+ETA)" \
  --body "$(cat <<'EOF'
## What
Bridge §4 (maps) + §5 (tracking), model-agnostic, free tiers only.

1. **Location capture** — pickup location from a Google Maps link OR an address: parse coords from the URL (incl. resolving `maps.app.goo.gl` short links server-side), or Nominatim-geocode an address → confirm with the draggable pin → store lat/lng + the original link.
2. **Driver Navigate** — one-tap `dir/?api=1` deep-link into Google Maps from the pickup detail (zero API cost).
3. **Tracking precision** — smooth rAF marker interpolation (no jumps between 30s pings), a route polyline + ETA on the watcher map via OSRM public demo with automatic straight-line/haversine fallback.

## Tests
Pure modules fully unit-tested (URL parser, interpolation, routing math); action branching + the route hook tested with mocks. typecheck + lint + test green.

## Notes
- Build is Linux-only (opennext) — CI deploys on merge.
- OSRM demo server has no SLA; fallback keeps tracking working if it's down.
- Background GPS still needs a native app (web/PWA is foreground-only) — unchanged.
EOF
)"
```

Do **not** merge — merging to `main` triggers the auto-deploy; leave that to the user. Report the PR URL.

---

## Self-Review

**Spec coverage** (against the 3 scoped pieces + BRIDGE-PLAN §4/§5):
- Piece 1 (link OR address → resolve → confirm-pin → store + original link): Task 1 (parse), Task 2 (resolve incl. short-link redirect-follow + Nominatim), Task 3 (persist link + migration), Task 4 (form wiring; existing draggable pin reused). ✓
- Piece 2 (driver Navigate deep-link): Task 1 (`googleMapsDirectionsUrl`), Task 5 (button + placement). ✓
- Piece 3 (high-accuracy GPS + interpolation + route + ETA): high-accuracy `watchPosition` already `enableHighAccuracy: true` in `useLiveLocation` (no change needed — noted); interpolation Tasks 6–7; route+ETA Tasks 8–11. ✓
- Reuse mandate (geocoding.ts, supabase/browser, useLivePickupLocation, Leaflet pin, pickups schema): all extended, none reimplemented. ✓
- Free-tier / Linux-build / no-Co-Authored-By / IDOR-recheck constraints: in Global Constraints + Task 9 decision + Task 12. ✓

**Placeholder scan:** No TBD/"add error handling"/"similar to Task N"/"write tests for the above". Every code step has complete code; every test step has runnable assertions. ✓

**Type consistency:** `Result<T>` matches the existing union in `pickupActions.ts`. `LatLng` defined in Task 8, consumed identically in Tasks 9–10. `route: [number, number][] | null` consistent across Task 9 (action), Task 10 (hook), Task 11 (`MapViewInner` prop + `LiveTrackingMap`). `googleMapsUrl` consistent across schema (Task 3), validation (Task 3), action (Task 2 returns it, Task 3 persists it), form (Task 4). `source: "osrm" | "line"` consistent Task 9↔10↔11. `parseLatLngFromGoogleMapsUrl`/`isGoogleMapsUrl`/`isShortGoogleMapsUrl`/`googleMapsDirectionsUrl` names identical across Tasks 1, 2, 5. ✓

**Open decisions made (documented, not blocking):** ETA/route source = OSRM demo + haversine fallback (Task 9 decision block); re-route throttle = 200 m (Task 8/10); tween duration = 1200 ms (Task 7); rickshaw speed = 18 km/h (Task 8); original (not expanded) link is stored (Task 2). All reversible config-level choices.

**Known integration gaps left to manual/E2E (per testing-practices — not unit-testable in jsdom):** the rAF tween visual smoothness (Task 7), the live Leaflet `<Polyline>` render, and real OSRM connectivity. Verify these post-deploy on the live Worker with an active pickup (or local `pnpm dev`).
