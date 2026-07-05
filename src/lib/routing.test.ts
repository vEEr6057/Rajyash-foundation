import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  haversineKm,
  formatDistance,
  estimateEtaMinutes,
  straightLineRoute,
  movedEnough,
} from "./routing";

describe("haversineMeters", () => {
  it("is ~0 for identical points", () => {
    expect(haversineMeters({ lat: 23, lng: 72 }, { lat: 23, lng: 72 })).toBeCloseTo(0, 5);
  });
  it("matches a known short distance (~1.11km per 0.01° lat)", () => {
    const d = haversineMeters({ lat: 23.0, lng: 72.0 }, { lat: 23.01, lng: 72.0 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});

describe("haversineKm", () => {
  it("matches a known distance (~1.11km per 0.01° lat)", () => {
    const km = haversineKm({ lat: 23.0, lng: 72.0 }, { lat: 23.01, lng: 72.0 });
    expect(km).toBeGreaterThan(1.1);
    expect(km).toBeLessThan(1.12);
  });
  it("is the metres version divided by 1000", () => {
    const a = { lat: 23.0, lng: 72.0 };
    const b = { lat: 23.05, lng: 72.03 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineMeters(a, b) / 1000, 9);
  });
});

describe("formatDistance", () => {
  it("shows sub-km distances rounded to the nearest 10m", () => {
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(0.849)).toBe("850 m");
  });
  it("shows a short distance under 1km in metres", () => {
    expect(formatDistance(0.05)).toBe("50 m");
  });
  it("shows km with one decimal at/above 1km", () => {
    expect(formatDistance(2.34)).toBe("2.3 km");
    expect(formatDistance(1)).toBe("1.0 km");
  });
  it("rolls a value that rounds up to 1000m over to km, not '1000 m'", () => {
    expect(formatDistance(0.999)).toBe("1.0 km");
  });
});

describe("estimateEtaMinutes", () => {
  it("estimates ~10 min for 3km at 18km/h", () => {
    expect(estimateEtaMinutes(3000, 18)).toBe(10);
  });
  it("never returns less than 1", () => {
    expect(estimateEtaMinutes(5)).toBe(1);
  });
});

describe("straightLineRoute", () => {
  it("returns the two endpoints as [lat,lng] pairs", () => {
    expect(straightLineRoute({ lat: 23, lng: 72 }, { lat: 24, lng: 73 })).toEqual([
      [23, 72],
      [24, 73],
    ]);
  });
});

describe("movedEnough", () => {
  it("is true when there is no previous fix", () => {
    expect(movedEnough(null, { lat: 23, lng: 72 })).toBe(true);
  });
  it("is false for a tiny move under the threshold", () => {
    expect(movedEnough({ lat: 23, lng: 72 }, { lat: 23.0001, lng: 72 })).toBe(false);
  });
  it("is true once the move exceeds ~200m", () => {
    expect(movedEnough({ lat: 23, lng: 72 }, { lat: 23.01, lng: 72 })).toBe(true);
  });
});
