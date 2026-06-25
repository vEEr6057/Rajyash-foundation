import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pickups, type NewPickup, type Pickup } from "@/server/db/schema";
import type { PickupStatus } from "@/config/constants";

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
};
