import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pickups, runs, partners, destinations, profiles } from "@/server/db/schema";
import {
  bucketPickupStatuses,
  bucketRunStatuses,
  extractDeliveredImpact,
  extractDirectoryCounts,
  type PickupBuckets,
  type RunBuckets,
  type PickupStatusAggRow,
} from "@/features/admin";
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

/**
 * Admin overview analytics (UX-11) — every independent aggregate fired in ONE
 * Promise.all, down to 4 round trips (was 6):
 *  - the all-time impact tile (servings/kg/delivered-count) is folded into the
 *    SAME GROUP BY status query as the pickup-status buckets (FILTER
 *    aggregates per status) instead of a second impactReport() call — the
 *    epoch..year-9999 bounds that call used were already equivalent to "no
 *    date filter", so this returns identical numbers.
 *  - partners-count and destinations-count are two unrelated COUNT(*)s over
 *    unrelated tables; merged into one round trip via UNION ALL.
 *
 * Deliberately NOT wrapped in `unstable_cache`: see commit 7025a16 / PR #27
 * ("fix(ui): admin overview not loading") — getDb() (server/db/client.ts) is a
 * React `cache()`-scoped PER-REQUEST Postgres connection (Cloudflare Workers
 * can't reuse a socket across requests). `unstable_cache` runs its callback in
 * a cache scope that can outlive/detach from that request; nesting a
 * getDb()-calling function inside it reproduced the exact "blocked render on
 * Workers" bug #27 was written to fix. The cache-safe path used elsewhere
 * (impact.ts's getCachedImpactReport) only works because it's called from a
 * page that is NOT force-dynamic — this page (dashboard/page.tsx) must stay
 * force-dynamic (it's a per-admin authenticated view). So the latency fix here
 * is fewer round trips against the Workers-bounded connection pool (max: 5),
 * not a time-based cache.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const db = getDb();

  const [pickupRows, runRows, dirCountRows, roleRows] = await Promise.all([
    db
      .select({
        status: pickups.status,
        n: sql<number>`count(*)`.mapWith(Number),
        servings:
          sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'servings'), 0)`.mapWith(
            Number,
          ),
        kg: sql<number>`coalesce(sum(${pickups.quantity}) filter (where ${pickups.quantityUnit} = 'kg'), 0)`.mapWith(
          Number,
        ),
      })
      .from(pickups)
      .groupBy(pickups.status),
    db
      .select({ status: runs.status, n: sql<number>`count(*)`.mapWith(Number) })
      .from(runs)
      .groupBy(runs.status),
    db
      .select({ kind: sql<string>`'partners'`, n: sql<number>`count(*)`.mapWith(Number) })
      .from(partners)
      .unionAll(
        db
          .select({
            kind: sql<string>`'destinations'`,
            n: sql<number>`count(*)`.mapWith(Number),
          })
          .from(destinations),
      ),
    db
      .select({ role: profiles.role, n: sql<number>`count(*)`.mapWith(Number) })
      .from(profiles)
      .groupBy(profiles.role),
  ]);

  const one = (n: number | undefined) => n ?? 0;
  const dirCounts = extractDirectoryCounts(dirCountRows);

  return {
    impact: extractDeliveredImpact(pickupRows as PickupStatusAggRow<PickupStatus>[]),
    pickups: bucketPickupStatuses(pickupRows as { status: PickupStatus; n: number }[]),
    runs: bucketRunStatuses(runRows as { status: RunStatus; n: number }[]),
    partners: dirCounts.partners,
    destinations: dirCounts.destinations,
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
