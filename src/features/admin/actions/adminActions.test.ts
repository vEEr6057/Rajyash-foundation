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
const createInvitation = vi.fn().mockResolvedValue({ id: "inv1" });
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      updateUserMetadata: (...a: unknown[]) => updateUserMetadata(...a),
      banUser: (...a: unknown[]) => banUser(...a),
      unbanUser: (...a: unknown[]) => unbanUser(...a),
    },
    invitations: {
      createInvitation: (...a: unknown[]) => createInvitation(...a),
    },
  }),
}));

const setRole = vi.fn().mockResolvedValue({ id: "u2" });
const deactivate = vi.fn().mockResolvedValue({ id: "u2" });
const getById = vi.fn();
const countActiveAdmins = vi.fn();
const listAssignableDrivers = vi
  .fn()
  .mockResolvedValue([{ id: "d1", name: "D" }]);
vi.mock("@/server/db/repositories/profiles", () => ({
  profilesRepo: {
    setRole: (...a: unknown[]) => setRole(...a),
    deactivate: (...a: unknown[]) => deactivate(...a),
    getById: (...a: unknown[]) => getById(...a),
    countActiveAdmins: (...a: unknown[]) => countActiveAdmins(...a),
    reactivate: vi.fn().mockResolvedValue({ id: "u2" }),
    setPartner: vi.fn().mockResolvedValue({ id: "u2" }),
    listAssignableDrivers: (...a: unknown[]) => listAssignableDrivers(...a),
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

import {
  setUserRole,
  deactivateUser,
  assignPickup,
  assignPickupsBulk,
  inviteUser,
} from "./adminActions";

beforeEach(() => {
  requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
  updateUserMetadata.mockClear();
  banUser.mockClear();
  setRole.mockClear();
  deactivate.mockClear();
  getById.mockResolvedValue({ id: "u2", role: "volunteer", deactivatedAt: null });
  countActiveAdmins.mockResolvedValue(2); // default: 2 admins → not the last one
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

  // Last-admin guard
  it("blocks demoting the last active admin to a non-admin role (CONFLICT)", async () => {
    getById.mockResolvedValueOnce({ id: "u2", role: "admin", deactivatedAt: null });
    countActiveAdmins.mockResolvedValueOnce(1); // only one active admin left
    const r = await setUserRole("u2", "volunteer");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CONFLICT");
    expect(setRole).not.toHaveBeenCalled();
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when there are multiple active admins", async () => {
    getById.mockResolvedValueOnce({ id: "u2", role: "admin", deactivatedAt: null });
    countActiveAdmins.mockResolvedValueOnce(2); // two active admins
    const r = await setUserRole("u2", "volunteer");
    expect(r.ok).toBe(true);
    expect(setRole).toHaveBeenCalledWith("u2", "volunteer");
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

  // Last-admin guard
  it("blocks deactivating the last active admin (CONFLICT)", async () => {
    getById.mockResolvedValueOnce({ id: "u2", role: "admin", deactivatedAt: null });
    countActiveAdmins.mockResolvedValueOnce(1); // only one active admin
    const r = await deactivateUser("u2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CONFLICT");
    expect(deactivate).not.toHaveBeenCalled();
  });

  it("allows deactivating an admin when other active admins exist", async () => {
    getById.mockResolvedValueOnce({ id: "u2", role: "admin", deactivatedAt: null });
    countActiveAdmins.mockResolvedValueOnce(2); // two active admins
    const r = await deactivateUser("u2");
    expect(r.ok).toBe(true);
    expect(deactivate).toHaveBeenCalledWith("u2");
  });
});

describe("assignPickup (ADM-02, dispatch-model-v2)", () => {
  it("rejects a driver not in the assignable set", async () => {
    const r = await assignPickup("pk1", "ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(assignToVolunteer).not.toHaveBeenCalled();
  });
  it("sources the assignable set from listAssignableDrivers, not volunteers", async () => {
    assignToVolunteer.mockResolvedValue({ id: "pk1", status: "accepted" });
    await assignPickup("pk1", "d1");
    expect(listAssignableDrivers).toHaveBeenCalled();
  });
  it("assigns, records a status event (actor=admin), and emits pickup/claimed", async () => {
    assignToVolunteer.mockResolvedValue({ id: "pk1", status: "accepted" });
    const r = await assignPickup("pk1", "d1");
    expect(r.ok).toBe(true);
    expect(assignToVolunteer).toHaveBeenCalledWith("pk1", "d1");
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
    const r = await assignPickup("pk1", "d1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("CONFLICT");
  });
});

describe("assignPickupsBulk (UX-12)", () => {
  it("returns FORBIDDEN for a non-admin caller and never touches a pickup", async () => {
    requireRole.mockRejectedValueOnce(new Error("no"));
    const r = await assignPickupsBulk(["pk1"], "d1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
    expect(assignToVolunteer).not.toHaveBeenCalled();
  });

  it("rejects an empty selection with VALIDATION", async () => {
    const r = await assignPickupsBulk([], "d1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(assignToVolunteer).not.toHaveBeenCalled();
  });

  it("rejects a driver not in the assignable set before touching any pickup", async () => {
    const r = await assignPickupsBulk(["pk1", "pk2"], "ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(assignToVolunteer).not.toHaveBeenCalled();
  });

  it("runs each pickup through its own atomic call — one taken pickup fails alone, the rest still succeed", async () => {
    assignToVolunteer.mockImplementation(async (id: string) =>
      id === "pk2" ? null : { id, status: "accepted" },
    );
    const r = await assignPickupsBulk(["pk1", "pk2", "pk3"], "d1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.assigned).toEqual(["pk1", "pk3"]);
      expect(r.failed).toEqual([
        { id: "pk2", reason: "Already claimed or assigned." },
      ]);
    }
    // one call per pickup — never a single batch UPDATE across the selection
    expect(assignToVolunteer).toHaveBeenCalledTimes(3);
    expect(assignToVolunteer).toHaveBeenNthCalledWith(1, "pk1", "d1");
    expect(assignToVolunteer).toHaveBeenNthCalledWith(2, "pk2", "d1");
    expect(assignToVolunteer).toHaveBeenNthCalledWith(3, "pk3", "d1");
    // statusEvents recorded only for the ones that actually succeeded
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupId: "pk1",
        actorId: "admin-1",
        fromStatus: "requested",
        toStatus: "accepted",
      }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ pickupId: "pk3", actorId: "admin-1" }),
    );
  });

  it("isolates a per-pickup exception without aborting the rest of the batch", async () => {
    assignToVolunteer.mockImplementation(async (id: string) => {
      if (id === "pk2") throw new Error("db blip");
      return { id, status: "accepted" };
    });
    const r = await assignPickupsBulk(["pk1", "pk2", "pk3"], "d1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.assigned).toEqual(["pk1", "pk3"]);
      expect(r.failed).toEqual([
        { id: "pk2", reason: "Could not assign this pickup." },
      ]);
    }
  });
});

describe("inviteUser", () => {
  beforeEach(() => {
    requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
    createInvitation.mockClear();
  });

  it("returns FORBIDDEN for non-admin and does not invite", async () => {
    requireRole.mockRejectedValueOnce(new Error("no"));
    const r = await inviteUser("a@b.com", "volunteer", "New Person");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with VALIDATION", async () => {
    const r = await inviteUser("not-an-email", "volunteer", "New Person");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("rejects a missing/too-short name with VALIDATION", async () => {
    const r1 = await inviteUser("a@b.com", "volunteer", "");
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.code).toBe("VALIDATION");
    const r2 = await inviteUser("a@b.com", "volunteer", "A");
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe("VALIDATION");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone with VALIDATION", async () => {
    const r = await inviteUser("a@b.com", "volunteer", "New Person", "12345");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("creates a Clerk invitation with onboardingComplete:true + seeded name on the happy path", async () => {
    const r = await inviteUser(
      "New.Person@Example.com",
      "driver",
      "  Driver Dan  ",
      "9876543210",
      "Surat",
    );
    expect(r.ok).toBe(true);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "new.person@example.com",
        publicMetadata: {
          role: "driver",
          onboardingComplete: true,
          invitedName: "Driver Dan",
          invitedPhone: "9876543210",
          invitedCity: "Surat",
        },
        ignoreExisting: true,
      }),
    );
  });

  it("defaults city to DEFAULT_CITY and phone to null when omitted", async () => {
    const r = await inviteUser("plain@example.com", "donor", "Plain Donor");
    expect(r.ok).toBe(true);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        publicMetadata: expect.objectContaining({
          invitedCity: "Ahmedabad",
          invitedPhone: null,
        }),
      }),
    );
  });

  it("invites an admin — the one place admin may be assigned; carries role + onboardingComplete", async () => {
    const r = await inviteUser("boss@example.com", "admin", "Boss Person");
    expect(r.ok).toBe(true);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: "boss@example.com",
        publicMetadata: expect.objectContaining({
          role: "admin",
          onboardingComplete: true,
        }),
      }),
    );
  });
});
