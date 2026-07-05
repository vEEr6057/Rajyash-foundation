import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above these consts, so the spies they reference
// must be created with vi.hoisted() (or they'd be in the temporal dead zone).
const h = vi.hoisted(() => ({
  purgeForPickup: vi.fn().mockResolvedValue(undefined),
  pickupState: { current: {} as Record<string, unknown> },
}));

vi.mock("@/server/db/repositories/pings", () => ({
  pingsRepo: {
    purgeForPickup: h.purgeForPickup,
    insert: vi.fn(),
    latestForPickup: vi.fn(),
  },
}));
vi.mock("@/server/db/repositories/statusEvents", () => ({
  statusEventsRepo: { record: vi.fn().mockResolvedValue(undefined) },
}));
// advancePickup is driver-gated (dispatch-model-v2); cancelPickup stays donor-gated.
// This mock ignores the requested role list, so one shared actor covers both call sites.
vi.mock("@/server/auth/session", () => ({
  AuthError: class AuthError extends Error {},
  requireRole: vi.fn().mockResolvedValue({ userId: "driver-1", role: "driver" }),
  getSession: vi.fn().mockResolvedValue({ userId: "driver-1", role: "driver" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: {
    getById: vi.fn(async () => h.pickupState.current),
    advance: vi.fn(async (_id, _vol, _from, to) => ({
      ...h.pickupState.current,
      status: to,
    })),
    cancelIfRequested: vi.fn(async () => ({ id: "p1", status: "cancelled" })),
  },
}));

import { advancePickup, cancelPickup } from "./pickupActions";

beforeEach(() => h.purgeForPickup.mockClear());

describe("advancePickup purge (TRK-04)", () => {
  it("purges when the pickup reaches delivered", async () => {
    // picked_up + proof present → next status is delivered
    h.pickupState.current = {
      id: "p1",
      volunteerId: "driver-1",
      status: "picked_up",
      proofPhotoPath: "proof/x.jpg",
    };
    const res = await advancePickup("p1");
    expect(res.ok).toBe(true);
    expect(h.purgeForPickup).toHaveBeenCalledTimes(1);
    expect(h.purgeForPickup).toHaveBeenCalledWith("p1");
  });

  it("does NOT purge on a non-delivered transition", async () => {
    // en_route → picked_up
    h.pickupState.current = {
      id: "p1",
      volunteerId: "driver-1",
      status: "en_route",
    };
    const res = await advancePickup("p1");
    expect(res.ok).toBe(true);
    expect(h.purgeForPickup).not.toHaveBeenCalled();
  });

  it("delivers WITHOUT a proof photo (DEL-01: proof is optional)", async () => {
    // picked_up + no proof → still advances to delivered (no PROOF_REQUIRED gate)
    h.pickupState.current = {
      id: "p1",
      volunteerId: "driver-1",
      status: "picked_up",
      proofPhotoPath: null,
    };
    const res = await advancePickup("p1");
    expect(res.ok).toBe(true);
    expect(h.purgeForPickup).toHaveBeenCalledWith("p1");
  });
});

describe("cancelPickup purge (TRK-04)", () => {
  it("purges any trail on cancel", async () => {
    const res = await cancelPickup("p1");
    expect(res.ok).toBe(true);
    expect(h.purgeForPickup).toHaveBeenCalledTimes(1);
    expect(h.purgeForPickup).toHaveBeenCalledWith("p1");
  });
});
