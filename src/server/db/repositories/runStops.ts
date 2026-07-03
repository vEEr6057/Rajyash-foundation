import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { runStops, type NewRunStop, type RunStop } from "@/server/db/schema";
import type { StopStatus } from "@/config/constants";

export const runStopsRepo = {
  async add(input: NewRunStop): Promise<RunStop> {
    const db = getDb();
    const rows = await db.insert(runStops).values(input).returning();
    return rows[0];
  },

  async getByRunId(runId: string): Promise<RunStop[]> {
    const db = getDb();
    return db
      .select()
      .from(runStops)
      .where(eq(runStops.runId, runId))
      .orderBy(asc(runStops.seq));
  },

  /**
   * Stop counts for many runs in ONE grouped query (kills the admin-runs N+1 —
   * previously N `getByRunId` round-trips just to `.length` the rows). Returns a
   * `{ [runId]: count }` map; runs with zero stops are simply absent (caller ?? 0).
   */
  async countByRunIds(runIds: string[]): Promise<Record<string, number>> {
    if (runIds.length === 0) return {};
    const db = getDb();
    const rows = await db
      .select({
        runId: runStops.runId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(runStops)
      .where(inArray(runStops.runId, runIds))
      .groupBy(runStops.runId);
    return Object.fromEntries(rows.map((r) => [r.runId, r.count]));
  },

  async getById(id: string): Promise<RunStop | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(runStops)
      .where(eq(runStops.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async remove(id: string): Promise<void> {
    const db = getDb();
    await db.delete(runStops).where(eq(runStops.id, id));
  },

  /** Reorder stops — batch seq update (low volume: coordinator drag). */
  async reorder(updates: Array<{ id: string; seq: number }>): Promise<void> {
    const db = getDb();
    await Promise.all(
      updates.map(({ id, seq }) =>
        db.update(runStops).set({ seq }).where(eq(runStops.id, id)),
      ),
    );
  },

  async setStopStatus(
    id: string,
    status: StopStatus,
    doneAt: Date | null,
  ): Promise<RunStop | null> {
    const db = getDb();
    const rows = await db
      .update(runStops)
      .set({ status, doneAt: doneAt ?? undefined })
      .where(eq(runStops.id, id))
      .returning();
    return rows[0] ?? null;
  },
};
