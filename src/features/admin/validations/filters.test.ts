import { describe, it, expect } from "vitest";
import { filtersSchema, parseAdminFilters } from "./filters";

describe("filtersSchema (ADM-01)", () => {
  it("accepts a known status", () => {
    expect(filtersSchema.safeParse({ status: "delivered" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(filtersSchema.safeParse({ status: "teleported" }).success).toBe(
      false,
    );
  });
  it("coerces an ISO date string to a Date", () => {
    const r = filtersSchema.safeParse({ from: "2026-06-01" });
    expect(r.success && r.data.from instanceof Date).toBe(true);
  });
  it("treats blank strings as absent", () => {
    const r = filtersSchema.safeParse({ status: "", donorId: "  " });
    expect(
      r.success && r.data.status === undefined && r.data.donorId === undefined,
    ).toBe(true);
  });
});

describe("parseAdminFilters", () => {
  it("builds the repo filter from query params, dropping blanks", () => {
    const f = parseAdminFilters(
      new URLSearchParams("status=requested&donorId=&from=2026-06-01"),
    );
    expect(f.status).toBe("requested");
    expect(f.donorId).toBeUndefined();
    expect(f.from instanceof Date).toBe(true);
  });
});
