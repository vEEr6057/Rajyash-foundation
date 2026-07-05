import type { StopKind, StopStatus } from "@/config/constants";

export interface StopTimelineInput {
  id: string;
  kind: StopKind;
  address: string | null;
  doneAt: Date | null;
}

export interface StopTimelineRow {
  id: string;
  kind: StopKind;
  address: string | null;
  doneAt: Date;
}

/**
 * UX-14 v1 (admin run detail History, pre stop_status_events): run_stops had
 * no from/actor audit trail — a stop only carried its CURRENT status plus
 * `doneAt`. Kept as the legacy fallback buildStopHistory uses for stops with
 * zero recorded events (rows from before stop_status_events existed). Pure —
 * unit tested.
 */
export function buildStopTimeline(stops: StopTimelineInput[]): StopTimelineRow[] {
  return stops
    .filter((s): s is StopTimelineInput & { doneAt: Date } => s.doneAt !== null)
    .sort((a, b) => a.doneAt.getTime() - b.doneAt.getTime())
    .map((s) => ({ id: s.id, kind: s.kind, address: s.address, doneAt: s.doneAt }));
}

/** Shape stopStatusEventsRepo.listForStopIds rows already have — kept minimal
 * on purpose, mirrors StatusEventLike for pickups (see admin/lib/statusHistory.ts). */
export interface StopStatusEventLike {
  id: string;
  stopId: string;
  fromStatus: StopStatus | null;
  toStatus: StopStatus;
  actorId: string;
  createdAt: Date;
}

export interface StopHistoryRow {
  id: string;
  stopId: string;
  kind: StopKind;
  address: string | null;
  /** null on a stop's first transition, and always null on a legacy fallback row
   * (no prior status was ever recorded for it). */
  fromStatus: StopStatus | null;
  toStatus: StopStatus;
  /** null only for a legacy fallback row — no actor was ever recorded. */
  actorName: string | null;
  createdAt: Date;
  /** true when this row is the pre-stop_status_events completion-time fallback,
   * not a real recorded transition. */
  isLegacy: boolean;
}

/**
 * UX-14 v2 (admin run detail History, full audit trail): builds the
 * chronological from→to·actor·time transition list per stop, mirroring
 * buildStatusHistory for pickups. A stop with NO stop_status_events rows
 * (legacy — created/completed before this migration shipped) falls back to
 * the old completion-time-only line via buildStopTimeline, so old runs still
 * show something instead of going blank. Pure — unit tested.
 */
export function buildStopHistory(
  stops: StopTimelineInput[],
  events: StopStatusEventLike[],
  actorNameById: Map<string, string>,
  unknownActorLabel: string,
): StopHistoryRow[] {
  const stopById = new Map(stops.map((s) => [s.id, s]));
  const eventStopIds = new Set(events.map((e) => e.stopId));

  const transitionRows: StopHistoryRow[] = events.map((e) => {
    const stop = stopById.get(e.stopId);
    return {
      id: e.id,
      stopId: e.stopId,
      kind: stop?.kind ?? "pickup",
      address: stop?.address ?? null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorName: actorNameById.get(e.actorId) ?? unknownActorLabel,
      createdAt: e.createdAt,
      isLegacy: false,
    };
  });

  const legacyRows: StopHistoryRow[] = buildStopTimeline(
    stops.filter((s) => !eventStopIds.has(s.id)),
  ).map((s) => ({
    id: s.id,
    stopId: s.id,
    kind: s.kind,
    address: s.address,
    fromStatus: null,
    toStatus: "done" as const,
    actorName: null,
    createdAt: s.doneAt,
    isLegacy: true,
  }));

  return [...transitionRows, ...legacyRows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}
