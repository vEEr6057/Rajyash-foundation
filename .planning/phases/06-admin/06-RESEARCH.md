# Phase 6: Admin Portal + Reporting - Research

**Researched:** 2026-06-26
**Domain:** Admin RBAC (Clerk Backend SDK on Cloudflare Workers), Drizzle dynamic queries + aggregates, CSV export on App Router/Workers, soft-deactivate, partner CRUD
**Confidence:** HIGH (all external APIs verified against current Clerk/Drizzle/Next/OWASP docs + existing codebase patterns)

## Summary

Phase 6 is almost entirely an *application* of patterns already proven in Phases 2–4 — the same repo → server-action (`requireRole` first line) → `revalidatePath` shape, the same atomic conditional `UPDATE … RETURNING` claim, the same Inngest after-commit emit, the same Drizzle+`postgres`-role (RLS-bypass) + MCP-applied deny-anon RLS migration. The only genuinely *new* surface is the **Clerk Backend SDK write path** (`await clerkClient()` → `users.updateUserMetadata` / `users.banUser`) and a **CSV route handler**. Both are runtime-confirmed safe on the opennext/Workers (V8-isolate, fetch-based) runtime: `@clerk/nextjs/server` wraps `@clerk/backend`, which is the canonical SDK for Workers, and a Route Handler returning a native `Response(string, …)` needs no Node `Buffer` and no `edge` export (opennext runs the Next.js *Node.js* runtime).

Two correctness landmines dominate the security story. (1) **Session-claim lag**: changing a user's role in Clerk does NOT refresh that user's *current* session — `sessionClaims.metadata.role` only updates on the next token refresh (~60s sliding, or next sign-in). So a role change is eventually-consistent for the *target* user; for an *admin demoting themselves* it would leave them admin until refresh — exactly why the self-demote/self-deactivate guard is load-bearing, not cosmetic. The clean answer for **deactivate** is to *also* `banUser` (revokes all sessions immediately) on top of the soft `deactivatedAt` flag — defense in depth that closes the lag window. (2) **CSV formula injection**: the OWASP guidance is that escaping quotes/commas/newlines (RFC 4180) is *necessary but not sufficient* — any cell whose value starts with `= + - @` (or tab/CR) must additionally be neutralized, and you must do it *after* accounting for the separator/quote so an attacker can't break out of a cell.

