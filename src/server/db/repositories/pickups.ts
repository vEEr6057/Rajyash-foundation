import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pickups, type NewPickup, type Pickup } from "@/server/db/schema";
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
      .orderBy(desc(pickups.createdAt));
  },

  async listByDonor(donorId: string): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(eq(pickups.donorId, donorId))
      .orderBy(desc(pickups.createdAt));
  },

  async listByVolunteer(volunteerId: string): Promise<Pickup[]> {
    const db = getDb();
    return db
      .select()
      .from(pickups)
      .where(eq(pickups.volunteerId, volunteerId))
      .orderBy(desc(pickups.createdAt));
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
    const rows = await db
      .update(pickups)
      .set({ proofPhotoPath: path, updatedAt: new Date() })
      .where(and(eq(pickups.id, id), eq(pickups.volunteerId, volunteerId)))
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
    const orderBy = dir === "asc" ? asc(col) : desc(col);
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(pickups)
        .where(where)
        .orderBy(orderBy)
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
