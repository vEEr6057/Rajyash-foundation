import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { runs, runStops, pickups, destinations, partners } from "@/server/db/schema";

export interface RunSummaryRow {
  runId: string;
  runDate: string; // ISO date string YYYY-MM-DD
  slot: string;
  status: string;
  driverId: string | null;
  pickupStopCount: number;
  dropStopCount: number;
  completedDropCount: number;
}

export interface DestinationBreakdownRow {
  destinationId: string | null;
  destinationName: string;
  completedDropCount: number;
}

export interface PartnerBreakdownRow {
  partnerId: string | null;
  partnerName: string;
  servings: number;
  kg: number;
  count: number;
}

export const reportsRepo = {
  /**
   * RPT-01: Per-run summary — pickup-stop count, drop-stop count, completed-drop count.
   * No meal/kg totals (no FK linking pickups→runs; approximates only stop counts).
   * Filters runs by runDate in [from, to].
   */
  async runSummary(from: Date, to: Date): Promise<RunSummaryRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        runId: runs.id,
        runDate: sql<string>`to_char(${runs.runDate}, 'YYYY-MM-DD')`,
        slot: runs.slot,
        status: runs.status,
        driverId: runs.driverId,
        pickupStopCount: sql<number>`coalesce(count(*) filter (where ${runStops.kind} = 'pickup'), 0)`.mapWith(Number),
        dropStopCount: sql<number>`coalesce(count(*) filter (where ${runStops.kind} = 'drop'), 0)`.mapWith(Number),
        completedDropCount: sql<number>`coalesce(count(*) filter (where ${runStops.kind} = 'drop' and ${runStops.status} = 'done'), 0)`.mapWith(Number),
      })
      .from(runs)
      .leftJoin(runStops, eq(runStops.runId, runs.id))
      .where(and(gte(runs.runDate, from), lte(runs.runDate, to)))
      .groupBy(runs.id, runs.runDate, runs.slot, runs.status, runs.driverId)
      .orderBy(runs.runDate);
    return rows;
  },

  /**
   * RPT-01: Completed drop-stop counts grouped by destination.
   * Null destinationId = ad-hoc stop; coalesced to 'Ad-hoc'.
   * Filters via runs.runDate join.
   */
  async destinationBreakdown(from: Date, to: Date): Promise<DestinationBreakdownRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        destinationId: runStops.destinationId,
        destinationName: sql<string>`coalesce(${destinations.name}, 'Ad-hoc')`,
        completedDropCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(runStops)
      .leftJoin(runs, eq(runs.id, runStops.runId))
      .leftJoin(destinations, eq(destinations.id, runStops.destinationId))
      .where(
        and(
          eq(runStops.kind, "drop"),
          eq(runStops.status, "done"),
          gte(runs.runDate, from),
          lte(runs.runDate, to),
        ),
      )
      .groupBy(runStops.destinationId, destinations.name)
      .orderBy(sql`count(*) desc`);
    return rows;
  },

  /**
   * RPT-01: Meals/kg/count of DELIVERED pickups grouped by partner.
   * Mirrors pickupsRepo.impactReport SQL pattern; single round-trip with FILTER aggregates.
   * Null partnerId = pickup not linked to a partner; coalesced to 'Unknown partner'.
   */
  async partnerBreakdown(from: Date, to: Date): Promise<PartnerBreakdownRow[]> {
    const db = getDb();
    const rows = await db
      .select({
        partnerId: pickups.partnerId,
        partnerName: sql<string>`coalesce(${partners.name}, 'Unknown partner')`,
        servings: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'servings'), 0)`.mapWith(Number),
        kg: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'kg'), 0)`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(pickups)
      .leftJoin(partners, eq(partners.id, pickups.partnerId))
      .where(
        and(
          eq(pickups.status, "delivered"),
          gte(pickups.deliveredAt, from),
          lte(pickups.deliveredAt, to),
        ),
      )
      .groupBy(pickups.partnerId, partners.name)
      .orderBy(sql`count(*) desc`);
    return rows;
  },
};
