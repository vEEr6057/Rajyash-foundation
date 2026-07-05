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
  runGetWithStops: vi.fn(),
  // run stops repo
  stopAdd: vi.fn(),
  stopGetById: vi.fn(),
  stopGetByRunId: vi.fn(),
  stopRemove: vi.fn(),
  stopReorder: vi.fn(),
  stopSetStatusWithEvent: vi.fn(),
  // others
  partnerGetById: vi.fn(),
  destGetById: vi.fn(),
  geocode: vi.fn(),
  purgeForRun: vi.fn(),
  inngestSend: vi.fn(),
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
    getRunWithStops: (...a: unknown[]) => h.runGetWithStops(...a),
  },
}));
vi.mock("@/lib/routing", () => ({
  haversineMeters: vi.fn().mockReturnValue(500),
  estimateEtaMinutes: vi.fn().mockReturnValue(3),
  straightLineRoute: vi.fn().mockReturnValue([[23, 72], [23.02, 72.6]]),
}));
vi.mock("@/lib/routing.server", () => ({
  fetchOsrmRoute: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/server/db/repositories/runStops", () => ({
  runStopsRepo: {
    add: (...a: unknown[]) => h.stopAdd(...a),
    getById: (...a: unknown[]) => h.stopGetById(...a),
    getByRunId: (...a: unknown[]) => h.stopGetByRunId(...a),
    remove: (...a: unknown[]) => h.stopRemove(...a),
    reorder: (...a: unknown[]) => h.stopReorder(...a),
    setStopStatusWithEvent: (...a: unknown[]) => h.stopSetStatusWithEvent(...a),
  },
}));
vi.mock("@/server/db/repositories/partners", () => ({
  partnersRepo: { getById: (...a: unknown[]) => h.partnerGetById(...a) },
}));
vi.mock("@/server/db/repositories/destinations", () => ({
  destinationsRepo: { getById: (...a: unknown[]) => h.destGetById(...a) },
}));
vi.mock("@/server/db/repositories/runPings", () => ({
  runPingsRepo: { purgeForRun: (...a: unknown[]) => h.purgeForRun(...a) },
}));
vi.mock("@/features/admin/actions/destinationActions", () => ({
  geocodeDestinationAddress: (...a: unknown[]) => h.geocode(...a),
}));
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: (...a: unknown[]) => h.inngestSend(...a) },
}));

import {
  createRun,
  assignDriver,
  editRun,
  addPickupStop,
  addDropStop,
  reorderStops,
  removeStop,
  overrideStopStatus,
  setRunStatus,
  markStopDone,
  getRunRoute,
  deleteRun,
} from "./runActions";

beforeEach(() => {
  Object.values(h).forEach((fn) => fn.mockReset());
  h.requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
  // Default: a mutable (active) run, so stop-mutation actions pass the B4 run-status
  // guard. Tests that assert the guard override this with a closed/missing run.
  h.runGetById.mockResolvedValue({ id: "r1", status: "active" });
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
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
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
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    // After marking s1 done, all stops (s1 done via optimistic, s2 already done) → complete
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "done" }]);
    await markStopDone("s1");
    expect(h.runSetStatus).toHaveBeenCalledWith("r1", "completed");
  });

  it("does NOT complete the run when a stop is still pending", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "pending" }]);
    await markStopDone("s1");
    expect(h.runSetStatus).not.toHaveBeenCalled();
  });

  it("does NOT auto-complete a PLANNED run (invalid transition) but still marks the stop done", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    // A driver may act on a planned run; planned→completed skips `active` (invalid).
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "planned" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([{ id: "s1", status: "pending" }, { id: "s2", status: "done" }]);
    const res = await markStopDone("s1");
    expect(res.ok).toBe(true);
    expect(h.stopSetStatusWithEvent).toHaveBeenCalled(); // stop still marked done
    expect(h.runSetStatus).not.toHaveBeenCalled(); // but run is NOT completed
    expect(res.ok && (res as { runCompleted: boolean }).runCompleted).toBe(false);
  });
});

describe("markStopDone — volunteer path (DEL-02)", () => {
  it("allows a volunteer on an ACTIVE run", async () => {
    h.getSession.mockResolvedValue({ userId: "vol-1", role: "volunteer" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "pending" },
      { id: "s2", status: "pending" },
    ]);
    const res = await markStopDone("s1");
    expect(res.ok).toBe(true);
  });

  it("blocks a volunteer on a non-active run", async () => {
    h.getSession.mockResolvedValue({ userId: "vol-1", role: "volunteer" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "planned" });
    const res = await markStopDone("s1");
    expect(!res.ok && (res as { code: string }).code).toBe("FORBIDDEN");
  });
});

