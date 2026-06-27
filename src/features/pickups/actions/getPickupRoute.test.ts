import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  getById: vi.fn(),
  fetchOsrmRoute: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  AuthError: class AuthError extends Error {},
  requireRole: vi.fn(),
  getSession: h.getSession,
}));
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: { getById: h.getById },
}));
vi.mock("@/lib/routing.server", () => ({ fetchOsrmRoute: h.fetchOsrmRoute }));
vi.mock("@/lib/geocoding", () => ({ geocodeAddress: vi.fn(), resolveShortMapsUrl: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/inngest/client", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/server/db/repositories/pings", () => ({ pingsRepo: {} }));
vi.mock("@/server/db/repositories/statusEvents", () => ({ statusEventsRepo: {} }));

import { getPickupRoute } from "./pickupActions";

const PICKUP = { id: "p1", donorId: "d1", volunteerId: "v1", lat: 23.05, lng: 72.6 };

beforeEach(() => {
  h.getSession.mockReset();
  h.getById.mockReset();
  h.fetchOsrmRoute.mockReset();
  h.getById.mockResolvedValue(PICKUP);
});

describe("getPickupRoute", () => {
  it("rejects an unauthenticated caller", async () => {
    h.getSession.mockResolvedValue(null);
    expect((await getPickupRoute("p1", 23, 72)).ok).toBe(false);
  });

  it("forbids a user who is neither owner, assigned volunteer, nor admin", async () => {
    h.getSession.mockResolvedValue({ userId: "stranger", role: "volunteer" });
    expect((await getPickupRoute("p1", 23, 72)).ok).toBe(false);
  });

  it("returns the OSRM route when available", async () => {
    h.getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    h.fetchOsrmRoute.mockResolvedValue({
      coords: [[23, 72], [23.05, 72.6]],
      durationSec: 600,
    });
    const res = await getPickupRoute("p1", 23, 72);
    expect(res).toMatchObject({ ok: true, source: "osrm", etaMinutes: 10 });
    expect(res.ok && res.coords).toHaveLength(2);
  });

  it("falls back to a straight line + estimated ETA when OSRM fails", async () => {
    h.getSession.mockResolvedValue({ userId: "v1", role: "volunteer" }); // assigned driver
    h.fetchOsrmRoute.mockResolvedValue(null);
    const res = await getPickupRoute("p1", 23.0, 72.0);
    expect(res).toMatchObject({ ok: true, source: "line" });
    expect(res.ok && res.coords).toEqual([[23.0, 72.0], [23.05, 72.6]]);
    expect(res.ok && res.etaMinutes).toBeGreaterThanOrEqual(1);
  });

  it("rejects non-finite coordinates", async () => {
    h.getSession.mockResolvedValue({ userId: "d1", role: "donor" });
    expect((await getPickupRoute("p1", NaN, 72)).ok).toBe(false);
  });
});
