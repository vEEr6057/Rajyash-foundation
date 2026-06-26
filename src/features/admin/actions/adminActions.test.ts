import { describe, it, expect, vi, beforeEach } from "vitest";

// Acting admin identity returned by requireRole.
const requireRole = vi.fn();
vi.mock("@/server/auth/session", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  AuthError: class AuthError extends Error {},
}));

const updateUserMetadata = vi.fn().mockResolvedValue(undefined);
const banUser = vi.fn().mockResolvedValue(undefined);
const unbanUser = vi.fn().mockResolvedValue(undefined);
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      updateUserMetadata: (...a: unknown[]) => updateUserMetadata(...a),
      banUser: (...a: unknown[]) => banUser(...a),
      unbanUser: (...a: unknown[]) => unbanUser(...a),
    },
  }),
}));

const setRole = vi.fn().mockResolvedValue({ id: "u2" });
const deactivate = vi.fn().mockResolvedValue({ id: "u2" });
const listAssignableVolunteers = vi
  .fn()
  .mockResolvedValue([{ id: "v1", name: "V" }]);
vi.mock("@/server/db/repositories/profiles", () => ({
  profilesRepo: {
    setRole: (...a: unknown[]) => setRole(...a),
    deactivate: (...a: unknown[]) => deactivate(...a),
    reactivate: vi.fn().mockResolvedValue({ id: "u2" }),
    setPartner: vi.fn().mockResolvedValue({ id: "u2" }),
    listAssignableVolunteers: (...a: unknown[]) => listAssignableVolunteers(...a),
  },
}));

const assignToVolunteer = vi.fn();
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: { assignToVolunteer: (...a: unknown[]) => assignToVolunteer(...a) },
}));
vi.mock("@/server/db/repositories/partners", () => ({
  partnersRepo: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const record = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/db/repositories/statusEvents", () => ({
  statusEventsRepo: { record: (...a: unknown[]) => record(...a) },
}));

const send = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: (...a: unknown[]) => send(...a) },
}));
vi.mock("@/server/notifications/events", () => ({
  buildEventId: (t: string, id: string) => `${id}:${t}`,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { setUserRole, deactivateUser, assignPickup } from "./adminActions";

beforeEach(() => {
  requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
  updateUserMetadata.mockClear();
  banUser.mockClear();
  setRole.mockClear();
  deactivate.mockClear();
  assignToVolunteer.mockReset();
  record.mockClear();
  send.mockClear();
});

describe("setUserRole (ADM-03)", () => {
  it("blocks self-demotion (D-05) without touching Clerk or the DB", async () => {
    const r = await setUserRole("admin-1", "donor");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
    expect(updateUserMetadata).not.toHaveBeenCalled();
    expect(setRole).not.toHaveBeenCalled();
  });
  it("writes Clerk metadata AND mirrors to the DB for another user", async () => {
    const r = await setUserRole("u2", "volunteer");
    expect(r.ok).toBe(true);
    expect(updateUserMetadata).toHaveBeenCalledWith("u2", {
      publicMetadata: { role: "volunteer" },
    });
    expect(setRole).toHaveBeenCalledWith("u2", "volunteer");
  });
  it("rejects an invalid role before any write", async () => {
    const r = await setUserRole("u2", "wizard" as never);
    expect(r.ok).toBe(false);
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });
});

describe("deactivateUser (ADM-03)", () => {
  it("blocks self-deactivation (D-05)", async () => {
    const r = await deactivateUser("admin-1");
    expect(r.ok).toBe(false);
    expect(deactivate).not.toHaveBeenCalled();
  });
  it("soft-deactivates then best-effort bans; a banUser throw does not fail the action", async () => {
    banUser.mockRejectedValueOnce(new Error("not on this version"));
    const r = await deactivateUser("u2");
    expect(r.ok).toBe(true);
    expect(deactivate).toHaveBeenCalledWith("u2");
  });
});

describe("assignPickup (ADM-02)", () => {
  it("rejects a volunteer not in the assignable set", async () => {
    const r = await assignPickup("pk1", "ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(assignToVolunteer).not.toHaveBeenCalled();
  });
  it("assigns, records a status event (actor=admin), and emits pickup/claimed", async () => {
    assignToVolunteer.mockResolvedValue({ id: "pk1", status: "accepted" });
    const r = await assignPickup("pk1", "v1");
    expect(r.ok).toBe(true);
    expect(assignToVolunteer).toHaveBeenCalledWith("pk1", "v1");
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupId: "pk1",
        actorId: "admin-1",
        fromStatus: "requested",
        toStatus: "accepted",
      }),
    );
    expect(send).toHaveBeenCalled();
  });
  it("returns CONFLICT when the pickup is already taken (assign returns null)", async () => {
    assignToVolunteer.mockResolvedValue(null);
    const r = await assignPickup("pk1", "v1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CONFLICT");
  });
});
