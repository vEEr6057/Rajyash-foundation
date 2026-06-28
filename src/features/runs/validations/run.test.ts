import { describe, it, expect } from "vitest";
import {
  createRunSchema,
  addPickupStopSchema,
  addDropStopSchema,
  reorderSchema,
} from "./run";

describe("createRunSchema", () => {
  it("accepts a valid run with slot + date + optional driver", () => {
    const r = createRunSchema.safeParse({
      slot: "morning",
      runDate: "2026-07-01",
      driverId: "drv-1",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.runDate).toBeInstanceOf(Date);
  });
  it("rejects a missing slot", () => {
    const r = createRunSchema.safeParse({ runDate: "2026-07-01" });
    expect(r.success).toBe(false);
  });
});

describe("addPickupStopSchema", () => {
  it("requires partnerId + positive seq", () => {
    expect(
      addPickupStopSchema.safeParse({ runId: "r1", partnerId: "p1", seq: 1 }).success,
    ).toBe(true);
    expect(
      addPickupStopSchema.safeParse({ runId: "r1", partnerId: "", seq: 1 }).success,
    ).toBe(false);
    expect(
      addPickupStopSchema.safeParse({ runId: "r1", partnerId: "p1", seq: 0 }).success,
    ).toBe(false);
  });
});

describe("addDropStopSchema", () => {
  it("accepts a saved destination", () => {
    expect(
      addDropStopSchema.safeParse({ runId: "r1", seq: 1, destinationId: "d1" }).success,
    ).toBe(true);
  });
  it("accepts an ad-hoc address", () => {
    expect(
      addDropStopSchema.safeParse({ runId: "r1", seq: 1, address: "Satellite, Ahmedabad" })
        .success,
    ).toBe(true);
  });
  it("rejects when neither destination nor address is given", () => {
    const r = addDropStopSchema.safeParse({ runId: "r1", seq: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/destination or an address/i);
  });
});

describe("reorderSchema", () => {
  it("requires at least one item", () => {
    expect(reorderSchema.safeParse({ runId: "r1", items: [] }).success).toBe(false);
    expect(
      reorderSchema.safeParse({ runId: "r1", items: [{ id: "s1", seq: 1 }] }).success,
    ).toBe(true);
  });
});
