"use server";

import { requireRole, getSession } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runPingsRepo } from "@/server/db/repositories/runPings";
import { logger } from "@/lib/logger";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}

/**
 * TRK-05: record one GPS ping from the assigned driver. Mirrors recordPing:
 * 1) driver role  2) assigned driver of THIS run  3) run active  4) coord range.
 * The browser never anon-writes — every write goes through this action.
 */
export async function recordRunPing(
  runId: string,
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await requireRole(["driver"]));
  } catch {
    return fail("FORBIDDEN", "Only drivers can share run location.");
  }

  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180 ||
    (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0))
  ) {
    return fail("VALIDATION", "Invalid coordinates.");
  }

  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  if (run.driverId !== userId) return fail("FORBIDDEN", "Not your run.");
  if (run.status !== "active") return fail("INACTIVE", "Run is not active.");

  try {
    await runPingsRepo.insert({
      runId,
      driverId: userId,
      lat,
      lng,
      accuracy: accuracy ?? null,
    });
    return { ok: true };
  } catch (e) {
    logger.error("recordRunPing failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not record ping.");
  }
}

/**
 * TRK-05 polling fallback: newest ping for a run. Gated to admin, the run's
 * assigned driver, or a volunteer (DISPATCH-CONTEXT: coordinator/driver/volunteer
 * can watch). Restaurant-specific watcher views are deferred (multi-partner runs).
 */
export async function getLatestRunPing(runId: string): Promise<
  Result<{
    ping: {
      lat: number;
      lng: number;
      accuracy: number | null;
      createdAt: string;
    } | null;
  }>
> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");

  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");

  const allowed =
    session.role === "admin" ||
    session.role === "volunteer" ||
    run.driverId === session.userId;
  if (!allowed) return fail("FORBIDDEN", "Not authorised to view this run's location.");

  const latest = await runPingsRepo.latestForRun(runId);
  return {
    ok: true,
    ping: latest
      ? {
          lat: latest.lat,
          lng: latest.lng,
          accuracy: latest.accuracy,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
  };
}
