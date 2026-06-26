import { describe, it, expect } from "vitest";
import { buildCopy } from "./copy";

describe("buildCopy (single source of truth)", () => {
  it("created -> volunteer 'new pickup' alert, links to the pickup", () => {
    const c = buildCopy({ eventName: "pickup/created", pickupId: "pk1" });
    expect(c.title).toMatch(/new pickup/i);
    expect(c.url).toBe("/portal/pickups/pk1");
  });
  it("claimed -> addresses the donor", () => {
    expect(
      buildCopy({ eventName: "pickup/claimed", pickupId: "pk1" }).title,
    ).toMatch(/claimed/i);
  });
  it("delivered status -> a distinct delivered message", () => {
    const c = buildCopy({
      eventName: "pickup/status_changed",
      pickupId: "pk1",
      toStatus: "delivered",
    });
    expect(c.title).toMatch(/deliver/i);
  });
  it("unknown status -> a safe fallback (no throw)", () => {
    expect(
      buildCopy({
        eventName: "pickup/status_changed",
        pickupId: "pk1",
        toStatus: "weird",
      }).title,
    ).toBeTruthy();
  });
});
