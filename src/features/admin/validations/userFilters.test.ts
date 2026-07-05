import { describe, it, expect } from "vitest";
import { userFiltersSchema, parseUserFilters } from "./userFilters";

describe("userFiltersSchema (UX-13)", () => {
  it("accepts a known role", () => {
    expect(userFiltersSchema.safeParse({ role: "driver" }).success).toBe(true);
  });
  it("rejects an unknown role", () => {
    expect(userFiltersSchema.safeParse({ role: "wizard" }).success).toBe(false);
  });
  it("treats blank q/role as absent", () => {
    const r = userFiltersSchema.safeParse({ q: "   ", role: "" });
    expect(
      r.success && r.data.q === undefined && r.data.role === undefined,
    ).toBe(true);
  });
  it("trims q", () => {
    const r = userFiltersSchema.safeParse({ q: "  ravi  " });
    expect(r.success && r.data.q).toBe("ravi");
  });
});

describe("parseUserFilters", () => {
  it("builds the repo filter from query params, dropping blanks", () => {
    const f = parseUserFilters(new URLSearchParams("q=ravi&role="));
    expect(f.q).toBe("ravi");
    expect(f.role).toBeUndefined();
  });

  it("combines q and role when both are present", () => {
    const f = parseUserFilters(new URLSearchParams("q=ravi&role=driver"));
    expect(f).toEqual({ q: "ravi", role: "driver" });
  });

  it("drops an unrecognized role rather than passing it through to the repo", () => {
    const f = parseUserFilters(new URLSearchParams("role=wizard"));
    expect(f.role).toBeUndefined();
  });
});
