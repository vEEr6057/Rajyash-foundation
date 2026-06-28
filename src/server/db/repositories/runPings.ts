import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { runPings, type RunPing, type NewRunPing } from "@/server/db/schema";

/** Ephemeral driver GPS trail for an active run (TRK-05). Mirrors pingsRepo. */
export const runPingsRepo = {
  async insert(input: NewRunPing): Promise<RunPing> {
    const db = getDb();
    const rows = await db.insert(runPings).values(input).returning();
    return rows[0];
  },

  async latestForRun(runId: string): Promise<RunPing | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(runPings)
      .where(eq(runPings.runId, runId))
      .orderBy(desc(runPings.createdAt))
      .limit(1);
    return rows[0] ?? null;
  },

  /** TRK-05: delete every ping for a run. Scoped to run_id only. */
  async purgeForRun(runId: string): Promise<void> {
    const db = getDb();
    await db.delete(runPings).where(eq(runPings.runId, runId));
  },
};