describe("markStopDone — audit trail (stop_status_events)", () => {
  it("writes an event with from=prior status, to=done, actor=the session user", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "pending" },
      { id: "s2", status: "pending" },
    ]);
    await markStopDone("s1");
    expect(h.stopSetStatusWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "s1",
        status: "done",
        actorId: "drv-1",
        fromStatus: "pending",
      }),
    );
  });

  it("preserves the auto-complete-run path alongside the audit write", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "pending" },
      { id: "s2", status: "done" },
    ]);
    const res = await markStopDone("s1");
    expect(h.stopSetStatusWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "drv-1", fromStatus: "pending", status: "done" }),
    );
    expect(h.runSetStatus).toHaveBeenCalledWith("r1", "completed");
    expect(res.ok && (res as { runCompleted: boolean }).runCompleted).toBe(true);
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

describe("run notification emits (B3)", () => {
  it("assignDriver emits run/assigned for the driver", async () => {
    h.runAssignDriver.mockResolvedValue({ id: "r1" });
    await assignDriver("r1", "drv-9");
    expect(h.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "run/assigned",
        data: expect.objectContaining({
          runId: "r1",
          driverId: "drv-9",
          eventId: "assigned:r1:drv-9",
        }),
      }),
    );
  });

  it("createRun WITH a driver emits run/assigned", async () => {
    h.runCreate.mockResolvedValue({ id: "r2" });
    await createRun({ slot: "morning", runDate: new Date(), driverId: "drv-3" } as never);
    expect(h.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "run/assigned",
        data: expect.objectContaining({ runId: "r2", driverId: "drv-3" }),
      }),
    );
  });

  it("createRun WITHOUT a driver emits nothing", async () => {
    h.runCreate.mockResolvedValue({ id: "r3" });
    await createRun({ slot: "morning", runDate: new Date() } as never);
    expect(h.inngestSend).not.toHaveBeenCalled();
  });

  it("editRun emits run/assigned only when the driver changes to a new one", async () => {
    h.runGetById.mockResolvedValue({ id: "r4", driverId: "old", status: "planned" });
    h.runUpdate.mockResolvedValue({ id: "r4" });
    await editRun("r4", { driverId: "new" } as never);
    expect(h.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "run/assigned",
        data: expect.objectContaining({ driverId: "new" }),
      }),
    );
  });

  it("editRun does NOT emit when the driver is unchanged", async () => {
    h.runGetById.mockResolvedValue({ id: "r5", driverId: "same", status: "planned" });
    h.runUpdate.mockResolvedValue({ id: "r5" });
    await editRun("r5", { driverId: "same" } as never);
    expect(h.inngestSend).not.toHaveBeenCalled();
  });

  it("setRunStatus -> completed emits run/completed", async () => {
    h.runGetById.mockResolvedValue({ id: "r6", status: "active" });
    h.runSetStatus.mockResolvedValue({ id: "r6" });
    await setRunStatus("r6", "completed");
    expect(h.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "run/completed",
        data: expect.objectContaining({ runId: "r6", eventId: "run_completed:r6" }),
      }),
    );
  });

  it("setRunStatus -> cancelled emits nothing", async () => {
    h.runGetById.mockResolvedValue({ id: "r6b", status: "active" });
    h.runSetStatus.mockResolvedValue({ id: "r6b" });
    await setRunStatus("r6b", "cancelled");
    expect(h.inngestSend).not.toHaveBeenCalled();
  });

  it("markStopDone auto-complete emits run/completed", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r7", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r7", driverId: "drv-1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "pending" },
      { id: "s2", status: "done" },
    ]);
    await markStopDone("s1");
    expect(h.inngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: "run/completed" }),
    );
  });
});

describe("run-status guards on stop mutations (B4)", () => {
  it("addPickupStop is blocked on a completed run (CONFLICT, no stop written)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "completed" });
    const res = await addPickupStop({ runId: "r1", partnerId: "p1", seq: 1 } as never);
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopAdd).not.toHaveBeenCalled();
    expect(h.partnerGetById).not.toHaveBeenCalled();
  });

  it("addDropStop is blocked on a cancelled run (CONFLICT, no geocode/write)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "cancelled" });
    const res = await addDropStop({ runId: "r1", seq: 1, address: "Naroda" } as never);
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.geocode).not.toHaveBeenCalled();
    expect(h.stopAdd).not.toHaveBeenCalled();
  });

  it("removeStop is blocked on a completed run (CONFLICT, no delete)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "completed" });
    const res = await removeStop("s1", "r1");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopRemove).not.toHaveBeenCalled();
  });

  it("reorderStops is blocked on a cancelled run (CONFLICT, no reorder)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "cancelled" });
    const res = await reorderStops({ runId: "r1", items: [{ id: "s1", seq: 1 }] });
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopReorder).not.toHaveBeenCalled();
  });

  it("removeStop still works on an active run", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "active" });
    const res = await removeStop("s1", "r1");
    expect(res.ok).toBe(true);
    expect(h.stopRemove).toHaveBeenCalledWith("s1");
  });

  it("addPickupStop returns NOT_FOUND when the run is gone", async () => {
    h.runGetById.mockResolvedValue(null);
    const res = await addPickupStop({ runId: "gone", partnerId: "p1", seq: 1 } as never);
    expect(!res.ok && (res as { code: string }).code).toBe("NOT_FOUND");
  });
});

