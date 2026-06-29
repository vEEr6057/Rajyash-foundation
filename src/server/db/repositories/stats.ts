import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pickups, runs, partners, destinations, profiles } from "@/server/db/schema";
import { pickupsRepo } from "./pickups";
import {
  bucketPickupStatuses,
  bucketRunStatuses,
  type PickupBuckets,
  type RunBuckets,
} from "@/features/admin/lib/overview";
import type { PickupStatus, RunStatus } from "@/config/constants";

export interface AdminOverview {
  impact: { servings: number; kg: number; count: number };
  pickups: PickupBuckets;
  runs: RunBuckets;
  partners: number;
  destinations: number;
  volunteers: number;
  drivers: number;
}

// All-time impact bounds (mirror impact.ts) — direct call, no unstable_cache
// layer (the overview is force-dynamic; the cache wrapper is unnecessary here
// and was preventing the page from rendering on Workers).
const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO = new Date(9999, 0, 1);

/** Admin overview analytics — one parallel fan-out of cheap COUNT/GROUP BY queries. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const db = getDb();
  const one = (n: number | undefined) => n ?? 0;

  const [impact, pickupRows, runRows, partnerRows, destRows, roleRows] =
    await Promise.all([
      pickupsRepo.impactReport(ALL_TIME_FROM, ALL_TIME_TO),
      db
        .select({ status: pickups.status, n: sql<number>`count(*)`.mapWith(Number) })
        .from(pickups)
        .groupBy(pickups.status),
      db
        .select({ status: runs.status, n: sql<number>`count(*)`.mapWith(Number) })
        .from(runs)
        .groupBy(runs.status),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(partners),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(destinations),
      db
        .select({ role: profiles.role, n: sql<number>`count(*)`.mapWith(Number) })
        .from(profiles)
        .groupBy(profiles.role),
    ]);

  return {
    impact,
    pickups: bucketPickupStatuses(pickupRows as { status: PickupStatus; n: number }[]),
    runs: bucketRunStatuses(runRows as { status: RunStatus; n: number }[]),
    partners: one(partnerRows[0]?.n),
    destinations: one(destRows[0]?.n),
    volunteers: one(roleRows.find((r) => r.role === "volunteer")?.n),
    drivers: one(roleRows.find((r) => r.role === "driver")?.n),
  };
}
