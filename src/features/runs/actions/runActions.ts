"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getSession } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { partnersRepo } from "@/server/db/repositories/partners";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { geocodeDestinationAddress } from "@/features/admin/actions/destinationActions";
import {
  allStopsDone,
  canRunTransition,
  canStopTransition,
} from "@/features/runs/lib/runStatusMachine";
import { logger } from "@/lib/logger";
import { ROUTES, type RunStatus, type StopStatus } from "@/config/constants";
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
      slot: d.slot,
      runDate: d.runDate,
      driverId: d.driverId ?? null,
      createdBy: adminId,
      status: "planned",
    });
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
  if (parsed.data.driverId !== undefined) update.driverId = parsed.data.driverId;
  await runsRepo.update(runId, update);
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
  await runStopsRepo.remove(stopId);
  revalidateRuns(runId);
  return { ok: true };
}

// ── RUN-07: mark stop done (driver OR admin) ───────────────────────
export async function markStopDone(stopId: string): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  const isAdmin = session.role === "admin";
  const isDriver = session.role === "driver";
  if (!isAdmin && !isDriver) return fail("FORBIDDEN", "Drivers and admins only.");

  const stop = await runStopsRepo.getById(stopId);
  if (!stop) return fail("NOT_FOUND", "Stop not found.");

  if (isDriver) {
    const run = await runsRepo.getById(stop.runId);
    if (!run) return fail("NOT_FOUND", "Run not found.");
    if (run.driverId !== session.userId) return fail("FORBIDDEN", "Not your run.");
  }

  if (!canStopTransition(stop.status, "done")) {
    return fail("CONFLICT", "Stop is already done or skipped.");
  }

  await runStopsRepo.setStopStatus(stopId, "done", new Date());

  // Auto-complete the run when all stops are done/skipped.
  const allStops = await runStopsRepo.getByRunId(stop.runId);
  const updated = allStops.map((s) =>
    s.id === stopId ? { ...s, status: "done" as const } : s,
  );
  if (allStopsDone(updated)) {
    await runsRepo.setRunStatus(stop.runId, "completed");
  }

  revalidateRuns(stop.runId);
  revalidatePath(ROUTES.driverRun);
  return { ok: true };
}

// ── RUN-08: admin override stop status ─────────────────────────────
export async function overrideStopStatus(stopId: string, status: StopStatus): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const stop = await runStopsRepo.getById(stopId);
  if (!stop) return fail("NOT_FOUND", "Stop not found.");
  await runStopsRepo.setStopStatus(stopId, status, status === "done" ? new Date() : null);
  const allStops = await runStopsRepo.getByRunId(stop.runId);
  const updated = allStops.map((s) => (s.id === stopId ? { ...s, status } : s));
  if (allStopsDone(updated) && status !== "pending") {
    const run = await runsRepo.getById(stop.runId);
    if (run && canRunTransition(run.status, "completed")) {
      await runsRepo.setRunStatus(stop.runId, "completed");
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
  if (run.status !== "planned") return fail("CONFLICT", "Only planned runs can be deleted.");
  await runsRepo.delete(runId);
  revalidatePath(ROUTES.adminRuns);
  return { ok: true };
}
