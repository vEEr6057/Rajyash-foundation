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
