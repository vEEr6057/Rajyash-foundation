"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getSession } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { runPingsRepo } from "@/server/db/repositories/runPings";
import { haversineMeters, estimateEtaMinutes, straightLineRoute } from "@/lib/routing";
import { fetchOsrmRoute } from "@/lib/routing.server";
import { partnersRepo } from "@/server/db/repositories/partners";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { geocodeDestinationAddress } from "@/features/admin/actions/destinationActions";
import {
  allStopsDone,
  canRunTransition,
  canStopTransition,
} from "@/features/runs/lib/runStatusMachine";
import { logger } from "@/lib/logger";
import { inngest } from "@/server/inngest/client";
import {
  buildRunAssignedEventId,
  buildRunCompletedEventId,
} from "@/server/notifications/events";
import { ROUTES, NOTIFICATION_EVENTS, type RunStatus, type StopStatus } from "@/config/constants";
import type { NewRun } from "@/server/db/schema";
import {
  createRunSchema,
  editRunSchema,
  addPickupStopSchema,
  addDropStopSchema,
  reorderSchema,
  type CreateRunInput,
  type EditRunInput,
  type AddPickupStopInput,
  type AddDropStopInput,
  type ReorderInput,
} from "@/features/runs/validations/run";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}
async function admin() {
  return requireRole(["admin"]);
}

function revalidateRuns(id?: string) {
  revalidatePath(ROUTES.adminRuns);
  if (id) revalidatePath(ROUTES.adminRun(id));
}

/**
 * B4 integrity guard: a run's stop list may only change while the run is `planned`
 * or `active`. Mutating the stops of a completed/cancelled run silently corrupts
 * reports (run/completed was already emitted). Returns a fail Result to short-circuit
 * on, or null when the run is mutable. Fetches the run row once so callers reuse it.
 */
async function guardRunMutable(
  runId: string,
): Promise<{ ok: false; code: string; message: string } | null> {
  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  if (run.status !== "planned" && run.status !== "active") {
    return fail(
      "CONFLICT",
      "This run is completed/cancelled — stops can no longer change.",
    );
  }
  return null;
}

// ── Run notification emits (B3) ─────────────────────────────────────
// After-commit, best-effort — a failed emit must never fail the write (mirrors the
// pickupActions emit pattern). Idempotency + recipient/copy resolution live in the
// Inngest function; here we only fire the event.
async function emitRunAssigned(runId: string, driverId: string) {
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.runAssigned,
      data: { runId, driverId, eventId: buildRunAssignedEventId(runId, driverId) },
    });
  } catch (e) {
    logger.error("inngest emit run/assigned failed", { runId, driverId, err: String(e) });
  }
}

async function emitRunCompleted(runId: string) {
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.runCompleted,
      data: { runId, eventId: buildRunCompletedEventId(runId) },
    });
  } catch (e) {
    logger.error("inngest emit run/completed failed", { runId, err: String(e) });
  }
}

// ── RUN-01: create run ──────────────────────────────────────────────
export async function createRun(input: CreateRunInput): Promise<Result<{ id: string }>> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = createRunSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  try {
    const row = await runsRepo.create({
      // Empty string (form's "No driver yet") must become null — "" is a non-null
      // value that fails the driver FK. ?? only catches null/undefined, not "".
      slot: d.slot,
      runDate: d.runDate,
      driverId: d.driverId || null,
      createdBy: adminId,
      status: "planned",
    });
    // NOT (B3): if created with a driver, tell them right away (after-commit, best-effort).
    if (d.driverId) await emitRunAssigned(row.id, d.driverId);
    revalidateRuns(row.id);
    return { ok: true, id: row.id };
  } catch (e) {
    logger.error("createRun failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not create run.");
  }
}

// ── RUN-01: assign driver ──────────────────────────────────────────
export async function assignDriver(runId: string, driverId: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (!runId || !driverId) return fail("VALIDATION", "Run ID and driver ID required.");
  const row = await runsRepo.assignDriver(runId, driverId);
  if (!row) return fail("NOT_FOUND", "Run not found.");
  // NOT (B3): notify the assigned driver (after-commit, best-effort).
  await emitRunAssigned(runId, driverId);
  revalidateRuns(runId);
  return { ok: true };
}

// ── RUN-04: edit run (slot/date/driver) ────────────────────────────
export async function editRun(runId: string, input: EditRunInput): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = editRunSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  const update: Partial<NewRun> = {};
  if (parsed.data.slot !== undefined) update.slot = parsed.data.slot;
  if (parsed.data.runDate !== undefined) update.runDate = parsed.data.runDate;
  // "" (no driver) → null to satisfy the driver FK.
  const newDriverId =
    parsed.data.driverId !== undefined ? parsed.data.driverId || null : undefined;
  if (newDriverId !== undefined) update.driverId = newDriverId;
  await runsRepo.update(runId, update);
  // NOT (B3): only a CHANGE to a NEW (non-null) driver notifies — not clears or no-ops.
  if (newDriverId && newDriverId !== run.driverId) {
    await emitRunAssigned(runId, newDriverId);
  }
  revalidateRuns(runId);
  return { ok: true };
}

