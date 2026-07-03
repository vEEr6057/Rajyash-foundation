import "server-only";

/**
 * Stable dedup id for an event (NOT-05). Used as notification_deliveries.event_id AND
 * the Inngest function-level idempotency key. `transition` is the LOGICAL event name
 * the caller passes — a stable dedup alias, not necessarily the stored pickup_status:
 *   "created"   -> `${pickupId}:created`   (createPickup writes no status_events row)
 *   "claimed"   -> `${pickupId}:claimed`   (DB status is "accepted"; "claimed" is the alias)
 *   "en_route" | "picked_up" | "delivered" | "cancelled" -> `${pickupId}:${transition}`
 */
export function buildEventId(transition: string, pickupId: string): string {
  return `${pickupId}:${transition}`;
}

/**
 * Dedup id for a run/assigned event (B3). Driver-qualified so re-assigning a run to a
 * NEW driver notifies that driver, while Inngest idempotency still kills duplicates of
 * the SAME assignment: `assigned:<runId>:<driverId>`.
 */
export function buildRunAssignedEventId(runId: string, driverId: string): string {
  return `assigned:${runId}:${driverId}`;
}

/** Dedup id for a run/completed event (B3): `run_completed:<runId>` (one per run). */
export function buildRunCompletedEventId(runId: string): string {
  return `run_completed:${runId}`;
}
