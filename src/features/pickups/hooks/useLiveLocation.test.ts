import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLiveLocation } from "./useLiveLocation";

type SuccessCb = (pos: {
  coords: { latitude: number; longitude: number; accuracy: number };
}) => void;
type ErrorCb = (err: { code: number; PERMISSION_DENIED: number }) => void;

let successCb: SuccessCb | null = null;
let errorCb: ErrorCb | null = null;

function mockGeo() {
  successCb = null;
  errorCb = null;
  const geolocation = {
    watchPosition: vi.fn((s: SuccessCb, e: ErrorCb) => {
      successCb = s;
      errorCb = e;
      return 1; // watch id
    }),
    clearWatch: vi.fn(),
  };
  Object.defineProperty(globalThis, "navigator", {
    value: { geolocation },
    configurable: true,
  });
  return geolocation;
}

const fix = (lat: number, lng: number) => ({
  coords: { latitude: lat, longitude: lng, accuracy: 10 },
});

describe("useLiveLocation (TRK-01)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("throttles rapid fixes to one onFix per window, then emits again", () => {
    mockGeo();
    const onFix = vi.fn();
    renderHook(() => useLiveLocation({ active: true, onFix }));

    act(() => {
      successCb!(fix(23.01, 72.57)); // first fix → emits
      successCb!(fix(23.02, 72.58)); // immediately after → throttled
    });
    expect(onFix).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(31_000); // past the ~30s window
      successCb!(fix(23.03, 72.59)); // emits again
    });
    expect(onFix).toHaveBeenCalledTimes(2);
  });

  it("reports denied permission and never calls onFix", () => {
    mockGeo();
    const onFix = vi.fn();
    const { result } = renderHook(() => useLiveLocation({ active: true, onFix }));
    act(() => {
      errorCb!({ code: 1, PERMISSION_DENIED: 1 });
    });
    expect(result.current.perm).toBe("denied");
    expect(onFix).not.toHaveBeenCalled();
  });

  it("does not register a watch when inactive", () => {
    const geo = mockGeo();
    const onFix = vi.fn();
    renderHook(() => useLiveLocation({ active: false, onFix }));
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });
});
