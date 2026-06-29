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
