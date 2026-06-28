import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  runs,
  runStops,
  type Run,
  type NewRun,
  type RunStop,
} from "@/server/db/schema";
import type { RunStatus } from "@/config/constants";

/** A run together with its ordered stops. */
export type RunWithStops = Run & { stops: RunStop[] };

export const runsRepo = {
  async create(input: NewRun): Promise<Run> {
    const db = getDb();
    const rows = await db.insert(runs).values(input).returning();
    return rows[0];
  },

  async getById(id: string): Promise<Run | null> {
    const db = getDb();
    const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
    return rows[0] ?? null;
  },

  /** A run with its stops ordered by seq. */
  async getRunWithStops(id: string): Promise<RunWithStops | null> {
    const db = getDb();
    const runRows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
    if (!runRows[0]) return null;
    const stopRows = await db
      .select()
      .from(runStops)
      .where(eq(runStops.runId, id))
      .orderBy(asc(runStops.seq));
    return { ...runRows[0], stops: stopRows };
  },

  /** All runs (coordinator board), newest run-date first. */
  async listRuns(): Promise<Run[]> {
    const db = getDb();
    return db.select().from(runs).orderBy(desc(runs.runDate), desc(runs.createdAt));
  },

  /** Runs assigned to a driver, newest run-date first. */
  async listRunsForDriver(driverId: string): Promise<Run[]> {
    const db = getDb();
    return db
      .select()
      .from(runs)
      .where(eq(runs.driverId, driverId))
      .orderBy(desc(runs.runDate));
  },

  async assignDriver(id: string, driverId: string): Promise<Run | null> {
    const db = getDb();
    const rows = await db
      .update(runs)
      .set({ driverId, updatedAt: new Date() })
      .where(eq(runs.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async setRunStatus(id: string, status: RunStatus): Promise<Run | null> {
    const db = getDb();
    const rows = await db
      .update(runs)
      .set({ status, updatedAt: new Date() })
      .where(eq(runs.id, id))
      .returning();
    return rows[0] ?? null;
  },

  /** General field update (e.g. slot/runDate edit) — backs editRun (RUN-04). */
  async update(id: string, fields: Partial<NewRun>): Promise<Run | null> {
    const db = getDb();
    const rows = await db
      .update(runs)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(runs.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(runs).where(eq(runs.id, id));
  },
};