// ── RUN-02: add pickup stop ────────────────────────────────────────
export async function addPickupStop(input: AddPickupStopInput): Promise<Result<{ id: string }>> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = addPickupStopSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const guard = await guardRunMutable(d.runId);
  if (guard) return guard;
  const partner = await partnersRepo.getById(d.partnerId);
  if (!partner) return fail("NOT_FOUND", "Partner not found.");
  try {
    const stop = await runStopsRepo.add({
      runId: d.runId,
      seq: d.seq,
      kind: "pickup",
      partnerId: d.partnerId,
      address: partner.address ?? partner.name,
      lat: null,
      lng: null,
      notes: d.notes ?? null,
    });
    revalidateRuns(d.runId);
    return { ok: true, id: stop.id };
  } catch (e) {
    logger.error("addPickupStop failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not add stop.");
  }
}

// ── RUN-03: add drop stop (saved destination OR ad-hoc) ────────────
export async function addDropStop(input: AddDropStopInput): Promise<Result<{ id: string }>> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = addDropStopSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const guard = await guardRunMutable(d.runId);
  if (guard) return guard;

  let lat: number | null = d.lat ?? null;
  let lng: number | null = d.lng ?? null;
  let address: string | null = d.address ?? null;
  let destinationId: string | null = d.destinationId ?? null;

  if (d.destinationId) {
    const dest = await destinationsRepo.getById(d.destinationId);
    if (!dest) return fail("NOT_FOUND", "Destination not found.");
    lat = dest.lat;
    lng = dest.lng;
    address = dest.name + (dest.area ? `, ${dest.area}` : "") + `, ${dest.city}`;
    destinationId = dest.id;
  } else if (d.address) {
    // Ad-hoc: geocode to lat/lng (geocodeDestinationAddress returns { lat, lng } | null).
    const geo = await geocodeDestinationAddress(d.address);
    if (!geo) return fail("GEOCODE_FAILED", "Address could not be geocoded — try a more specific one.");
    lat = geo.lat;
    lng = geo.lng;
    address = d.address;
  }

  try {
    const stop = await runStopsRepo.add({
      runId: d.runId,
      seq: d.seq,
      kind: "drop",
      destinationId,
      address,
      lat,
      lng,
      notes: d.notes ?? null,
    });
    revalidateRuns(d.runId);
    return { ok: true, id: stop.id };
  } catch (e) {
    logger.error("addDropStop failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not add drop stop.");
  }
}

// ── RUN-04: reorder stops ──────────────────────────────────────────
export async function reorderStops(input: ReorderInput): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  const guard = await guardRunMutable(parsed.data.runId);
  if (guard) return guard;
  try {
    await runStopsRepo.reorder(parsed.data.items);
    revalidateRuns(parsed.data.runId);
    return { ok: true };
  } catch (e) {
    logger.error("reorderStops failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not reorder stops.");
  }
}

// ── RUN-04: remove stop ────────────────────────────────────────────
export async function removeStop(stopId: string, runId: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (!stopId) return fail("VALIDATION", "Stop ID required.");
  const guard = await guardRunMutable(runId);
  if (guard) return guard;
  await runStopsRepo.remove(stopId);
  revalidateRuns(runId);
  return { ok: true };
}

// ── RUN-07: mark stop done (driver OR admin) ───────────────────────
export async function markStopDone(
  stopId: string,
): Promise<Result<{ runCompleted: boolean }>> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  const isAdmin = session.role === "admin";
  const isDriver = session.role === "driver";
  const isVolunteer = session.role === "volunteer";
  if (!isAdmin && !isDriver && !isVolunteer) {
    return fail("FORBIDDEN", "Drivers, admins, and volunteers only.");
  }

  const stop = await runStopsRepo.getById(stopId);
  if (!stop) return fail("NOT_FOUND", "Stop not found.");

  const run = await runsRepo.getById(stop.runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");

  if (isDriver && run.driverId !== session.userId) {
    return fail("FORBIDDEN", "Not your run.");
  }
  // DEL-02: any volunteer present can confirm a drop on an ACTIVE run.
  if (isVolunteer && run.status !== "active") {
    return fail("FORBIDDEN", "Run is not active.");
  }

  if (!canStopTransition(stop.status, "done")) {
    return fail("CONFLICT", "Stop is already done or skipped.");
  }

  await runStopsRepo.setStopStatusWithEvent({
    id: stopId,
    status: "done",
    doneAt: new Date(),
    actorId: session.userId,
    fromStatus: stop.status,
  });

  // Auto-complete the run when all stops are done/skipped — but only via a legal run
  // transition. A driver can mark stops on a `planned` run; planned→completed skips
  // `active` and isn't valid, so the stop is marked done without auto-completing.
  const allStops = await runStopsRepo.getByRunId(stop.runId);
  const updated = allStops.map((s) =>
    s.id === stopId ? { ...s, status: "done" as const } : s,
  );
  const runCompleted =
    allStopsDone(updated) && canRunTransition(run.status, "completed");
  if (runCompleted) {
    await runsRepo.setRunStatus(stop.runId, "completed");
    await runPingsRepo.purgeForRun(stop.runId); // TRK-05: ephemeral trail
    await emitRunCompleted(stop.runId); // NOT (B3): admins learn of completion
  }

  revalidateRuns(stop.runId);
  revalidatePath(ROUTES.driverRun);
  // dispatch-model-v2: volunteers confirm drops from the distributions list.
  revalidatePath(ROUTES.distributions);
  return { ok: true, runCompleted };
}

