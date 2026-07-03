import "server-only";
import { desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  locationPings,
  type LocationPing,
  type NewLocationPing,
} from "@/server/db/schema";

/**
 * Data-access for location_pings (Phase 3). Append-only history (D-05) with an
 * immediate scoped purge on delivery/cancel (TRK-04). Runs as the postgres role
 * (bypasses RLS); ownership/role checks live in the server actions that call this.
 */
export const pingsRepo = {
  /** Insert one ping. Caller (recordPing action) has already authorised + validated. */
  async insert(input: NewLocationPing): Promise<LocationPing> {
    const db = getDb();
    const rows = await db.insert(locationPings).values(input).returning();
    return rows[0];
  },

  /** Newest ping for a pickup, or null. Backs the polling fallback (D-06). */
  async latestForPickup(pickupId: string): Promise<LocationPing | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(locationPings)
      .where(eq(locationPings.pickupId, pickupId))
      .orderBy(desc(locationPings.createdAt))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Full trail for a pickup, newest first (optional history view / debugging). */
  async listForPickup(pickupId: string): Promise<LocationPing[]> {
    const db = getDb();
    return db
      .select()
      .from(locationPings)
      .where(eq(locationPings.pickupId, pickupId))
      .orderBy(desc(locationPings.createdAt));
  },

  /** TRK-04: delete every ping for a pickup. Scoped to pickup_id ONLY. */
  async purgeForPickup(pickupId: string): Promise<void> {
    const db = getDb();
    await db.delete(locationPings).where(eq(locationPings.pickupId, pickupId));
  },

  /**
   * B3 hygiene sweep: delete pings older than `cutoff` (stuck-active safety net for the
   * rare case a pickup never reaches delivered/cancelled). Returns the count purged.
   */
  async purgeOlderThan(cutoff: Date): Promise<number> {
    const db = getDb();
    const rows = await db
      .delete(locationPings)
      .where(lt(locationPings.createdAt, cutoff))
      .returning({ id: locationPings.id });
    return rows.length;
  },
};
