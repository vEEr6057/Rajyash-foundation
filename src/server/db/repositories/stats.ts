import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
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

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  deliveries: number;
  servings: number;
  kg: number;
}

/**
 * Delivered-pickup counts per day for the last `days` days (inclusive of today).
 * Gaps are filled with zeros in JS so the chart x-axis is continuous.
 */
export async function getDeliveriesTrend(days = 30): Promise<TrendPoint[]> {
  const db = getDb();
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${pickups.deliveredAt}, 'YYYY-MM-DD')`,
      deliveries: sql<number>`count(*)`.mapWith(Number),
      servings: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'servings'), 0)`.mapWith(Number),
      kg: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'kg'), 0)`.mapWith(Number),
    })
    .from(pickups)
    .where(
      and(
        eq(pickups.status, "delivered"),
        gte(pickups.deliveredAt, from),
        lte(pickups.deliveredAt, to),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = byDay.get(key);
    out.push({
      date: key,
      deliveries: r?.deliveries ?? 0,
      servings: r?.servings ?? 0,
      kg: r?.kg ?? 0,
    });
  }
  return out;
}
