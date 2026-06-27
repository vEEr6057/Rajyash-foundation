import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted; spies they reference must be vi.hoisted().
const h = vi.hoisted(() => ({
  geocodeAddress: vi.fn(),
  resolveShortMapsUrl: vi.fn(),
}));

vi.mock("@/lib/geocoding", () => ({
  geocodeAddress: h.geocodeAddress,
  resolveShortMapsUrl: h.resolveShortMapsUrl,
}));
vi.mock("@/server/auth/session", () => ({
  AuthError: class AuthError extends Error {},
  requireRole: vi.fn().mockResolvedValue({ userId: "u1", role: "donor" }),
  getSession: vi.fn().mockResolvedValue({ userId: "u1", role: "donor" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/server/db/repositories/pings", () => ({ pingsRepo: {} }));
vi.mock("@/server/db/repositories/statusEvents", () => ({ statusEventsRepo: {} }));
vi.mock("@/server/db/repositories/pickups", () => ({ pickupsRepo: {} }));

import { resolvePickupLocation } from "./pickupActions";

beforeEach(() => {
  h.geocodeAddress.mockReset();
  h.resolveShortMapsUrl.mockReset();
});

describe("resolvePickupLocation", () => {
  it("parses coords straight from a full Google Maps link (no network)", async () => {
    const res = await resolvePickupLocation("https://www.google.com/maps/@23.0225,72.5714,15z");
    expect(res).toMatchObject({ ok: true, lat: 23.0225, lng: 72.5714 });
    expect(res.ok && res.googleMapsUrl).toBe("https://www.google.com/maps/@23.0225,72.5714,15z");
    expect(h.geocodeAddress).not.toHaveBeenCalled();
  });

  it("follows a short link, then parses coords from the resolved URL", async () => {
    h.resolveShortMapsUrl.mockResolvedValue("https://www.google.com/maps/place/X/data=!3d23.01!4d72.52");
    const res = await resolvePickupLocation("https://maps.app.goo.gl/abc");
    expect(res).toMatchObject({ ok: true, lat: 23.01, lng: 72.52 });
    expect(res.ok && res.googleMapsUrl).toBe("https://maps.app.goo.gl/abc"); // original link kept
    expect(h.resolveShortMapsUrl).toHaveBeenCalledOnce();
  });

  it("geocodes a plain address via Nominatim", async () => {
    h.geocodeAddress.mockResolvedValue({ lat: 23.03, lng: 72.58, displayName: "Satellite, Ahmedabad" });
    const res = await resolvePickupLocation("Satellite, Ahmedabad");
    expect(res).toMatchObject({ ok: true, lat: 23.03, lng: 72.58, googleMapsUrl: null });
  });

  it("fails when a link has no coords and the short-link resolve yields none", async () => {
    h.resolveShortMapsUrl.mockResolvedValue("https://www.google.com/maps/place/No+Coords+Here");
    const res = await resolvePickupLocation("https://maps.app.goo.gl/nope");
    expect(res.ok).toBe(false);
  });

  it("fails when an address can't be geocoded", async () => {
    h.geocodeAddress.mockResolvedValue(null);
    const res = await resolvePickupLocation("asdfqwer nowhere");
    expect(res.ok).toBe(false);
  });
});
