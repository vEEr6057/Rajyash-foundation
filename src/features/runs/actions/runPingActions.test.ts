import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getSession: vi.fn(),
  runGetById: vi.fn(),
  pingsInsert: vi.fn(),
  pingsLatest: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  requireRole: (...a: unknown[]) => h.requireRole(...a),
  getSession: (...a: unknown[]) => h.getSession(...a),
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/server/db/repositories/runs", () => ({
  runsRepo: { getById: (...a: unknown[]) => h.runGetById(...a) },
}));
vi.mock("@/server/db/repositories/runPings", () => ({
  runPingsRepo: {
    insert: (...a: unknown[]) => h.pingsInsert(...a),
    latestForRun: (...a: unknown[]) => h.pingsLatest(...a),
  },
}));

import { recordRunPing, getLatestRunPing } from "./runPingActions";

beforeEach(() => {
  Object.values(h).forEach((fn) => fn.mockReset());
  h.requireRole.mockResolvedValue({ userId: "drv-1", role: "driver" });
});

describe("recordRunPing — guards", () => {
  it("rejects a non-driver role", async () => {
    h.requireRole.mockRejectedValue(new Error("no"));
    const res = await recordRunPing("r1", 23.0, 72.5);
    expect((res as { code: string }).code).toBe("FORBIDDEN");
  });
  it("rejects a driver who doesn't own the run", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-2", status: "active" });
    const res = await recordRunPing("r1", 23.0, 72.5);
    expect((res as { code: string }).code).toBe("FORBIDDEN");
  });
  it("rejects when the run is not active", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "planned" });
    const res = await recordRunPing("r1", 23.0, 72.5);
    expect((res as { code: string }).code).toBe("INACTIVE");
  });
  it("rejects invalid coordinates", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    const res = await recordRunPing("r1", NaN, 72.5);
    expect((res as { code: string }).code).toBe("VALIDATION");
  });
  it("records a ping for a valid driver on an active run", async () => {
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.pingsInsert.mockResolvedValue({});
    const res = await recordRunPing("r1", 23.02, 72.57, 10);
    expect(res.ok).toBe(true);
    expect(h.pingsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "r1", driverId: "drv-1", lat: 23.02, lng: 72.57 }),
    );
  });
});

describe("getLatestRunPing — gates", () => {
  it("returns UNAUTHORIZED with no session", async () => {
    h.getSession.mockResolvedValue(null);
    expect((await getLatestRunPing("r1") as { code: string }).code).toBe("UNAUTHORIZED");
  });
  it("forbids a non-watcher role (donor)", async () => {
    h.getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    expect((await getLatestRunPing("r1") as { code: string }).code).toBe("FORBIDDEN");
  });
  it("allows a volunteer to watch (TRK-05)", async () => {
    h.getSession.mockResolvedValue({ userId: "vol-1", role: "volunteer" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.pingsLatest.mockResolvedValue(null);
    expect((await getLatestRunPing("r1")).ok).toBe(true);
  });
  it("returns the ping for an admin", async () => {
    h.getSession.mockResolvedValue({ userId: "adm-1", role: "admin" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.pingsLatest.mockResolvedValue({
      lat: 23.02,
      lng: 72.57,
      accuracy: 8,
      createdAt: new Date("2026-06-29T10:00:00Z"),
    });
    const res = await getLatestRunPing("r1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ping?.lat).toBe(23.02);
  });
  it("returns ping: null when no pings exist", async () => {
    h.getSession.mockResolvedValue({ userId: "drv-1", role: "driver" });
    h.runGetById.mockResolvedValue({ id: "r1", driverId: "drv-1", status: "active" });
    h.pingsLatest.mockResolvedValue(null);
    const res = await getLatestRunPing("r1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ping).toBeNull();
  });
});
