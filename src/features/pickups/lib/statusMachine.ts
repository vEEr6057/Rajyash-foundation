import { VALID_TRANSITIONS, type PickupStatus } from "@/config/constants";

/** Pure status-machine helpers (D-08). No I/O — unit-testable. */

export function canTransition(from: PickupStatus, to: PickupStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/** The next forward status a volunteer advances to, or null if terminal/none. */
export function nextStatus(from: PickupStatus): PickupStatus | null {
  // Forward path excludes "cancelled" (donor-only side transition).
  const forward = VALID_TRANSITIONS[from].filter((s) => s !== "cancelled");
  return forward[0] ?? null;
}

/** True when delivering — used to require a proof photo before this transition. */
export function isDeliveringTransition(
  from: PickupStatus,
  to: PickupStatus,
): boolean {
  return from === "picked_up" && to === "delivered";
}
