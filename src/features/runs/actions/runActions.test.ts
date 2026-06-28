import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getSession: vi.fn(),
  // runs repo
  runCreate: vi.fn(),
  runGetById: vi.fn(),
  runAssignDriver: vi.fn(),
  runSetStatus: vi.fn(),
  runUpdate: vi.fn(),
  runDelete: vi.fn(),
  // run stops repo
  stopAdd: vi.fn(),
  stopGetById: vi.fn(),
  stopGetByRunId: vi.fn(),
  stopRemove: vi.fn(),
  stopReorder: vi.fn(),
  stopSetStatus: vi.fn(),
  // others
  partnerGetById: vi.fn(),
  destGetById: vi.fn(),
  geocode: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  requireRole: (...a: unknown[]) => h.requireRole(...a),
  getSession: (...a: unknown[]) => h.getSession(...a),
  AuthError: class AuthError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/server/db/repositories/runs", () => ({
  runsRepo: {
    create: (...a: unknown[]) => h.runCreate(...a),
    getById: (...a: unknown[]) => h.runGetById(...a),
    assignDriver: (...a: unknown[]) => h.runAssignDriver(...a),
    setRunStatus: (...a: unknown[]) => h.runSetStatus(...a),
    update: (...a: unknown[]) => h.runUpdate(...a),
    delete: (...a: unknown[]) => h.runDelete(...a),
  },
}));
vi.mock("@/server/db/repositories/runStops", () => ({
  runStopsRepo: {
    add: (...a: unknown[]) => h.stopAdd(...a),
    getById: (...a: unknown[]) => h.stopGetById(...a),
    getByRunId: (...a: unknown[]) => h.stopGetByRunId(...a),
    remove: (...a: unknown[]) => h.stopRemove(...a),
    reorder: (...a: unknown[]) => h.stopReorder(...a),
    setStopStatus: (...a: unknown[]) => h.stopSetStatus(...a),
  },
}));
vi.mock("@/server/db/repositories/partners", () => ({
  partnersRepo: { getById: (...a: unknown[]) => h.partnerGetById(...a) },
}));
vi.mock("@/server/db/repositories/destinations", () => ({
  destinationsRepo: { getById: (...a: unknown[]) => h.destGetById(...a) },
}));
vi.mock("@/features/admin/actions/destinationActions", () => ({
  geocodeDestinationAddress: (...a: unknown[]) => h.geocode(...a),
}));

import {
  createRun,
  assignDriver,
  addPickupStop,
  addDropStop,
  reorderStops,
  removeStop,
  overrideStopStatus,
  setRunStatus,
  markStopDone,
} from "./runActions";

beforeEach(() => {
  Object.values(h).forEach((fn) => fn.mockReset());
  h.requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
});

describe("admin auth gates — FORBIDDEN without admin role", () => {
  const cases: Array<[string, () => Promise<{ ok: boolean; code?: string }>]> = [
    ["createRun", () => createRun({ slot: "morning", runDate: new Date() } as never)],
    ["assignDriver", () => assignDriver("r1", "d1")],
    ["addPickupStop", () => addPickupStop({ runId: "r1", partnerId: "p1", seq: 1 } as never)],
    ["addDropStop", () => addDropStop({ runId: "r1", seq: 1, destinationId: "d1" } as never)],
    ["reorderStops", () => reorderStops({ runId: "r1", items: [{ id: "s1", seq: 1 }] })],
    ["removeStop", () => removeStop("s1", "r1")],
    ["overrideStopStatus", () => overrideStopStatus("s1", "done")],
    ["setRunStatus", () => setRunStatus("r1", "active")],
  ];
  it.each(cases)("%s returns FORBIDDEN", async (_name, call) => {
    h.requireRole.mockRejectedValue(new Error("no"));
    const res = await call();
    expect(res.ok).toBe(false);
    expect(res.code).toBe("FORBIDDEN");
  });
});

describe("markStopDone — driver ownership", () => {
  it("blocks a driver who doesn't own the run", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-2", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    const res = await markStopDone("s1");
    expect(!res.ok && (res as { code: string }).code).toBe("FORBIDDEN");
  });

  it("lets an admin mark any stop done", async () => {
    h.getSession.mockResolvedValue({ userId: "admin-1", role: "admin" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.stopSetStatus.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "done" }]);
    const res = await markStopDone("s1");
    expect(res.ok).toBe(true);
  });
});

describe("markStopDone — auto-complete", () => {
  it("completes the run when the last stop is marked done", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatus.mockResolvedValue({ id: "s1" });
    // After marking s1 done, all stops (s1 done via optimistic, s2 already done) → complete
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "done" }]);
    await markStopDone("s1");
    expect(h.runSetStatus).toHaveBeenCalledWith("r1", "completed");
  });

  it("does NOT complete the run when a stop is still pending", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatus.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "pending" }]);
    await markStopDone("s1");
    expect(h.runSetStatus).not.toHaveBeenCalled();
  });
});

describe("addDropStop — saved vs ad-hoc", () => {
  it("denormalizes a saved destination", async () => {
    h.destGetById.mockResolvedValue({ id: "d1", name: "Zone", area: "Satellite", city: "Ahmedabad", lat: 23, lng: 72 });
    h.stopAdd.mockResolvedValue({ id: "stop-1" });
    const res = await addDropStop({ runId: "r1", seq: 1, destinationId: "d1" } as never);
    expect(res.ok).toBe(true);
    expect(h.destGetById).toHaveBeenCalledWith("d1");
    expect(h.geocode).not.toHaveBeenCalled();
  });

  it("geocodes an ad-hoc address", async () => {
    h.geocode.mockResolvedValue({ lat: 23.1, lng: 72.6 });
    h.stopAdd.mockResolvedValue({ id: "stop-2" });
    const res = await addDropStop({ runId: "r1", seq: 2, address: "Naroda, Ahmedabad" } as never);
    expect(res.ok).toBe(true);
    expect(h.geocode).toHaveBeenCalledWith("Naroda, Ahmedabad");
  });

  it("fails when the ad-hoc address can't be geocoded", async () => {
    h.geocode.mockResolvedValue(null);
    const res = await addDropStop({ runId: "r1", seq: 2, address: "nowhere" } as never);
    expect(!res.ok && (res as { code: string }).code).toBe("GEOCODE_FAILED");
  });
});
