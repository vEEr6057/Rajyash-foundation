import "server-only";
import { desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { runPings, type RunPing, type NewRunPing } from "@/server/db/schema";

/** Ephemeral driver GPS trail for an active run (TRK-05). Mirrors pingsRepo. */
export const runPingsRepo = {
  /**
   * Insert one run ping with a 5-second server-side rate floor (B1 note 2).
   * Same single-statement guard as pingsRepo.insert — INSERT … SELECT … WHERE
   * NOT EXISTS, race-free, silent no-op when throttled. The (run_id, created_at
   * desc) index keeps the probe cheap.
   */
  async insert(input: NewRunPing): Promise<void> {
    const db = getDb();
    const id = crypto.randomUUID();
    await db.execute(sql`
      insert into ${runPings} (id, run_id, driver_id, lat, lng, accuracy)
      select ${id}, ${input.runId}, ${input.driverId}, ${input.lat}, ${input.lng}, ${input.accuracy ?? null}
      where not exists (
        select 1 from ${runPings}
        where ${runPings.runId} = ${input.runId}
          and ${runPings.createdAt} > now() - interval '5 seconds'
      )
    `);
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

  /** B3 hygiene sweep: delete run pings older than `cutoff`. Returns the count purged. */
  async purgeOlderThan(cutoff: Date): Promise<number> {
    const db = getDb();
    const rows = await db
      .delete(runPings)
      .where(lt(runPings.createdAt, cutoff))
      .returning({ id: runPings.id });
    return rows.length;
  },
};
