import { logger } from "@/lib/logger";

/**
 * Bound a promise so a slow dependency can never hang the caller (production-discipline
 * §3, "degrade, don't die"). If `promise` doesn't settle within `ms`, resolve to
 * `fallback` and log — the caller shows an empty/degraded state instead of blocking.
 *
 * Used by the admin dashboard: its aggregates are individually sub-millisecond on real
 * data, but a cold/contended DB connection can still stall one read for tens of seconds;
 * without a bound, that one read blocks the whole SSR (a 74s render was observed against
 * a cold remote DB). This caps each read's contribution to the page.
 *
 * The timer never rejects (so the caller's own error handling still sees real failures
 * via the underlying promise). The winning `fallback` is a resolve, not a throw.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      logger.error("withTimeout: dependency exceeded budget, using fallback", {
        label,
        ms,
      });
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
