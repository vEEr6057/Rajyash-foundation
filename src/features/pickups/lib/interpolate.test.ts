import { describe, it, expect } from "vitest";
import { lerp, interpolateLatLng } from "./interpolate";

describe("lerp", () => {
  it("returns endpoints at t=0 and t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });
  it("returns the midpoint at t=0.5", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe("interpolateLatLng", () => {
  const a = { lat: 23.0, lng: 72.0 };
  const b = { lat: 23.2, lng: 72.4 };
  it("interpolates both axes", () => {
    const mid = interpolateLatLng(a, b, 0.5);
    expect(mid.lat).toBeCloseTo(23.1, 10);
    expect(mid.lng).toBeCloseTo(72.2, 10);
  });
  it("clamps t below 0 and above 1", () => {
    expect(interpolateLatLng(a, b, -1)).toEqual(a);
    expect(interpolateLatLng(a, b, 2)).toEqual(b);
  });
});
