import { describe, it, expect } from "vitest";
import { partnerSchema } from "./partner";

describe("partnerSchema (ADM-04)", () => {
  it("accepts a minimal valid partner", () => {
    expect(
      partnerSchema.safeParse({ name: "Hotel A", type: "restaurant" }).success,
    ).toBe(true);
  });
  it("rejects an empty name with the user message", () => {
    const r = partnerSchema.safeParse({ name: "", type: "restaurant" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/partner name/i);
  });
  it("rejects an unknown type", () => {
    expect(
      partnerSchema.safeParse({ name: "X", type: "spaceship" }).success,
    ).toBe(false);
  });
  it("rejects a malformed contact email", () => {
    const r = partnerSchema.safeParse({
      name: "X",
      type: "other",
      contactEmail: "not-an-email",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/email/i);
  });
  it("accepts a blank optional email", () => {
    expect(
      partnerSchema.safeParse({ name: "X", type: "other", contactEmail: "" })
        .success,
    ).toBe(true);
  });
});