**Primary recommendation:** Build a new `src/features/admin/**` module + an `adminRepo` (or extend `pickupsRepo`/`profilesRepo`) using the existing conventions verbatim. For role change: `updateUserMetadata` (Clerk = source of truth for the claim) **then** mirror to `profiles.role`. For deactivate: set `profiles.deactivatedAt`, block in `getSession`, **and** `banUser` for immediate session kill. Guard self-demote/self-deactivate in the action. CSV via a `/admin/pickups/export` Route Handler with a hardened escape helper + `requireRole(["admin"])` re-check.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** All admin pages under `src/app/admin/**` (route group already middleware-403-gated). **Every admin server action re-checks `requireRole(["admin"])`** (no reliance on middleware; AUTH-05). Pages are thin server components, feature-module-backed.
- **D-02:** Pages: `/admin/dashboard` (overview + links), `/admin/pickups` (ADM-01/02), `/admin/users` (ADM-03), `/admin/partners` (ADM-04), `/admin/reports` (ADM-05/06).
- **D-03 (ADM-01):** Admin pickups list shows ALL pickups (not owner-scoped) with filters: status, date range (created/window), donor, volunteer. Server-side filtering via `pickupsRepo.listForAdmin(filters)`. Reuse `PickupStatusPill`, `PickupCard`-style rows.
- **D-04 (ADM-02):** Admin can assign a `requested` pickup to a chosen volunteer: set `volunteer_id`, `status='accepted'`, `claimed_at`, record a `status_events` row (actor = admin), and **emit `pickup/claimed`** (Phase 4 → donor notified). Atomic conditional UPDATE (only if still `requested`). New action `assignPickup(pickupId, volunteerId)`.
- **D-05 (ADM-03):** Admin user list = all `profiles`. **Change role**: update Clerk `publicMetadata.role` via the Backend SDK AND mirror to `profiles.role` (Clerk is source of truth for the session claim). **Deactivate = soft**: set `profiles.deactivatedAt` (new column) + block in `getSession`/middleware. Reversible. No hard delete. **An admin cannot deactivate/demote themselves (guard).**
- **D-06 (ADM-04):** New `partners` entity (CRUD): `id, name, type, contactName, contactPhone, contactEmail, address, city, createdAt, updatedAt`; `type` ∈ {restaurant, hall, event_planner, family, other}. AND link donor users to a partner: add `profiles.partnerId` (nullable FK → partners.id). (`pickups.partnerId` deferred — report attributes via the donor's partner.)
- **D-07 (ADM-05):** Sum **delivered** pickups in a date range (by `delivered_at`): **total servings** (Σ quantity where unit=servings) + **total kg** (Σ quantity where unit=kg), shown **separately** (no lossy conversion — user-locked), plus delivery count. Repo aggregate `pickupsRepo.impactReport(from, to)`.
- **D-08 (ADM-06):** Export the **filtered pickups list** as CSV via a route handler `/admin/pickups/export` (or a server action returning a CSV string) → `text/csv` + `Content-Disposition: attachment`. Build the CSV server-side (no Node-only lib — Workers; simple escaped join). Also show impact summary numbers on the reports page.

### Claude's Discretion
- Whether `adminRepo` is new or methods are added to `pickupsRepo`/`profilesRepo` (recommend: extend existing repos for pickup/profile ops, new `partnersRepo` for the new table).
- Server-component lists vs TanStack-Query client lists per screen ("where a client list needs interactivity, else server").
- Whether to *also* Clerk-`banUser` on deactivate (this research recommends **yes** — see §A.3).
- Admin screens functional + token-styled (not fancy); desktop-first, mobile-OK.

### Deferred Ideas (OUT OF SCOPE)
- Donation/revenue reporting (with Phase 5 — PARKED). `pickups.partnerId` auto-link. Audit-log UI, bulk actions, partner self-service, CSV of the impact aggregate (numbers shown on-page instead). Public site + i18n (Phase 7).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | View + filter all pickups | §C (Drizzle dynamic `where`); reuse existing `pickups_status/donor/volunteer` indexes |
| ADM-02 | Manually assign a requested pickup to a volunteer | §E (atomic conditional UPDATE mirroring `claimIfAvailable` + status_events + `pickup/claimed` emit) |
| ADM-03 | Manage users (change role, deactivate) | §A (Clerk `updateUserMetadata` + mirror; soft `deactivatedAt` + `banUser`; self-guard) |
| ADM-04 | Partner orgs CRUD + link donors | §D (`partners` table + `partner_type` enum + `profiles.partnerId` FK) |
| ADM-05 | Impact report (servings + kg + count, date range) | §C (Drizzle `sql` aggregate with `FILTER (WHERE …)`) |
| ADM-06 | CSV export of filtered pickups | §B (Route Handler + hardened CSV escape/formula-injection guard) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin auth gate | Frontend Server (middleware) | API (server action `requireRole`) | Middleware is defense-in-depth only (CVE-2025-29927); the action re-check is the real boundary (AUTH-05) |
| Role change (Clerk metadata write) | API (server action → Clerk Backend SDK) | — | Clerk is source of truth for the session claim; written server-side only with the secret key |
| Role/partner/deactivate mirror | Database (Drizzle/`postgres` role) | — | App DB row mirrors Clerk + holds NGO-local state (`deactivatedAt`, `partnerId`) |
| Pickup list/filter/aggregate | Database (Drizzle query) | API (server component/action) | Server-side filtering + SQL aggregate; never ship all rows to the client |
| Admin-assign | API (server action) → Database (atomic UPDATE) | Inngest (emit) | Concurrency-safe claim + after-commit notification fan-out |
| CSV export | API (Route Handler on Worker) | Database (filtered query) | Native `Response` stream; built + escaped server-side |
| Deactivated-user enforcement | API (`getSession`) + Frontend Server (middleware) | Clerk (`banUser` revokes sessions) | App-layer block is immediate per-request; `banUser` closes the session-claim window |

## Standard Stack

### Core
| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| `@clerk/nextjs` | 7.5.8 (installed) | `clerkClient()` Backend SDK (role write, ban), `auth()` | Already the project auth provider; v7 wraps `@clerk/backend` |
| `@clerk/backend` (transitive) | bundled w/ `@clerk/nextjs` 7 | The actual BAPI client | **Canonical SDK for Cloudflare Workers** — V8-isolate/fetch-native `[VERIFIED: clerk.com SDK docs]` |
| `drizzle-orm` | 0.45.2 (installed) | dynamic `where`, `sql` aggregates, atomic UPDATE | Already the ORM; `and()`/`sql` cover every Phase-6 query |
| `postgres` (postgres-js) | 3.4.9 (installed) | DB driver (postgres role → bypasses RLS) | Established in `client.ts` |
| `react-hook-form` + `@hookform/resolvers` + `zod` | 7.80 / 5.4 / 4.4.3 (installed) | Partner CRUD form + validation | Project form standard (`PickupForm.tsx`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.101.1 (installed) | Client lists needing interactivity (filter-as-you-type) | Only where a screen needs client interactivity (D-03 reuse note); else server component |
| `inngest` | 4.11.0 (installed) | `inngest.send("pickup/claimed")` on admin-assign | Mirror Phase 4 emit in `assignPickup` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardened hand-rolled CSV join | `papaparse` / `csv-stringify` | **Don't** — adds a dep for a ~15-line escape; D-08 says no lib. Verify the chosen lib is Workers-safe if ever reconsidered (most are; not needed here) |
| Soft deactivate only | Clerk `banUser` only | `banUser` alone loses the reversible NGO-local audit (`deactivatedAt`); soft alone leaves the session-lag window — **use both** (§A.3) |
| New `adminRepo` | extend `pickupsRepo`/`profilesRepo` + new `partnersRepo` | Extending keeps related queries co-located (recommended); a single `adminRepo` fragments pickup/profile logic |

**Installation:** None required — every dependency is already installed (verified `package.json`).

## Architecture Patterns

### System Architecture Diagram

```
Admin (laptop) ──▶ /admin/* page (server component, thin)
                        │  reads via repo (server-side filter/aggregate)
                        ▼
        ┌──────────────────────────────────────────────┐
        │  Server Action (requireRole(["admin"]) FIRST) │  ◀── AUTH-05 boundary
        └──────────────────────────────────────────────┘
            │                 │                     │
   ┌────────┘        ┌────────┘            ┌────────┘
   ▼                 ▼                     ▼
 Clerk Backend    Drizzle (postgres     Inngest.send
 SDK (BAPI fetch) role → bypass RLS)    ("pickup/claimed")
   │  role write     │  UPDATE/SELECT       │  (admin-assign only)
   │  / banUser      │  + status_events     ▼
   ▼                 ▼                  Phase-4 fan-out → donor notified
 publicMetadata   partners / profiles
 (claim source)   / pickups (mirror + NGO-local state)

CSV path:  GET /admin/pickups/export (Route Handler, Worker)
           requireRole(["admin"]) ▶ pickupsRepo.listForAdmin(filters)
           ▶ toCsv() [RFC4180 escape + formula-injection guard]
           ▶ new Response(csv, {text/csv, Content-Disposition: attachment})

Deactivation enforcement:
  getSession() ─reads profiles.deactivatedAt─▶ if set ▶ treat as signed-out / 403
  + banUser() revokes Clerk sessions immediately (closes claim-lag window)
```

### Recommended Project Structure
```
src/
├── app/admin/
│   ├── dashboard/page.tsx          # overview + links
│   ├── pickups/page.tsx            # ADM-01 list+filter, ADM-02 assign
│   ├── pickups/export/route.ts     # ADM-06 CSV Route Handler
│   ├── users/page.tsx              # ADM-03
│   ├── partners/page.tsx           # ADM-04
│   └── reports/page.tsx            # ADM-05 (+ impact numbers)
├── features/admin/
│   ├── actions/adminActions.ts     # assignPickup, setUserRole, deactivateUser,
│   │                               #   reactivateUser, partner CRUD, setUserPartner
│   ├── components/                 # AdminPickupFilters, UserRow, PartnerForm, ImpactReport, …
│   ├── validations/                # partnerSchema, filtersSchema (Zod)
│   ├── lib/csv.ts                  # toCsv + csvCell escape (unit-tested)
│   └── index.ts                    # barrel
└── server/db/repositories/
    ├── pickups.ts                  # + listForAdmin(filters), assignToVolunteer, impactReport
    ├── profiles.ts                 # + listAll, setRole, deactivate, reactivate, setPartner
    └── partners.ts                 # NEW: create/getById/list/update/delete
```

### Pattern 1: Clerk role write — async client, then mirror
**What:** v6+ made `clerkClient` async; you MUST `await clerkClient()` before `.users.*`.
**When to use:** ADM-03 change role.
```typescript
// Source: https://clerk.com/docs/references/backend/overview  +  .../user/update-user-metadata (2026-06)
import { clerkClient } from "@clerk/nextjs/server";

const client = await clerkClient();              // v7: async — MUST await
await client.users.updateUserMetadata(userId, {  // deep-merge; null removes a key
  publicMetadata: { role },                       // source of truth for sessionClaims.metadata.role
});
await profilesRepo.setRole(userId, role);         // mirror to the app DB
```
> Note: the *target user's* existing session claim does NOT refresh until their next token refresh (~60s sliding / next sign-in). Middleware + `getSession` keep reading the stale role until then. Eventually-consistent by design.

### Pattern 2: Soft-deactivate + session kill (defense in depth)
**What:** Set NGO-local `deactivatedAt`, block in `getSession`, and `banUser` to revoke sessions now.
**When to use:** ADM-03 deactivate.
```typescript
// Source: https://clerk.com/docs/reference/backend/user/ban-user (banUser revokes ALL sessions) (2026-06)
await profilesRepo.deactivate(targetUserId);     // reversible NGO-local flag (set deactivatedAt = now())
const client = await clerkClient();
await client.users.banUser(targetUserId);        // immediate: revokes sessions, blocks re-sign-in
// reactivate = profilesRepo.reactivate(id) (clear deactivatedAt) + client.users.unbanUser(id)
```
Then enforce in `getSession` (immediate, per-request — doesn't wait on Clerk):
```typescript
// src/server/auth/session.ts — add deactivated block
export async function getSession(): Promise<SessionInfo | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const profile = await profilesRepo.getById(userId);   // already cached per-request via getDb()
  if (profile?.deactivatedAt) return null;               // deactivated → treated as signed-out
  return { userId, role: sessionClaims?.metadata?.role,
           onboardingComplete: sessionClaims?.metadata?.onboardingComplete ?? false };
}
```
> Trade-off: this adds one `profiles` read per `getSession()`. Acceptable (single-tenant, indexed PK lookup, per-request `cache()`d connection). If ever hot, gate it behind a claim. `requireRole`/`requireUser` inherit the block for free (they call `getSession`).

### Pattern 3: Admin-assign — atomic conditional UPDATE mirroring `claimIfAvailable`
**What:** Same optimistic guard as the volunteer claim, but set a chosen volunteerId.
**When to use:** ADM-02.
```typescript
// Repo (pickups.ts) — mirrors claimIfAvailable; only succeeds while still 'requested'
async assignToVolunteer(id: string, volunteerId: string): Promise<Pickup | null> {
  const db = getDb();
  const rows = await db.update(pickups)
    .set({ status: "accepted", volunteerId, claimedAt: sql`now()`, updatedAt: new Date() })
    .where(and(eq(pickups.id, id), eq(pickups.status, "requested")))
    .returning();
  return rows[0] ?? null;   // zero rows = already claimed/assigned/cancelled
}
```

### Pattern 4: Drizzle dynamic `where` (and() ignores undefined)
**What:** `and()` natively drops `undefined` args — no `.filter(Boolean)` needed.
```typescript
// Source: https://orm.drizzle.team/docs/guides/conditional-filters-in-query (2026-06)
async listForAdmin(f: AdminPickupFilters): Promise<Pickup[]> {
  const db = getDb();
  return db.select().from(pickups).where(and(
    f.status     ? eq(pickups.status, f.status)               : undefined,
    f.donorId    ? eq(pickups.donorId, f.donorId)             : undefined,
    f.volunteerId? eq(pickups.volunteerId, f.volunteerId)     : undefined,
    f.from       ? gte(pickups.createdAt, f.from)             : undefined,
    f.to         ? lte(pickups.createdAt, f.to)               : undefined,
  )).orderBy(desc(pickups.createdAt));
}
```

### Pattern 5: Impact aggregate — `sql` with `FILTER (WHERE …)`
**What:** Postgres `SUM(...) FILTER (WHERE ...)` split by unit; `.mapWith(Number)` (postgres-js returns numeric as string).
```typescript
// Source: https://orm.drizzle.team/docs/sql (sql<number> + .mapWith(Number); COUNT/SUM FILTER) (2026-06)
async impactReport(from: Date, to: Date) {
  const db = getDb();
  const [row] = await db.select({
    servings: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'servings'), 0)`.mapWith(Number),
    kg:       sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'kg'), 0)`.mapWith(Number),
    count:    sql<number>`count(*)`.mapWith(Number),
  }).from(pickups).where(and(
    eq(pickups.status, "delivered"),
    gte(pickups.deliveredAt, from),
    lte(pickups.deliveredAt, to),
  ));
  return row;  // { servings, kg, count }
}
```

### Pattern 6: CSV Route Handler on Workers (native Response, no Buffer)
**What:** Plain string body + headers; opennext = Node.js runtime, no `edge` export needed.
```typescript
// src/app/admin/pickups/export/route.ts
// Source: opennext.js.org/cloudflare (Node.js runtime, native Response) + Next.js Route Handlers (2026-06)
import { requireRole, AuthError } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { toCsv } from "@/features/admin/lib/csv";

export async function GET(req: Request) {
  try { await requireRole(["admin"]); }            // defense in depth (route is under /admin too)
  catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
  const f = parseFilters(new URL(req.url).searchParams);  // reuse the Zod filters schema
  const rows = await pickupsRepo.listForAdmin(f);
  const csv = toCsv(
    ["id","status","category","quantity","unit","donorId","volunteerId","createdAt","deliveredAt"],
    rows.map(r => [r.id, r.status, r.category, r.quantity, r.quantityUnit, r.donorId,
                   r.volunteerId ?? "", r.createdAt.toISOString(), r.deliveredAt?.toISOString() ?? ""]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pickups-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

### Anti-Patterns to Avoid
- **Calling `clerkClient` without await** — v7 made it async; `clerkClient.users.…` (no parens/await) is a v5 pattern and will throw/typecheck-fail.
- **Trusting middleware as the security boundary** — admin actions/route MUST re-`requireRole` (AUTH-05; CVE-2025-29927).
- **Mirroring role to `profiles` but skipping Clerk** — the session claim reads from Clerk; DB-only change leaves RBAC stale forever.
- **CSV escape that only checks "doesn't start with `=`"** — insufficient (OWASP); must also handle separators/quotes so an attacker can't open a new cell then inject (§F).
- **Returning all pickups to a client component then filtering in JS** — filter/aggregate in SQL; the indexes already exist.
- **Soft-deactivate without revoking sessions** — leaves the user fully active until token refresh; pair with `banUser`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency-safe assign | Read-then-write `getById` + `update` | Atomic `UPDATE … WHERE status='requested' RETURNING` | Two admins/an admin+volunteer racing → double-assign; the conditional UPDATE is the existing proven guard |
| Optional-filter SQL | String-concatenated WHERE | Drizzle `and(...conds)` (drops undefined) | Injection-safe, type-safe, native undefined handling |
| Servings/kg totals | Fetch rows + JS reduce | Postgres `SUM() FILTER (WHERE)` | One round-trip, DB-side, no row transfer |
| Notify donor on assign | New email/push code | Existing `inngest.send("pickup/claimed")` | Phase-4 fan-out already handles recipient resolution + dedup |
| Immediate de-auth | Custom token blocklist | Clerk `banUser` | Built-in session revocation; no infra to maintain |
| CSV bytes on Workers | Node `Buffer.from(...)` | `new Response(string, …)` | Workers has no Node Buffer at the edge for this; Web `Response` takes a string directly |

**Key insight:** Phase 6 has almost no novel infrastructure — its risk is *forgetting to reuse* (re-implementing claim/assign without the atomic guard, re-implementing notify instead of emitting, trusting middleware). The two new things (Clerk write, CSV) are both thin and both have a single sharp edge each (async client; formula injection).

## Common Pitfalls

### Pitfall 1: Session-claim lag after role change
**What goes wrong:** Admin changes a user's role; the user (or the admin themselves) keeps the old permissions for up to ~60s (sliding session) or until next sign-in.
**Why it happens:** `sessionClaims.metadata.role` is baked into the JWT; Clerk only re-issues it on token refresh. `updateUserMetadata` updates the *user object*, not the *live token*. `[VERIFIED: clerk.com v6 upgrade — auth()/clerkClient async + claims refresh on token refresh]`
**How to avoid:** Accept eventual consistency for *other* users. For the **self-demote/self-deactivate** case, *block it in the action* (you can't safely demote yourself anyway). For deactivate, `banUser` forces immediate revocation. Optionally surface "change applies on their next sign-in" in the UI copy.
**Warning signs:** "I changed their role but they can still access X" reports right after a change.

### Pitfall 2: Admin self-lockout (self-demote / self-deactivate)
**What goes wrong:** The only admin demotes or deactivates themselves → no one can administer the app.
**Why it happens:** No guard in the action.
**How to avoid:** First lines of `setUserRole`/`deactivateUser`: `const { userId } = await requireRole(["admin"]); if (userId === targetUserId) return fail("FORBIDDEN", "You can't change your own admin access.");` (D-05 mandates this).
**Warning signs:** N/A — prevent, don't detect.

### Pitfall 3: CSV formula injection
**What goes wrong:** A donor names themselves `=cmd|'/c calc'!A1`; staff opens the export in Excel → formula executes.
**Why it happens:** Cells starting with `= + - @` (and tab/CR) are treated as formulas; RFC-4180 quote-escaping alone doesn't neutralize them. `[CITED: owasp.org/www-community/attacks/CSV_Injection]`
**How to avoid:** In `csvCell` (§F): (1) if the value starts with `= + - @ \t \r`, prefix a single quote `'`; (2) THEN if it contains `" , \n \r`, wrap in double quotes and double any internal `"`. Order matters — neutralize the formula char, then escape for the container. Unit-test both.
**Warning signs:** Any user-controlled string column in an export (here: `category`/`description` if added, donor/volunteer names if joined).

### Pitfall 4: Forgetting the `requireRole` re-check in the Route Handler
**What goes wrong:** Treating the `/admin` middleware gate as sufficient; an auth bypass (CVE-2025-29927-class) then exposes the CSV.
**Why it happens:** "It's already under /admin."
**How to avoid:** The Route Handler re-checks `requireRole(["admin"])` exactly like every server action (AUTH-05; already the project rule). Same for the impact report if exposed via a route.
**Warning signs:** Code-review: any `/admin/**/route.ts` without a `requireRole` first line.

### Pitfall 5: New tables readable via the anon key
**What goes wrong:** `partners` (contact emails/phones) readable through PostgREST/the public anon key.
**Why it happens:** Forgetting to enable RLS-with-no-anon-policy on the new table (Drizzle migrations don't emit RLS; it's applied via MCP).
**How to avoid:** After the Drizzle migration creates `partners`, apply (via Supabase MCP) `ALTER TABLE partners ENABLE ROW LEVEL SECURITY;` with **no** anon policy (deny-by-default), mirroring `location_pings`/notifications tables. `profiles` already exists/RLS-handled; the two new *columns* inherit its policy. `[VERIFIED: 03/04-SUMMARY RLS pattern + client.ts postgres role bypasses RLS]`
**Warning signs:** Supabase advisor "RLS disabled on public table".

### Pitfall 6: `postgres-js` returns numeric aggregates as strings
**What goes wrong:** `sum(...)` comes back as `"42"`; arithmetic/`.toLocaleString()` misbehaves.
**Why it happens:** Postgres `numeric`/`bigint` → JS string to avoid precision loss.
**How to avoid:** `.mapWith(Number)` on each aggregate (as in Pattern 5). `coalesce(..., 0)` so an empty range returns `0`, not `null`.
**Warning signs:** `"0" + servings` string concat in the UI.

## Runtime State Inventory

> Phase 6 is additive (new tables/columns/pages), not a rename/migration. This section is included only to flag the one stateful cross-system concern.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New `partners` table + `profiles.partnerId`/`profiles.deactivatedAt` columns | Drizzle migration + MCP RLS (deny-anon) on `partners` |
| Live service config | **Clerk `publicMetadata.role`** is live state outside Postgres — role changes write there, and it lags the session token | Code: `updateUserMetadata` + accept claim-lag (Pitfall 1); `banUser` on deactivate |
| OS-registered state | None — no scheduler/process changes in this phase | None |
| Secrets/env vars | None new — `CLERK_SECRET_KEY` already validated in `env.ts`; Backend SDK reuses it | None |
| Build artifacts | None — no package renames | None |

## Code Examples

### Repo additions (profiles.ts)
```typescript
// listAll for the admin user table; setRole/deactivate/reactivate/setPartner mirror Clerk + NGO-local state
async listAll(): Promise<Profile[]> {
  return getDb().select().from(profiles).orderBy(desc(profiles.createdAt));
},
async setRole(id: string, role: Role): Promise<Profile | null> {
  const rows = await getDb().update(profiles)
    .set({ role, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
  return rows[0] ?? null;
},
async deactivate(id: string): Promise<Profile | null> {
  const rows = await getDb().update(profiles)
    .set({ deactivatedAt: sql`now()`, updatedAt: new Date() }).where(eq(profiles.id, id)).returning();
  return rows[0] ?? null;
},
// reactivate = same with deactivatedAt: null
// setPartner(id, partnerId | null) = set partnerId
```

### Hardened CSV helper (csv.ts) — the security-critical unit
```typescript
// Source: OWASP CSV Injection (owasp.org/www-community/attacks/CSV_Injection) + RFC 4180 (2026-06)
const FORMULA_LEAD = /^[=+\-@\t\r]/;          // formula-trigger leading chars
function csvCell(value: string): string {
  let v = value ?? "";
  if (FORMULA_LEAD.test(v)) v = `'${v}`;        // 1) neutralize formula FIRST
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`; // 2) RFC-4180 escape for the container
  return v;
}
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (c: string | number | null) => csvCell(c == null ? "" : String(c));
  const lines = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))];
  return lines.join("\r\n") + "\r\n";          // CRLF per RFC 4180
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `clerkClient.users.x` (sync) | `(await clerkClient()).users.x` | `@clerk/nextjs` v6 (Oct 2024), carried into v7 | MUST await; sync usage breaks `[VERIFIED]` |
| Pages Router API + Node `Buffer` for downloads | App Router Route Handler + Web `Response(string)` | App Router GA | No Buffer needed on Workers `[VERIFIED: opennext Node.js runtime]` |
| `.filter(Boolean)` before `and()` | `and(...maybeUndefined)` (native undefined drop) | Drizzle current | Cleaner dynamic filters `[CITED: orm.drizzle.team]` |

**Deprecated/outdated:**
- Synchronous `clerkClient()` / `auth()` (pre-v6) — both async now.
- `@cloudflare/next-on-pages` edge-only patterns / `export const runtime = "edge"` — not used here; opennext runs the Node.js runtime.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `(await clerkClient()).users.banUser(id)` is reachable in `@clerk/nextjs` 7.5.8 (verified in docs/BAPI; not executed in this session) | §A.3 | Low — if absent, soft-deactivate + `getSession` block still works; ban is the defense-in-depth layer. Verify with a typecheck on the installed version |
| A2 | postgres-js returns `sum()`/`count()` as strings (hence `.mapWith(Number)`) | Pitfall 6 | Low — `.mapWith(Number)` is harmless even if already numeric |
| A3 | The deactivated-block in `getSession` (one extra `profiles` read/request) is acceptable perf | §A.2 Pattern 2 | Low — single-tenant, PK lookup, per-request cached connection; revisit only if hot |
| A4 | Adding `profiles.partnerId`/`deactivatedAt` columns inherits the existing `profiles` RLS (no new policy needed) | Pitfall 5 | Low — columns inherit table RLS; confirm `profiles` RLS state via Supabase advisor when applying the migration |

## Open Questions

1. **Should the impact report be date-bounded by a default range?**
   - What we know: D-07 says "in a date range" by `delivered_at`.
   - What's unclear: default window when the admin opens `/admin/reports` with no filter (all-time vs last-30-days).
   - Recommendation: default to all-time (or current month) on first load; let the planner pick — trivial either way. Use `coalesce(..., 0)` so an empty range renders cleanly.

2. **Does `assignPickup` require the chosen volunteer to be active/onboarded?**
   - What we know: Phase 4 fixed `listVolunteerIds` to only return `onboardingComplete = true` volunteers.
   - What's unclear: whether the assign dropdown should source from that same filtered list (recommend: yes — reuse `listVolunteerIds`, and additionally exclude `deactivatedAt IS NOT NULL` once that column exists).
   - Recommendation: assign-target list = onboarded, non-deactivated volunteers; validate `volunteerId` server-side against that set in the action.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Clerk (secret key) | ADM-03 role/ban | ✓ (env-validated) | `@clerk/nextjs` 7.5.8 | — |
| Supabase Postgres | all data ops | ✓ | project `gulzlbmevvfdfblpdles` | — |
| Supabase MCP | apply RLS on `partners` | ✓ (configured `.mcp.json`) | — | Manual SQL in Supabase dashboard |
| Inngest | ADM-02 emit | ✓ | 4.11.0 | Best-effort emit already try/caught (Phase 4 pattern) |
| `@tanstack/react-query` | client filter lists | ✓ | 5.101.1 | Server-component lists |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None blocking — all present.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + Testing Library (jsdom) |
| Config file | `vitest.config.ts` (`@` alias; `server-only` stubbed for repo/unit tests) |
| Quick run command | `pnpm test:run` (or `pnpm test` watch) |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-06 | CSV escape: formula-lead `'`-prefix; quote/comma/newline RFC-4180 escape | unit | `pnpm test:run src/features/admin/lib/csv.test.ts` | ❌ Wave 0 |
| ADM-04 | `partnerSchema` valid passes; each invalid (name empty, bad email/phone, bad type) yields the exact message | unit | `pnpm test:run src/features/admin/validations/partner.test.ts` | ❌ Wave 0 |
| ADM-01 | filters schema coerces dates / drops blanks; (optionally) `listForAdmin` builds expected conditions | unit | `pnpm test:run src/features/admin/validations/filters.test.ts` | ❌ Wave 0 |
| ADM-03 | self-demote/self-deactivate guard returns FORBIDDEN; role-change calls Clerk *and* mirror (mock `clerkClient`) | unit | `pnpm test:run src/features/admin/actions/adminActions.test.ts` | ❌ Wave 0 |
| ADM-05 | impact report maps strings→numbers + coalesces empty range to 0 (pure mapper if extracted) | unit | covered by repo mapper test if logic extracted | ❌ optional |

> Per `testing-practices.md`: test the **CSV escape**, **Zod schemas**, the **self-guard branch**, and **aggregate mapping** — NOT pages, barrels, repos-as-passthrough, or "renders without throwing." The CSV helper and the self-guard are the highest-value tests (real bugs with security impact).

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm test:run <touched test>`
- **Per wave merge:** `pnpm test:run` (full) + `pnpm lint`
- **Phase gate:** `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build` green before `/gsd-verify-work` (project Definition of Done).

### Wave 0 Gaps
- [ ] `src/features/admin/lib/csv.test.ts` — covers ADM-06 (formula injection + RFC-4180)
- [ ] `src/features/admin/validations/partner.test.ts` — covers ADM-04 schema
- [ ] `src/features/admin/validations/filters.test.ts` — covers ADM-01 filter parsing
- [ ] `src/features/admin/actions/adminActions.test.ts` — covers ADM-03 self-guard + Clerk-call+mirror (mock `@clerk/nextjs/server`)
- [ ] No framework install needed — Vitest already configured.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Server action is the trust boundary; middleware defense-in-depth only |
| V2 Authentication | yes | Clerk; deactivate → `banUser` revokes sessions |
| V4 Access Control | **yes (core)** | `requireRole(["admin"])` first line of every admin action + the CSV route; no IDOR (admin-wide reads are intentional, role-gated); self-demote/self-deactivate guard |
| V5 Input Validation | yes | Zod for partner CRUD + filters; coordinate/enum validation; **CSV formula-injection guard** |
| V6 Cryptography | no | No new crypto (Clerk owns tokens) |
| V7 Error Handling/Logging | yes | `logger` (no `console`); `status_events` audit row on admin-assign (actor=admin) |
| V8 Data Protection | yes | `partners` contact PII → RLS deny-anon; secret key server-only |

### Known Threat Patterns for Next.js/Workers + Clerk + Postgres
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Admin route reached without admin role (middleware bypass, CVE-2025-29927-class) | Elevation of Privilege | `requireRole(["admin"])` re-check in every action AND the export route |
| CSV/formula injection via user-controlled cell | Tampering / RCE-on-client | `csvCell` formula-neutralize + RFC-4180 escape; unit-tested |
| IDOR on admin-wide reads | Info disclosure | Admin-wide is *intended* and role-gated; non-admins 403 at action + middleware |
| Self-lockout / privilege removal of last admin | Denial of Service | Self-demote/self-deactivate guard (D-05) |
| Stale privileges after role change | Elevation (transient) | Accept eventual consistency; `banUser` for immediate de-auth on deactivate; UI copy |
| Anon read of `partners` PII via PostgREST | Info disclosure | RLS enabled, no anon policy (deny-by-default), applied via MCP |
| Forged session for deactivated user | Spoofing | `getSession` reads `deactivatedAt` per request (immediate) + `banUser` revokes the token |

## Schema / Migration

**Drizzle (`schema.ts`):**
```typescript
// New enum + table
export const partnerTypeEnum = pgEnum("partner_type",
  ["restaurant","hall","event_planner","family","other"]);   // also add a PARTNER_TYPES const in constants.ts (single source)

export const partners = pgTable("partners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: partnerTypeEnum("type").notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  address: text("address"),
  city: text("city").notNull().default("Ahmedabad"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;

// Two new columns on profiles
//   partnerId:     text("partner_id").references(() => partners.id),   // nullable FK
//   deactivatedAt: timestamp("deactivated_at", { withTimezone: true }), // nullable
// (add an index on profiles.partnerId if partner-scoped lists are added later — not required for v1)
```

**Migration steps (mirror Phase 3/4):**
1. `pnpm db:generate` → new `0004_*.sql` (creates `partner_type` enum + `partners` table + adds `profiles.partner_id` FK + `profiles.deactivated_at`).
2. Apply the generated SQL to the live DB **via Supabase MCP** (`apply_migration`), as in Phases 2–4.
3. **RLS via MCP** (separate statement, not in the Drizzle file): `ALTER TABLE partners ENABLE ROW LEVEL SECURITY;` with **no** anon policy (deny-by-default). Confirm `profiles` already has RLS (Supabase advisor); the new columns inherit it.

## Files to Create / Modify (for the planner)

**Create:**
- `src/app/admin/dashboard/page.tsx`, `…/pickups/page.tsx`, `…/pickups/export/route.ts`, `…/users/page.tsx`, `…/partners/page.tsx`, `…/reports/page.tsx`
- `src/features/admin/actions/adminActions.ts` — `assignPickup`, `setUserRole`, `deactivateUser`, `reactivateUser`, `setUserPartner`, partner CRUD actions (each: `requireRole(["admin"])` first line)
- `src/features/admin/components/` — `AdminPickupFilters`, `AdminPickupRow`/reuse `PickupCard`, `UserRow`/`UserRoleControl`, `PartnerForm` (RHF+Zod), `ImpactReport`, `AssignVolunteerControl`
- `src/features/admin/validations/{partner,filters}.ts` (+ `.test.ts`)
- `src/features/admin/lib/csv.ts` (+ `csv.test.ts`)
- `src/features/admin/actions/adminActions.test.ts` (self-guard + Clerk-call+mirror, mock `@clerk/nextjs/server`)
- `src/features/admin/index.ts` (barrel)
- `src/server/db/repositories/partners.ts` — create/getById/list/update/delete
- `src/server/db/migrations/0004_*.sql` (generated)

**Modify:**
- `src/server/db/schema.ts` — `partnerTypeEnum` + `partners` + `profiles.partnerId` + `profiles.deactivatedAt`
- `src/server/db/repositories/pickups.ts` — `listForAdmin(filters)`, `assignToVolunteer(id, volunteerId)`, `impactReport(from, to)`
- `src/server/db/repositories/profiles.ts` — `listAll`, `setRole`, `deactivate`, `reactivate`, `setPartner`; ensure assign-target source excludes deactivated
- `src/server/auth/session.ts` — `getSession` reads `profiles.deactivatedAt` → block; extend `SessionInfo`/profile read
- `src/middleware.ts` — (optional) nothing required if `getSession` blocks; if a friendlier redirect for deactivated users is wanted, add a check (note: middleware can't easily read the DB on the edge — prefer the `getSession`/action layer; keep middleware claim-only)
- `src/config/constants.ts` — `PARTNER_TYPES` + labels; `ROUTES.adminPickups/adminUsers/adminPartners/adminReports`; `QUERY_KEYS.adminPickups(filters)`/`partners` if client lists used
- `src/features/admin/actions/adminActions.ts` — `inngest.send("pickup/claimed")` after `assignToVolunteer` commit (best-effort, try/caught — Phase 4 pattern) + `statusEventsRepo.record({actorId: admin, from:"requested", to:"accepted"})`

> **Middleware caveat (important for the planner):** the deactivated block belongs in `getSession`/actions, NOT primarily in middleware — middleware runs on the edge per-request and reading Postgres there per-request is undesirable. `requireRole`/`requireUser` already funnel through `getSession`, so blocking there covers every protected action + server component. `banUser` covers the token itself.

## Deps to Add

**None.** Every required library (`@clerk/nextjs`, `drizzle-orm`, `postgres`, `react-hook-form`/`zod`, `@tanstack/react-query`, `inngest`) is already installed (verified `package.json`). The CSV helper is hand-written per D-08 (no new lib).

## Open Risks

- **Clerk claim-lag UX (MEDIUM):** role changes are eventually-consistent for the target user; without UI copy ("applies on next sign-in") staff may think it failed. Mitigate with copy; `banUser` only forces re-auth on *deactivate*, not on a plain role change.
- **`banUser` availability on the pinned version (LOW):** confirm `users.banUser`/`unbanUser` exist on `@clerk/nextjs` 7.5.8 at implementation time (A1). Soft-deactivate works without it; ban is defense-in-depth.
- **`getSession` extra read (LOW):** one `profiles` lookup per session read; fine at this scale, flagged if it ever shows in latency.
- **RLS on `partners` is a manual MCP step (MEDIUM if forgotten):** Drizzle won't emit it; a missed `ENABLE ROW LEVEL SECURITY` exposes contact PII via the anon key. Make it an explicit plan task with a Supabase-advisor verification.
- **CSV correctness (MEDIUM):** the escape helper is security-critical and easy to get subtly wrong (order of operations); the unit test is mandatory, not optional.

## Sources

### Primary (HIGH confidence)
- Clerk — Backend SDK overview (`clerkClient` is async, `await clerkClient()`): https://clerk.com/docs/references/backend/overview (2026-06)
- Clerk — `updateUserMetadata` signature + deep-merge: https://clerk.com/docs/references/backend/user/update-user-metadata (2026-06)
- Clerk — `banUser` (revokes all sessions, blocks re-sign-in): https://clerk.com/docs/reference/backend/user/ban-user (2026-06)
- Clerk — v6 upgrade (sync→async `clerkClient`/`auth`; claims refresh on token refresh): https://clerk.com/docs/guides/development/upgrading/upgrade-guides/nextjs-v6 (2026-06)
- Drizzle — raw SQL aggregates `sql<number>`/`.mapWith(Number)`/`FILTER`: https://orm.drizzle.team/docs/sql (2026-06)
- Drizzle — conditional filters (`and()` drops undefined): https://orm.drizzle.team/docs/guides/conditional-filters-in-query (2026-06)
- OWASP — CSV Injection (formula-lead chars + separator/quote caveat): https://owasp.org/www-community/attacks/CSV_Injection (2026-06)
- opennext Cloudflare — Node.js runtime, native `Response`, no `edge` export: https://opennext.js.org/cloudflare (2026-06)
- Codebase (HIGH): `src/server/db/repositories/{pickups,profiles,statusEvents}.ts`, `src/features/pickups/actions/pickupActions.ts`, `src/server/auth/session.ts`, `src/middleware.ts`, `src/server/db/{schema,client}.ts`, `src/server/db/migrations/0002_*.sql`/`0003_*.sql`, `.planning/phases/04-notifications/04-RESEARCH.md` (RLS-deny-anon pattern), `package.json`, `vitest.config.ts`

### Secondary (MEDIUM confidence)
- Clerk — `@clerk/backend` is the canonical Workers SDK (V8-isolate/fetch): https://clerk.com/docs/guides/development/sdk-development/backend-only + WebSearch corroboration (2026-06)
- Next.js Route Handler file-download patterns (Content-Disposition/Response): WebSearch (multiple), cross-checked with native Web `Response` (2026-06)

### Tertiary (LOW confidence)
- None load-bearing — all critical claims verified against primary docs or the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all installed; versions read from `package.json`; Clerk/Drizzle APIs verified against current docs.
- Architecture: HIGH — Phase 6 reuses Phase 2–4 patterns present in the codebase (atomic claim, repo/action/emit, RLS-deny-anon).
- Pitfalls: HIGH — claim-lag (Clerk v6 docs), CSV injection (OWASP), RLS (codebase), postgres-js numeric-as-string (well-established).
- Clerk `banUser` on the exact pinned version: MEDIUM (A1) — verify at implementation.

**Research date:** 2026-06-26
**Valid until:** ~2026-07-26 (stable stack; re-verify Clerk SDK if `@clerk/nextjs` major bumps).
