import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ getRunRoute: vi.fn() }));
vi.mock("@/features/runs/actions/runActions", () => ({
  getRunRoute: (...a: unknown[]) => h.getRunRoute(...a),
}));

import { useRunRoute } from "./useRunRoute";

beforeEach(() => {
  h.getRunRoute.mockReset();
  h.getRunRoute.mockResolvedValue({
    ok: true,
    coords: [[23, 72], [23.05, 72.6]],
    etaMinutes: 10,
    source: "osrm",
  });
});

describe("useRunRoute", () => {
  it("does not fetch while inactive", () => {
    renderHook(() => useRunRoute({ runId: "r1", live: { lat: 23, lng: 72 }, active: false }));
    expect(h.getRunRoute).not.toHaveBeenCalled();
  });

  it("fetches a route for the first live fix and exposes ETA", async () => {
    const { result } = renderHook(() =>
      useRunRoute({ runId: "r1", live: { lat: 23, lng: 72 }, active: true }),
    );
    await waitFor(() => expect(result.current.etaMinutes).toBe(10));
    expect(h.getRunRoute).toHaveBeenCalledTimes(1);
  });

  it("does NOT re-fetch for a sub-threshold move", async () => {
    const { rerender } = renderHook(
      ({ live }) => useRunRoute({ runId: "r1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(h.getRunRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.0001, lng: 72 } });
    await new Promise((r) => setTimeout(r, 0));
    expect(h.getRunRoute).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once the driver moves past the threshold", async () => {
    const { rerender } = renderHook(
      ({ live }) => useRunRoute({ runId: "r1", live, active: true }),
      { initialProps: { live: { lat: 23, lng: 72 } } },
    );
    await waitFor(() => expect(h.getRunRoute).toHaveBeenCalledTimes(1));
    rerender({ live: { lat: 23.01, lng: 72 } });
    await waitFor(() => expect(h.getRunRoute).toHaveBeenCalledTimes(2));
  });
});
