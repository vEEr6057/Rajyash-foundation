import { describe, it, expect } from "vitest";
import { sortByDistance, type DistanceSortable } from "./distanceSort";

const DRIVER = { lat: 23.0, lng: 72.0 };

function pickup(id: string, lat: number | null, lng: number | null): DistanceSortable {
  return { id, lat, lng };
}

describe("sortByDistance", () => {
  it("orders nearest-first from the driver's position", () => {
    const items = [
      pickup("far", 23.2, 72.0), // ~22km
      pickup("near", 23.01, 72.0), // ~1.1km
      pickup("mid", 23.05, 72.0), // ~5.5km
    ];
    const sorted = sortByDistance(items, DRIVER);
    expect(sorted.map((p) => p.id)).toEqual(["near", "mid", "far"]);
  });

  it("sorts pickups missing lat/lng last, preserving their relative order", () => {
    const items = [
      pickup("no-coords-1", null, null),
      pickup("near", 23.01, 72.0),
      pickup("no-coords-2", null, null),
      pickup("far", 23.2, 72.0),
    ];
    const sorted = sortByDistance(items, DRIVER);
    expect(sorted.map((p) => p.id)).toEqual(["near", "far", "no-coords-1", "no-coords-2"]);
  });

  it("treats a pickup with only one of lat/lng as missing coords", () => {
    const items = [pickup("near", 23.01, 72.0), pickup("half-coords", 23.05, null)];
    const sorted = sortByDistance(items, DRIVER);
    expect(sorted.map((p) => p.id)).toEqual(["near", "half-coords"]);
  });

  it("returns the input order unchanged when there is no position", () => {
    const items = [
      pickup("c", 23.2, 72.0),
      pickup("a", 23.01, 72.0),
      pickup("b", null, null),
    ];
    const sorted = sortByDistance(items, null);
    expect(sorted.map((p) => p.id)).toEqual(["c", "a", "b"]);
    expect(sorted).toBe(items); // same reference — no reorder work done at all
  });
});
