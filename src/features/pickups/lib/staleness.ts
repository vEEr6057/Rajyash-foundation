/**
 * Pure helpers for the live-tracking stale indicator (TRK-03 / D-07).
 * `now` is a parameter (not Date.now() inline) so tests are deterministic.
 */
import { STALE_THRESHOLD_MS } from "@/config/constants";

/** True when the newest ping is at/older than the threshold (default 90s). */
export function isStale(
  createdAt: Date | string,
  now: number = Date.now(),
  thresholdMs: number = STALE_THRESHOLD_MS,
): boolean {
  const t =
    typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  return now - t >= thresholdMs;
}

/** Human "last updated" label derived from the newest ping's createdAt. */
export function formatLastSeen(
  createdAt: Date | string,
  now: number = Date.now(),
): string {
  const t =
    typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
