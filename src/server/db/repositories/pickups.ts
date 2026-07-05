import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  pickups,
  statusEvents,
  type NewPickup,
  type Pickup,
} from "@/server/db/schema";
import type { PickupStatus } from "@/config/constants";

/** Columns the admin pickups table can sort by (server-side). */
export const PICKUP_SORT_COLUMNS = {
  status: pickups.status,
  category: pickups.category,
  quantity: pickups.quantity,
  createdAt: pickups.createdAt,
} as const;
export type PickupSortKey = keyof typeof PICKUP_SORT_COLUMNS;

/** Admin pickups filter (D-03). All optional; and() drops undefined natively. */
export interface AdminPickupFilters {
  status?: PickupStatus;
  donorId?: string;
  volunteerId?: string;
  from?: Date; // by createdAt
  to?: Date;
}

/** Thin data-access for pickups. Business rules (status machine, ownership) live in the service. */
export const pickupsRepo = {
  async create(input: NewPickup): Promise<Pickup> {
    const db = getDb();
    const rows = await db.insert(pickups).values(input).returning();
    return rows[0];
  },

  async getById(id: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db.select().from(pickups).where(eq(pickups.id, id)).limit(1);
    return rows[0] ?? null;
  },

  /** Open board: all unclaimed (requested) pickups, newest first. */
  async listOpen(): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(eq(pickups.status, "requested"))
      .orderBy(desc(pickups.createdAt))
      // Cap for the Workers CPU budget (each row is SSR-serialized); the board
      // never usefully shows more. Add pagination if an owner ever exceeds it.
      .limit(100);
  },

  async listByDonor(donorId: string): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(eq(pickups.donorId, donorId))
      .orderBy(desc(pickups.createdAt))
      // Cap for the Workers CPU budget; newest 100 shown. Paginate when exceeded.
      .limit(100);
  },

  /**
   * UX-6: the CALLER's own most recent pickup, for the "repeat last pickup"
   * prefill. donorId is always the session's own id (server action guard) —
   * the WHERE clause is the ownership check itself, never a client-supplied id.
   */
  async getLastByDonor(donorId: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(pickups)
      .where(eq(pickups.donorId, donorId))
      .orderBy(desc(pickups.createdAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async listByVolunteer(volunteerId: string): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(eq(pickups.volunteerId, volunteerId))
      .orderBy(desc(pickups.createdAt))
      // Cap for the Workers CPU budget; newest 100 shown. Paginate when exceeded.
      .limit(100);
  },

  /** Donor edit — only the owner, only while still requested. Returns null if not applicable. */
  async updateIfRequested(
    id: string,
    donorId: string,
    fields: Partial<NewPickup>,
  ): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({ ...fields, updatedAt: new Date() })
      .where(
        and(
          eq(pickups.id, id),
          eq(pickups.donorId, donorId),
          eq(pickups.status, "requested"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  },

  /** Atomic claim (D-07). Zero rows = already claimed/gone. */
  async claimIfAvailable(id: string, volunteerId: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({
        status: "accepted",
        volunteerId,
        claimedAt: sql`now()`,
        updatedAt: new Date(),
      })
      .where(and(eq(pickups.id, id), eq(pickups.status, "requested")))
      .returning();
    return rows[0] ?? null;
  },

  /** Donor cancel — owner only, only while requested. */
  async cancelIfRequested(id: string, donorId: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(pickups.id, id),
          eq(pickups.donorId, donorId),
          eq(pickups.status, "requested"),
        ),
      )
      .returning();
    return rows[0] ?? null;
  },

  /**
   * Volunteer advance — conditional on assignment AND the expected current status
   * (optimistic-concurrency guard). Zero rows = stale/forbidden.
   */
  async advance(
    id: string,
    volunteerId: string,
    from: PickupStatus,
    to: PickupStatus,
    extra: Partial<NewPickup> = {},
  ): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({ status: to, ...extra, updatedAt: new Date() })
      .where(
        and(
          eq(pickups.id, id),
          eq(pickups.volunteerId, volunteerId),
          eq(pickups.status, from),
        ),
      )
      .returning();
    return rows[0] ?? null;
  },

  async setProofPhoto(
    id: string,
    volunteerId: string,
    path: string,
  ): Promise<Pickup | null> {
    const db = getDb();
    // Status guard: proof only makes sense once the food is in hand — never on a
    // requested/accepted/en_route/cancelled pickup.
    const rows = await db
      .update(pickups)
      .set({ proofPhotoPath: path, updatedAt: new Date() })
      .where(
        and(
          eq(pickups.id, id),
          eq(pickups.volunteerId, volunteerId),
          inArray(pickups.status, ["picked_up", "delivered"]),
        ),
      )
      .returning();
    return rows[0] ?? null;
  },

  // ── Admin (Phase 6) ──────────────────────────────────────────────
  /** ADM-01: admin-wide list (NOT owner-scoped), server-side filtered, newest first. */
  async listForAdmin(f: AdminPickupFilters): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(
        and(
          f.status ? eq(pickups.status, f.status) : undefined,
          f.donorId ? eq(pickups.donorId, f.donorId) : undefined,
          f.volunteerId ? eq(pickups.volunteerId, f.volunteerId) : undefined,
          f.from ? gte(pickups.createdAt, f.from) : undefined,
          f.to ? lte(pickups.createdAt, f.to) : undefined,
        ),
      )
      .orderBy(desc(pickups.createdAt));
  },

  /**
   * ADM-01 (paged): same filter as listForAdmin but windowed for the admin table.
   * Returns the page rows + total matching count (one extra count round-trip).
   * page is 1-based.
   */
  async listForAdminPaged(
    f: AdminPickupFilters,
    page: number,
    pageSize: number,
    sort: PickupSortKey = "createdAt",
    dir: "asc" | "desc" = "desc",
  ): Promise<{ rows: Pickup[]; total: number }> {
    const db = getDb();
    const where = and(
      f.status ? eq(pickups.status, f.status) : undefined,
      f.donorId ? eq(pickups.donorId, f.donorId) : undefined,
      f.volunteerId ? eq(pickups.volunteerId, f.volunteerId) : undefined,
      f.from ? gte(pickups.createdAt, f.from) : undefined,
      f.to ? lte(pickups.createdAt, f.to) : undefined,
    );
    const col = PICKUP_SORT_COLUMNS[sort] ?? pickups.createdAt;
    const dirFn = dir === "asc" ? asc : desc;
    // Quantity mixes units (kg vs servings) — group by unit first so the numeric
    // sort is within-unit, not apples-to-oranges (E2E-AUDIT 🟡 6).
    const orderBy =
      sort === "quantity"
        ? [asc(pickups.quantityUnit), dirFn(pickups.quantity)]
        : [dirFn(col)];
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(pickups)
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(pickups)
        .where(where),
    ]);
    return { rows, total: totalRows[0]?.count ?? 0 };
  },

  /**
   * ADM-02: admin assigns a REQUESTED pickup to a chosen volunteer. Mirrors
   * claimIfAvailable's atomic guard — only succeeds while still 'requested'
   * (0 rows = already claimed/assigned/cancelled). No read-then-write.
   */
  async assignToVolunteer(
    id: string,
    volunteerId: string,
  ): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({
        status: "accepted",
        volunteerId,
        claimedAt: sql`now()`,
        updatedAt: new Date(),
      })
      .where(and(eq(pickups.id, id), eq(pickups.status, "requested")))
      .returning();
    return rows[0] ?? null;
  },

  /**
   * ADM-05: impact aggregate over DELIVERED pickups in [from, to] by delivered_at.
   * servings + kg summed SEPARATELY (D-07). SUM() FILTER = one round-trip;
   * .mapWith(Number) because postgres-js returns numeric as a string; coalesce(…,0).
   */
  async impactReport(
    from: Date,
    to: Date,
  ): Promise<{ servings: number; kg: number; count: number }> {
    const db = getDb();
    const [row] = await db
      .select({
        servings:
          sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'servings'), 0)`.mapWith(
            Number,
          ),
        kg: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'kg'), 0)`.mapWith(
          Number,
        ),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(pickups)
      .where(
        and(
          eq(pickups.status, "delivered"),
          gte(pickups.deliveredAt, from),
          lte(pickups.deliveredAt, to),
        ),
      );
    return row;
  },

  // ── Intake (Phase 11) ──────────────────────────────────────────────
  /**
   * INT-01 back-fill: set partnerId on a newly created pickup (called from createPickup
   * when the donor's profile has a linked partner). Only called when partnerId is non-null;
   * noop guard is in the action, not here.
   */
  async setPartnerId(id: string, partnerId: string): Promise<void> {
    const db = getDb();
    await db
      .update(pickups)
      .set({ partnerId, updatedAt: new Date() })
      .where(eq(pickups.id, id));
  },

  /** INT-03: coordinator sets the verified flag. */
  async verify(id: string, verifiedBy: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({ verifiedAt: new Date(), verifiedBy, updatedAt: new Date() })
      .where(eq(pickups.id, id))
      .returning();
    return rows[0] ?? null;
  },

  // ── Hygiene (B4) ────────────────────────────────────────────────────
  /**
   * B4: auto-cancel every `requested` pickup whose window closed before `cutoff`
   * (the nightly sweeper passes now − 48h). Each cancelled pickup gets a
   * `status_events` audit row (actor = the pickup's own donor, since actor_id FKs
   * to profiles). Update + event insert run in one transaction so a mid-way failure
   * (the sweeper retries) never leaves cancelled rows without their audit trail.
   * NEVER touches claimed pickups (accepted/en_route/picked_up) — that's a human call.
   * Returns the number cancelled.
   */
  async cancelStaleRequested(cutoff: Date): Promise<number> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const rows = await tx
        .update(pickups)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(pickups.status, "requested"), lt(pickups.windowEnd, cutoff)))
        .returning({ id: pickups.id, donorId: pickups.donorId });
      if (rows.length > 0) {
        await tx.insert(statusEvents).values(
          rows.map((r) => ({
            pickupId: r.id,
            actorId: r.donorId,
            fromStatus: "requested" as const,
            toStatus: "cancelled" as const,
          })),
        );
      }
      return rows.length;
    });
  },

  /**
   * B4: count claimed-but-stale pickups (accepted/en_route/picked_up whose window
   * closed before `cutoff` — the sweeper passes now − 72h). NOT auto-cancelled (a
   * volunteer holds them); the sweeper logs this as an ops breadcrumb.
   */
  async countStaleClaimed(cutoff: Date): Promise<number> {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(pickups)
      .where(
        and(
          inArray(pickups.status, ["accepted", "en_route", "picked_up"]),
          lt(pickups.windowEnd, cutoff),
        ),
      );
    return row?.count ?? 0;
  },

  /** INT-03: coordinator clears the verified flag. */
  async unverify(id: string): Promise<Pickup | null> {
    const db = getDb();
    const rows = await db
      .update(pickups)
      .set({ verifiedAt: null, verifiedBy: null, updatedAt: new Date() })
      .where(eq(pickups.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
