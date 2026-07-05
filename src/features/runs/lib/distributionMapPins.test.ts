import { describe, it, expect } from "vitest";
import type { RunStop } from "@/server/db/schema";
import { toDistributionMapPins } from "./distributionMapPins";

function makeStop(overrides: Partial<RunStop>): RunStop {
  return {
    id: "stop-1",
    runId: "run-1",
    seq: 1,
    kind: "drop",
    partnerId: null,
    destinationId: null,
    address: "Community Kitchen, Satellite",
    lat: 23.03,
    lng: 72.55,
    status: "pending",
    doneAt: null,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  } as RunStop;
}

describe("toDistributionMapPins", () => {
  it("returns a pin for a drop stop that has coordinates", () => {
    const pins = toDistributionMapPins([
      { meta: "Evening · 5 Jul", dropStops: [makeStop({ id: "s1" })] },
    ]);
    expect(pins).toEqual([
      {
        id: "s1",
        lat: 23.03,
        lng: 72.55,
        title: "Community Kitchen, Satellite",
        meta: "Evening · 5 Jul",
        status: "pending",
      },
    ]);
  });

  it("skips a stop missing lat or lng", () => {
    const pins = toDistributionMapPins([
      {
        meta: "Evening · 5 Jul",
        dropStops: [
          makeStop({ id: "s1", lat: null }),
          makeStop({ id: "s2", lng: null }),
          makeStop({ id: "s3" }),
        ],
      },
    ]);
    expect(pins.map((p) => p.id)).toEqual(["s3"]);
  });

  it("returns an empty array when no stop has coordinates", () => {
    const pins = toDistributionMapPins([
      {
        meta: "Morning · 5 Jul",
        dropStops: [makeStop({ id: "s1", lat: null, lng: null })],
      },
    ]);
    expect(pins).toEqual([]);
  });

  it("falls back to an em-dash title when the stop has no address", () => {
    const pins = toDistributionMapPins([
      { meta: "Morning · 5 Jul", dropStops: [makeStop({ id: "s1", address: null })] },
    ]);
    expect(pins[0].title).toBe("—");
  });

  it("carries each run's own meta and status through, across multiple runs", () => {
    const pins = toDistributionMapPins([
      { meta: "Morning · 5 Jul", dropStops: [makeStop({ id: "s1", status: "done" })] },
      { meta: "Evening · 5 Jul", dropStops: [makeStop({ id: "s2", status: "pending" })] },
    ]);
    expect(pins).toEqual([
      expect.objectContaining({ id: "s1", meta: "Morning · 5 Jul", status: "done" }),
      expect.objectContaining({ id: "s2", meta: "Evening · 5 Jul", status: "pending" }),
    ]);
  });
});