describe("overrideStopStatus — closed-run rejection (B4)", () => {
  it("rejects an override on a completed run (CONFLICT, no mutation)", async () => {
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "done" });
    h.runGetById.mockResolvedValue({ id: "r1", status: "completed" });
    const res = await overrideStopStatus("s1", "pending");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopSetStatusWithEvent).not.toHaveBeenCalled();
  });

  it("rejects an override on a cancelled run", async () => {
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", status: "cancelled" });
    const res = await overrideStopStatus("s1", "done");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopSetStatusWithEvent).not.toHaveBeenCalled();
  });

  it("allows an override on an active run", async () => {
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "pending" },
      { id: "s2", status: "pending" },
    ]);
    const res = await overrideStopStatus("s1", "skipped");
    expect(res.ok).toBe(true);
    expect(h.stopSetStatusWithEvent).toHaveBeenCalled();
  });
});

describe("overrideStopStatus — audit trail (stop_status_events)", () => {
  it("writes an event with from=prior status, to=override status, actor=the admin", async () => {
    h.requireRole.mockResolvedValue({ userId: "admin-9", role: "admin" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "pending" });
    h.runGetById.mockResolvedValue({ id: "r1", status: "active" });
    h.stopSetStatusWithEvent.mockResolvedValue({ id: "s1" });
    h.stopGetByRunId.mockResolvedValue([
      { id: "s1", status: "skipped" },
      { id: "s2", status: "pending" },
    ]);
    await overrideStopStatus("s1", "skipped");
    expect(h.stopSetStatusWithEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "s1",
        status: "skipped",
        actorId: "admin-9",
        fromStatus: "pending",
        doneAt: null,
      }),
    );
  });

  it("still enforces closed-run rejection before writing any event", async () => {
    h.requireRole.mockResolvedValue({ userId: "admin-9", role: "admin" });
    h.stopGetById.mockResolvedValue({ id: "s1", runId: "r1", status: "done" });
    h.runGetById.mockResolvedValue({ id: "r1", status: "completed" });
    const res = await overrideStopStatus("s1", "pending");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.stopSetStatusWithEvent).not.toHaveBeenCalled();
  });
});

describe("deleteRun — status matrix (B4)", () => {
  it("deletes a planned run", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "planned" });
    h.runDelete.mockResolvedValue(undefined);
    const res = await deleteRun("r1");
    expect(res.ok).toBe(true);
    expect(h.runDelete).toHaveBeenCalledWith("r1");
  });

  it("deletes a cancelled run", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "cancelled" });
    h.runDelete.mockResolvedValue(undefined);
    const res = await deleteRun("r1");
    expect(res.ok).toBe(true);
    expect(h.runDelete).toHaveBeenCalledWith("r1");
  });

  it("blocks deleting an active run (CONFLICT — cancel first)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "active" });
    const res = await deleteRun("r1");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.runDelete).not.toHaveBeenCalled();
  });

  it("blocks deleting a completed run (CONFLICT — kept for reporting)", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", status: "completed" });
    const res = await deleteRun("r1");
    expect(!res.ok && (res as { code: string }).code).toBe("CONFLICT");
    expect(h.runDelete).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the run is missing", async () => {
    h.runGetById.mockResolvedValue(null);
    const res = await deleteRun("gone");
    expect(!res.ok && (res as { code: string }).code).toBe("NOT_FOUND");
  });
});

describe("getRunRoute (TRK-06)", () => {
  it("returns UNAUTHORIZED with no session", async () => {
    h.getSession.mockResolvedValue(null);
    expect((await getRunRoute("r1", 23, 72) as { code: string }).code).toBe("UNAUTHORIZED");
  });
  it("forbids a non-watcher role (donor)", async () => {
    h.getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    h.runGetWithStops.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active", stops: [] });
    expect((await getRunRoute("r1", 23, 72) as { code: string }).code).toBe("FORBIDDEN");
  });
  it("returns an empty route when no pending stop has coords", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.runGetWithStops.mockResolvedValue({
      id: "r1",
      driverId: "drv-1",
      status: "active",
      stops: [{ id: "s1", seq: 1, status: "pending", lat: null, lng: null }],
    });
    const res = await getRunRoute("r1", 23, 72);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.coords).toEqual([]);
  });
  it("routes to the lowest-seq pending stop with coords (straight-line fallback)", async () => {
    h.getSession.mockResolvedValue({ userId: "vol-1", role: "volunteer" });
    h.runGetWithStops.mockResolvedValue({
      id: "r1",
      driverId: "drv-1",
      status: "active",
      stops: [
        { id: "s1", seq: 1, status: "done", lat: 23.01, lng: 72.6 },
        { id: "s2", seq: 2, status: "pending", lat: 23.02, lng: 72.6 },
        { id: "s3", seq: 3, status: "pending", lat: 23.03, lng: 72.6 },
      ],
    });
    const res = await getRunRoute("r1", 23.0, 72.5);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.source).toBe("line");
      expect(res.etaMinutes).toBeGreaterThanOrEqual(1);
    }
  });
});
