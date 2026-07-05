import type { PickupStatus } from "@/config/constants";

/** Shape statusEventsRepo.listForPickup rows already have — kept minimal on
 * purpose so this mapper doesn't need to import the Drizzle StatusEvent type. */
export interface StatusEventLike {
  id: string;
  fromStatus: PickupStatus | null;
  toStatus: PickupStatus;
  actorId: string;
  createdAt: Date;
}

export interface StatusHistoryRow {
  id: string;
  fromStatus: PickupStatus | null;
  toStatus: PickupStatus;
  actorName: string;
  createdAt: Date;
}

/**
 * UX-14: admin History section — chronological (oldest→newest) transition
 * rows with the actor's Clerk id resolved to a display name. Pure — unit
 * tested. Re-sorts defensively even though statusEventsRepo.listForPickup
 * already orders by createdAt asc (a future caller of this mapper shouldn't
 * have to know that, or re-break it silently).
 */
export function buildStatusHistory(
  events: StatusEventLike[],
  actorNameById: Map<string, string>,
  unknownActorLabel: string,
): StatusHistoryRow[] {
  return [...events]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorName: actorNameById.get(e.actorId) ?? unknownActorLabel,
      createdAt: e.createdAt,
    }));
}
