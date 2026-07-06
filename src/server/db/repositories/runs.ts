import "server-only";
import { asc, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  runs,
  runStops,
  profiles,
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
    return db
      .select()
      .from(runs)
      .orderBy(desc(runs.runDate), desc(runs.createdAt))
      // Cap for the Workers CPU budget (each row is SSR-serialized); newest 100.
      // Paginate when a coordinator actually exceeds it.
      .limit(100);
  },

  /**
   * Coordinator board (paged): windowed + driver-name search (left join on
   * profiles — unassigned runs match only when no q). page is 1-based.
   */
  async listRunsPaged(
    q: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ rows: Run[]; total: number }> {
    const db = getDb();
    const where = q ? ilike(profiles.name, `%${q}%`) : undefined;
    const [rows, totalRows] = await Promise.all([
      db
        .select(getTableColumns(runs))
        .from(runs)
        .leftJoin(profiles, eq(runs.driverId, profiles.id))
        .where(where)
        .orderBy(desc(runs.runDate), desc(runs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(runs)
        .leftJoin(profiles, eq(runs.driverId, profiles.id))
        .where(where),
    ]);
    return { rows, total: totalRows[0]?.count ?? 0 };
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
