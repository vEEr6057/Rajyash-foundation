import { describe, it, expect, vi, beforeEach } from "vitest";

// dispatch-model-v2 (docs/specs/dispatch-model-v2.md): drivers collect food, volunteers
// only help distribute. These tests cover the two correctness-critical shifts:
//   1) claimPickup's role gate moved from volunteer -> driver (atomic claim untouched).
//   2) getLatestPing's leg-aware visibility (donor's view ends once collected; any
//      volunteer + admin always see it).
//
// vi.mock factories are hoisted above these consts, so the spies/state they reference
// must be created with vi.hoisted() (or they'd be in the temporal dead zone).
const h = vi.hoisted(() => {
  class AuthError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return {
    AuthError,
    claimIfAvailable: vi.fn(),
    getById: vi.fn(),
    latestForPickup: vi.fn(),
    sessionState: null as { userId: string; role: string } | null,
  };
});

vi.mock("@/server/auth/session", () => ({
  AuthError: h.AuthError,
  requireRole: vi.fn(async (allowed: string[]) => {
    if (!h.sessionState || !allowed.includes(h.sessionState.role)) {
      throw new h.AuthError("FORBIDDEN");
    }
    return { userId: h.sessionState.userId, role: h.sessionState.role };
  }),
  getSession: vi.fn(async () => {
    if (!h.sessionState) return null;
    return { ...h.sessionState, onboardingComplete: true };
  }),
}));
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: { claimIfAvailable: h.claimIfAvailable, getById: h.getById },
}));
vi.mock("@/server/db/repositories/pings", () => ({
  pingsRepo: {
    purgeForPickup: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn(),
    latestForPickup: h.latestForPickup,
  },
}));
vi.mock("@/server/db/repositories/statusEvents", () => ({
  statusEventsRepo: { record: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

import { claimPickup, getLatestPing } from "./pickupActions";

beforeEach(() => {
  h.sessionState = null;
  h.claimIfAvailable.mockReset();
  h.getById.mockReset();
  h.latestForPickup.mockReset();
});

describe("claimPickup (dispatch-model-v2: driver-led)", () => {
  it("lets a driver claim an open pickup", async () => {
    h.sessionState = { userId: "driver-1", role: "driver" };
    h.claimIfAvailable.mockResolvedValue({ id: "p1", status: "accepted", volunteerId: "driver-1" });

    const res = await claimPickup("p1");

    expect(res.ok).toBe(true);
    expect(h.claimIfAvailable).toHaveBeenCalledWith("p1", "driver-1");
  });

  it("forbids a volunteer from claiming", async () => {
    h.sessionState = { userId: "vol-1", role: "volunteer" };

    const res = await claimPickup("p1");

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("FORBIDDEN");
      expect(res.message).toBe("Only drivers can claim pickups.");
    }
    expect(h.claimIfAvailable).not.toHaveBeenCalled();
  });

  it("tells the second driver in a race it was just taken", async () => {
    h.sessionState = { userId: "driver-2", role: "driver" };
    h.claimIfAvailable.mockResolvedValue(null); // atomic conditional update matched 0 rows

    const res = await claimPickup("p1");

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("TAKEN");
      expect(res.message).toBe("Just taken by another driver.");
    }
  });
});

describe("getLatestPing visibility (leg-aware, dispatch-model-v2)", () => {
  const pickup = (status: string, donorId = "donor-1") => ({
    id: "p1",
    donorId,
    volunteerId: "driver-1",
    status,
  });

  it("lets the owning donor see the ping while en_route", async () => {
    h.sessionState = { userId: "donor-1", role: "donor" };
    h.getById.mockResolvedValue(pickup("en_route"));
    h.latestForPickup.mockResolvedValue(null);

    const res = await getLatestPing("p1");

    expect(res.ok).toBe(true);
  });

  it("forbids the owning donor once the pickup is picked_up", async () => {
    h.sessionState = { userId: "donor-1", role: "donor" };
    h.getById.mockResolvedValue(pickup("picked_up"));

    const res = await getLatestPing("p1");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("FORBIDDEN");
  });

  it("lets any volunteer see the ping regardless of leg", async () => {
    h.sessionState = { userId: "vol-99", role: "volunteer" };
    h.getById.mockResolvedValue(pickup("picked_up"));
    h.latestForPickup.mockResolvedValue(null);

    const res = await getLatestPing("p1");

    expect(res.ok).toBe(true);
  });

  it("lets an admin see the ping regardless of leg or ownership", async () => {
    h.sessionState = { userId: "admin-1", role: "admin" };
    h.getById.mockResolvedValue(pickup("picked_up"));
    h.latestForPickup.mockResolvedValue(null);

    const res = await getLatestPing("p1");

    expect(res.ok).toBe(true);
  });

  it("forbids an unrelated donor entirely", async () => {
    h.sessionState = { userId: "donor-2", role: "donor" };
    h.getById.mockResolvedValue(pickup("en_route", "donor-1"));

    const res = await getLatestPing("p1");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("FORBIDDEN");
  });
});
