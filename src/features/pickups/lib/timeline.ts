import type { Pickup, StatusEvent } from "@/server/db/schema";
import type { PickupStatus } from "@/config/constants";

/**
 * UX-7: the donor-facing timeline groups the 6 pickup statuses into 4 stages
 * (picked_up folds into "en route" — from the donor's seat there's nothing
 * meaningfully different between the two legs of the driver holding the food).
 */
export type TimelineStageKey = "posted" | "claimed" | "en_route" | "delivered" | "cancelled";

export interface TimelineStage {
  key: TimelineStageKey;
  /** When the pickup entered this stage; null = not reached yet. */
  timestamp: Date | null;
  isCurrent: boolean;
  isDone: boolean;
}

const STAGE_KEYS: readonly Exclude<TimelineStageKey, "cancelled">[] = [
  "posted",
  "claimed",
  "en_route",
  "delivered",
];

const STAGE_STATUSES: Record<Exclude<TimelineStageKey, "cancelled">, PickupStatus[]> = {
  posted: ["requested"],
  claimed: ["accepted"],
  en_route: ["en_route", "picked_up"],
  delivered: ["delivered"],
};

/**
 * Pure mapper: a pickup's status/timestamps + its append-only statusEvents log
 * → an ordered, donor-friendly timeline with the current stage flagged.
 * No hooks, no I/O — takes exactly what it needs (never a raw DB row set the
 * caller didn't already have).
 */
export function buildStatusTimeline(
  pickup: Pick<Pickup, "status" | "createdAt" | "updatedAt">,
  events: Pick<StatusEvent, "toStatus" | "createdAt">[],
): TimelineStage[] {
  if (pickup.status === "cancelled") {
    const cancelledEvent = events.find((e) => e.toStatus === "cancelled");
    return [
      { key: "posted", timestamp: pickup.createdAt, isCurrent: false, isDone: true },
      {
        key: "cancelled",
        // A donor-initiated cancel never writes a status_events row (it only
        // ever fires from "requested", before any transition exists) — fall
        // back to updatedAt (set at cancel time) so the stage still has a time.
        timestamp: cancelledEvent?.createdAt ?? pickup.updatedAt ?? null,
        isCurrent: true,
        isDone: true,
      },
    ];
  }

  const currentIndex = STAGE_KEYS.findIndex((key) =>
    STAGE_STATUSES[key].includes(pickup.status),
  );

  return STAGE_KEYS.map((key, index) => {
    const timestamp =
      key === "posted"
        ? pickup.createdAt
        : (events.find((e) => STAGE_STATUSES[key].includes(e.toStatus))?.createdAt ?? null);
    return {
      key,
      timestamp,
      isCurrent: index === currentIndex,
      isDone: index <= currentIndex,
    };
  });
}
