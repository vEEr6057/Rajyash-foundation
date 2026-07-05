import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted; spies they reference must be vi.hoisted().
const h = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getLastByDonor: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  AuthError: class AuthError extends Error {},
  requireRole: h.requireRole,
  getSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/server/db/repositories/pings", () => ({ pingsRepo: {} }));
vi.mock("@/server/db/repositories/statusEvents", () => ({ statusEventsRepo: {} }));
vi.mock("@/server/db/repositories/profiles", () => ({ profilesRepo: {} }));
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: { getLastByDonor: h.getLastByDonor },
}));

import { getMyLastPickup } from "./pickupActions";

beforeEach(() => {
  h.requireRole.mockReset();
  h.getLastByDonor.mockReset();
});

describe("getMyLastPickup", () => {
  it("scopes the lookup to the session donor's own id — never a client-supplied one", async () => {
    h.requireRole.mockResolvedValue({ userId: "donor-1", role: "donor" });
    h.getLastByDonor.mockResolvedValue({
      id: "p1",
      donorId: "donor-1",
      category: "cooked_meal",
      description: "40 thalis",
      quantity: 40,
      quantityUnit: "servings",
      address: "Satellite, Ahmedabad",
      lat: 23.02,
      lng: 72.57,
      googleMapsUrl: null,
    });

    const res = await getMyLastPickup();

    // The repo call receives ONLY the session's own userId — this IS the
    // ownership check (no id argument the caller could ever influence).
    expect(h.getLastByDonor).toHaveBeenCalledWith("donor-1");
    expect(h.getLastByDonor).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({
      ok: true,
      pickup: {
        category: "cooked_meal",
        description: "40 thalis",
        quantity: 40,
        quantityUnit: "servings",
        address: "Satellite, Ahmedabad",
        lat: 23.02,
        lng: 72.57,
        googleMapsUrl: "",
      },
    });
  });

  it("returns pickup: null cleanly for a donor with no history (no throw, no crash)", async () => {
    h.requireRole.mockResolvedValue({ userId: "donor-2", role: "donor" });
    h.getLastByDonor.mockResolvedValue(null);

    const res = await getMyLastPickup();

    expect(h.getLastByDonor).toHaveBeenCalledWith("donor-2");
    expect(res).toEqual({ ok: true, pickup: null });
  });

  it("rejects a non-donor caller before ever touching the repo", async () => {
    h.requireRole.mockRejectedValue(new Error("forbidden"));

    const res = await getMyLastPickup();

    expect(res.ok).toBe(false);
    expect(h.getLastByDonor).not.toHaveBeenCalled();
  });
});
