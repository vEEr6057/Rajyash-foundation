import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  statusEvents,
  type NewStatusEvent,
  type StatusEvent,
} from "@/server/db/schema";

/** Append-only audit log for pickup status transitions (D-08). */
export const statusEventsRepo = {
  async record(input: NewStatusEvent): Promise<StatusEvent> {
    const db = getDb();
    const rows = await db.insert(statusEvents).values(input).returning();
    return rows[0];
  },

  async listForPickup(pickupId: string): Promise<StatusEvent[]> {
    const db = getDb();
    return db
      .select()
      .from(statusEvents)
      .where(eq(statusEvents.pickupId, pickupId))
      .orderBy(asc(statusEvents.createdAt));
  },
};
