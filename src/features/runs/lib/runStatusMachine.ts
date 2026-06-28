import {
  VALID_RUN_TRANSITIONS,
  VALID_STOP_TRANSITIONS,
  type RunStatus,
  type StopStatus,
} from "@/config/constants";

/** Pure run status-machine helpers (RUN-07, RUN-08). No I/O — unit-testable. */

export function canRunTransition(from: RunStatus, to: RunStatus): boolean {
  return VALID_RUN_TRANSITIONS[from].includes(to);
}

export function nextRunStatus(from: RunStatus): RunStatus | null {
  const forward = VALID_RUN_TRANSITIONS[from].filter((s) => s !== "cancelled");
  return forward[0] ?? null;
}

export function canStopTransition(from: StopStatus, to: StopStatus): boolean {
  return VALID_STOP_TRANSITIONS[from].includes(to);
}

export function nextStopStatus(from: StopStatus): StopStatus | null {
  // Forward advancement = done (skipped is an admin override, not the default).
  const forward = VALID_STOP_TRANSITIONS[from].filter((s) => s !== "skipped");
  return forward[0] ?? null;
}

/**
 * True when every stop is done or skipped — the trigger to auto-complete a run.
 * An empty stop list never auto-completes (a run with no stops isn't "done").
 */
export function allStopsDone(stops: Array<{ status: StopStatus }>): boolean {
  if (stops.length === 0) return false;
  return stops.every((s) => s.status === "done" || s.status === "skipped");
}
