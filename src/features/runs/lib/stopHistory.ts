import type { StopKind } from "@/config/constants";

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
 * UX-14 (admin run detail History): run_stops has no from/actor audit trail —
 * unlike status_events for pickups, a stop only carries its CURRENT status
 * plus `doneAt` (set when marked done, cleared to null otherwise; see
 * runActions.overrideStopStatus/markStopDone). Rather than fabricate an
 * actor/from this schema doesn't record, this surfaces the one genuinely new,
 * previously-invisible piece of data — completion time — as a chronological
 * timeline of completed stops. Pure — unit tested.
 */
export function buildStopTimeline(stops: StopTimelineInput[]): StopTimelineRow[] {
  return stops
    .filter((s): s is StopTimelineInput & { doneAt: Date } => s.doneAt !== null)
    .sort((a, b) => a.doneAt.getTime() - b.doneAt.getTime())
    .map((s) => ({ id: s.id, kind: s.kind, address: s.address, doneAt: s.doneAt }));
}
