import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ getPickupRoute: vi.fn() }));
vi.mock("@/features/pickups/actions/pickupActions", () => ({
  getPickupRoute: h.getPickupRoute,
}));

import { usePickupRoute } from "./usePickupRoute";

beforeEach(() => {
  h.getPickupRoute.mockReset();
  h.getPickupRoute.mockResolvedValue({
    ok: true,
    coords: [[23, 72], [23.05, 72.6]],
    etaMinutes: 10,
    source: "osrm",
  });
});

describe("usePickupRoute", () => {
  it("does not fetch while inactive", () => {
    renderHook(() => usePickupRoute({ pickupId: "p1", live: { lat: 23, lng: 72 }, active: false }));
    expect(h.getPickupRoute).not.toHaveBeenCalled();
  });

  it("fetches a route for the first live fix and exposes ETA", async () => {
    const { result } = renderHook(() =>
      usePickupRoute({ pickupId: "p1", live: { lat: 23, lng: 72 }, active: true }),
    );
    await waitFor(() => expect(result.current.etaMinutes).toBe(10));
    expect(h.getPickupRoute).toHaveBeenCalledTimes(1);
    expect(result.current.source).toBe("osrm");
  });

  it("does NOT re-fetch for a sub-threshold move", async () => {
    const { rerender } = renderHook(
      ({ live }) => usePickupRoute({ pickupId: "p1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(h.getPickupRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.0001, lng: 72 } }); // ~11m — under 200m
    await new Promise((r) => setTimeout(r, 0));
    expect(h.getPickupRoute).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the driver moves past the threshold", async () => {
    const { rerender } = renderHook(
      ({ live }) => usePickupRoute({ pickupId: "p1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(h.getPickupRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.01, lng: 72 } }); // ~1.1km — over 200m
    await waitFor(() => expect(h.getPickupRoute).toHaveBeenCalledTimes(2));
  });
});
