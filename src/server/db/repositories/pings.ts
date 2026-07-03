import "server-only";
import { desc, eq, sql } from "drizzle-orm";
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
  /**
   * Insert one ping, with a 5-second server-side rate floor (B1 note 2). Caller
   * (recordPing action) has already authorised + validated. Implemented as ONE
   * statement — INSERT … SELECT … WHERE NOT EXISTS — so the guard is race-free
   * (no read-then-write). A ping arriving < 5s after the newest one for the same
   * pickup silently no-ops (0 rows); the action still returns {ok:true} so a
   * throttled client does NOT retry. The (pickup_id, created_at desc) index makes
   * the NOT EXISTS probe cheap. id is generated here (schema uses a JS $defaultFn,
   * not a DB default); created_at falls back to the column's default now().
   */
  async insert(input: NewLocationPing): Promise<void> {
    const db = getDb();
    const id = crypto.randomUUID();
    await db.execute(sql`
      insert into ${locationPings} (id, pickup_id, volunteer_id, lat, lng, accuracy)
      select ${id}, ${input.pickupId}, ${input.volunteerId}, ${input.lat}, ${input.lng}, ${input.accuracy ?? null}
      where not exists (
        select 1 from ${locationPings}
        where ${locationPings.pickupId} = ${input.pickupId}
          and ${locationPings.createdAt} > now() - interval '5 seconds'
      )
    `);
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
};
