import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  stopStatusEvents,
  type StopStatusEvent,
} from "@/server/db/schema";

/** Read-side of the run stop status audit trail (writes happen atomically via
 * runStopsRepo.setStopStatusWithEvent — see that method for why). */
export const stopStatusEventsRepo = {
  async listForStop(stopId: string): Promise<StopStatusEvent[]> {
    const db = getDb();
    return db
      .select()
      .from(stopStatusEvents)
      .where(eq(stopStatusEvents.stopId, stopId))
      .orderBy(asc(stopStatusEvents.createdAt));
  },

  /**
   * Batched read for the admin run-detail history — one query for every stop
   * on a run instead of N (a run has a bounded but multi-stop stop list).
   */
  async listForStopIds(stopIds: string[]): Promise<StopStatusEvent[]> {
    if (stopIds.length === 0) return [];
    const db = getDb();
    return db
      .select()
      .from(stopStatusEvents)
      .where(inArray(stopStatusEvents.stopId, stopIds))
      .orderBy(asc(stopStatusEvents.createdAt));
  },
};
