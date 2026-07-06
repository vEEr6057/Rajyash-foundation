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
} from "@/server/analytics/overview";
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

export interface AdminDashboardData {
  overview: AdminOverview;
  trend: TrendPoint[];
  partnerBreakdown: {
    partnerId: string | null;
    partnerName: string;
    servings: number;
    kg: number;
    count: number;
  }[];
  destinationBreakdown: {
    destinationId: string | null;
    destinationName: string;
    completedDropCount: number;
  }[];
}

/**
 * EVERY dashboard aggregate in ONE SQL statement / ONE round trip.
 *
 * Why: on Workers each request opens fresh Postgres connections (pool max 5,
 * no socket reuse across requests) and pays cross-region RTT per query. The
 * dashboard's previous shape — getAdminOverview (4 queries) + trend + two
 * breakdowns + two pickers — serialized ~9 round trips and routinely blew the
 * 8s withTimeout budget, so every tile fell back to zero (wrangler-tail
 * evidence 2026-07-07: "withTimeout: dependency exceeded budget,
 * label: dashboard.overview/trend"). json_build_object with subselects makes
 * the database do the fan-out server-side instead.
 *
 * The per-aggregate functions above remain for other callers (reports page).
 */
export async function getAdminDashboardData(trendDays = 30): Promise<AdminDashboardData> {
  const db = getDb();
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (trendDays - 1));
  from.setHours(0, 0, 0, 0);

  const result = await db.execute(sql`
    select json_build_object(
      'pickupAgg', (select coalesce(json_agg(t), '[]'::json) from (
        select status, count(*)::int as n,
          coalesce(sum(quantity) filter (where quantity_unit = 'servings'), 0)::int as servings,
          coalesce(sum(quantity) filter (where quantity_unit = 'kg'), 0)::int as kg
        from pickups group by status) t),
      'runAgg', (select coalesce(json_agg(t), '[]'::json) from (
        select status, count(*)::int as n from runs group by status) t),
      'partners', (select count(*)::int from partners),
      'destinations', (select count(*)::int from destinations),
      'roleAgg', (select coalesce(json_agg(t), '[]'::json) from (
        select role, count(*)::int as n from profiles group by role) t),
      'trend', (select coalesce(json_agg(t), '[]'::json) from (
        select to_char(delivered_at, 'YYYY-MM-DD') as day, count(*)::int as deliveries,
          coalesce(sum(quantity) filter (where quantity_unit = 'servings'), 0)::int as servings,
          coalesce(sum(quantity) filter (where quantity_unit = 'kg'), 0)::int as kg
        from pickups
        where status = 'delivered'
          and delivered_at >= ${from.toISOString()}::timestamptz
          and delivered_at <= ${to.toISOString()}::timestamptz
        group by 1 order by 1) t),
      'partnerBreakdown', (select coalesce(json_agg(t), '[]'::json) from (
        select p.partner_id as "partnerId",
          coalesce(pa.name, 'Unknown partner') as "partnerName",
          coalesce(sum(p.quantity) filter (where p.quantity_unit = 'servings'), 0)::int as servings,
          coalesce(sum(p.quantity) filter (where p.quantity_unit = 'kg'), 0)::int as kg,
          count(*)::int as count
        from pickups p left join partners pa on pa.id = p.partner_id
        where p.status = 'delivered'
        group by p.partner_id, pa.name order by count(*) desc) t),
      'destinationBreakdown', (select coalesce(json_agg(t), '[]'::json) from (
        select rs.destination_id as "destinationId",
          coalesce(d.name, 'Ad-hoc') as "destinationName",
          count(*)::int as "completedDropCount"
        from run_stops rs
          left join runs r on r.id = rs.run_id
          left join destinations d on d.id = rs.destination_id
        where rs.kind = 'drop' and rs.status = 'done'
        group by rs.destination_id, d.name order by count(*) desc) t)
    ) as data
  `);

  const raw = (result as unknown as { data: unknown }[])[0]?.data;
  const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as {
    pickupAgg: PickupStatusAggRow<PickupStatus>[];
    runAgg: { status: RunStatus; n: number }[];
    partners: number;
    destinations: number;
    roleAgg: { role: string; n: number }[];
    trend: { day: string; deliveries: number; servings: number; kg: number }[];
    partnerBreakdown: AdminDashboardData["partnerBreakdown"];
    destinationBreakdown: AdminDashboardData["destinationBreakdown"];
  };

  const byDay = new Map(data.trend.map((r) => [r.day, r]));
  const trend: TrendPoint[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = byDay.get(key);
    trend.push({
      date: key,
      deliveries: r?.deliveries ?? 0,
      servings: r?.servings ?? 0,
      kg: r?.kg ?? 0,
    });
  }

  return {
    overview: {
      impact: extractDeliveredImpact(data.pickupAgg),
      pickups: bucketPickupStatuses(data.pickupAgg),
      runs: bucketRunStatuses(data.runAgg),
      partners: data.partners,
      destinations: data.destinations,
      volunteers: data.roleAgg.find((r) => r.role === "volunteer")?.n ?? 0,
      drivers: data.roleAgg.find((r) => r.role === "driver")?.n ?? 0,
    },
    trend,
    partnerBreakdown: data.partnerBreakdown,
    destinationBreakdown: data.destinationBreakdown,
  };
}