// ── RUN-08: admin override stop status ─────────────────────────────
export async function overrideStopStatus(stopId: string, status: StopStatus): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const stop = await runStopsRepo.getById(stopId);
  if (!stop) return fail("NOT_FOUND", "Stop not found.");
  // B4: a closed run's stop statuses are final. Reverting a stop to `pending` on a
  // completed run would strand it (VALID_RUN_TRANSITIONS.completed = [] — no reopen).
  const run = await runsRepo.getById(stop.runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  if (run.status === "completed" || run.status === "cancelled") {
    return fail("CONFLICT", "This run is closed — stop statuses are final.");
  }
  await runStopsRepo.setStopStatusWithEvent({
    id: stopId,
    status,
    doneAt: status === "done" ? new Date() : null,
    actorId: adminId,
    fromStatus: stop.status,
  });
  const allStops = await runStopsRepo.getByRunId(stop.runId);
  const updated = allStops.map((s) => (s.id === stopId ? { ...s, status } : s));
  if (allStopsDone(updated) && status !== "pending") {
    if (canRunTransition(run.status, "completed")) {
      await runsRepo.setRunStatus(stop.runId, "completed");
      await runPingsRepo.purgeForRun(stop.runId); // TRK-05
      await emitRunCompleted(stop.runId); // NOT (B3)
    }
  }
  revalidateRuns(stop.runId);
  return { ok: true };
}

// ── RUN-08: admin override run status ──────────────────────────────
export async function setRunStatus(runId: string, status: RunStatus): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  if (!canRunTransition(run.status, status)) {
    return fail("CONFLICT", `Cannot transition ${run.status} → ${status}.`);
  }
  await runsRepo.setRunStatus(runId, status);
  if (status === "completed" || status === "cancelled") {
    await runPingsRepo.purgeForRun(runId); // TRK-05: ephemeral trail
  }
  // NOT (B3): admins learn of completion (cancelled runs are not notified).
  if (status === "completed") await emitRunCompleted(runId);
  revalidateRuns(runId);
  return { ok: true };
}

// ── delete run (admin, planned only) ───────────────────────────────
export async function deleteRun(runId: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const run = await runsRepo.getById(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  // Only planned or cancelled runs are deletable. An active run must be cancelled
  // first (its driver is mid-drive); a completed run is a permanent record (B4).
  if (run.status === "active")
    return fail("CONFLICT", "Cancel the run before deleting it.");
  if (run.status === "completed")
    return fail("CONFLICT", "Completed runs are kept for reporting.");
  await runsRepo.delete(runId);
  revalidatePath(ROUTES.adminRuns);
  return { ok: true };
}

/**
 * TRK-06: route + ETA from the driver's current position to the next PENDING stop
 * (lowest seq with coords). OSRM road route, else straight-line + haversine ETA.
 * Auth mirrors getLatestRunPing: admin, the run's driver, or a volunteer.
 */
export async function getRunRoute(
  runId: string,
  fromLat: number,
  fromLng: number,
): Promise<
  Result<{ coords: [number, number][]; etaMinutes: number; source: "osrm" | "line" }>
> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return fail("VALIDATION", "Invalid coordinates.");
  }
  const run = await runsRepo.getRunWithStops(runId);
  if (!run) return fail("NOT_FOUND", "Run not found.");
  const allowed =
    session.role === "admin" ||
    session.role === "volunteer" ||
    run.driverId === session.userId;
  if (!allowed) return fail("FORBIDDEN", "Not allowed to view this route.");

  const next = run.stops
    .filter((s) => s.status === "pending" && s.lat !== null && s.lng !== null)
    .sort((a, b) => a.seq - b.seq)[0];
  const from = { lat: fromLat, lng: fromLng };
  if (!next) return { ok: true, coords: [], etaMinutes: 0, source: "line" };

  const to = { lat: next.lat as number, lng: next.lng as number };
  const osrm = await fetchOsrmRoute(from, to);
  if (osrm) {
    return {
      ok: true,
      coords: osrm.coords,
      etaMinutes: Math.max(1, Math.round(osrm.durationSec / 60)),
      source: "osrm",
    };
  }
  return {
    ok: true,
    coords: straightLineRoute(from, to),
    etaMinutes: estimateEtaMinutes(haversineMeters(from, to)),
    source: "line",
  };
}
