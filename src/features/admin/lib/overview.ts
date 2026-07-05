import type { PickupStatus, RunStatus } from "@/config/constants";

/** Raw per-status count rows from a GROUP BY query. */
export interface StatusCount<S extends string> {
  status: S;
  n: number;
}

export interface PickupBuckets {
  total: number;
  open: number; // requested
  inProgress: number; // accepted | en_route | picked_up
  delivered: number;
  cancelled: number;
}

/**
 * Collapse per-status pickup counts into the operational buckets the overview
 * shows. Pure — unit tested. Tolerates missing statuses (treats as 0).
 */
export function bucketPickupStatuses(rows: StatusCount<PickupStatus>[]): PickupBuckets {
  const by = (s: PickupStatus) => rows.find((r) => r.status === s)?.n ?? 0;
  const open = by("requested");
  const inProgress = by("accepted") + by("en_route") + by("picked_up");
  const delivered = by("delivered");
  const cancelled = by("cancelled");
  return {
    total: open + inProgress + delivered + cancelled,
    open,
    inProgress,
    delivered,
    cancelled,
  };
}

export interface RunBuckets {
  total: number;
  active: number;
  planned: number;
  completed: number;
}

/** Collapse per-status run counts. Pure — unit tested. */
export function bucketRunStatuses(rows: StatusCount<RunStatus>[]): RunBuckets {
  const by = (s: RunStatus) => rows.find((r) => r.status === s)?.n ?? 0;
  const active = by("active");
  const planned = by("planned");
  const completed = by("completed");
  const cancelled = by("cancelled");
  return { total: active + planned + completed + cancelled, active, planned, completed };
}

/** A pickup-status GROUP BY row carrying the quantity sums too (UX-11 merge). */
export interface PickupStatusAggRow<S extends string> extends StatusCount<S> {
  servings: number;
  kg: number;
}

export interface DeliveredImpact {
  servings: number;
  kg: number;
  count: number;
}

/**
 * UX-11: the all-time impact tile (servings/kg/count of DELIVERED pickups) used
 * to be its own round trip (pickupsRepo.impactReport with epoch..year-9999
 * bounds — equivalent to "no date filter"). Folded into the same GROUP BY
 * status query the pickup-status buckets already run, so this just picks the
 * 'delivered' row back out. Pure — unit tested.
 */
export function extractDeliveredImpact(
  rows: PickupStatusAggRow<PickupStatus>[],
): DeliveredImpact {
  const delivered = rows.find((r) => r.status === "delivered");
  return {
    servings: delivered?.servings ?? 0,
    kg: delivered?.kg ?? 0,
    count: delivered?.n ?? 0,
  };
}

export interface DirectoryCounts {
  partners: number;
  destinations: number;
}

/**
 * UX-11: partners-count and destinations-count are two unrelated COUNT(*)s;
 * merged into one round trip via a UNION ALL (see getAdminOverview) tagged by
 * `kind`. Pure — unit tested.
 */
export function extractDirectoryCounts(rows: { kind: string; n: number }[]): DirectoryCounts {
  const by = (k: string) => rows.find((r) => r.kind === k)?.n ?? 0;
  return { partners: by("partners"), destinations: by("destinations") };
}
