import { describe, it, expect } from "vitest";
import { destinationSchema } from "./destination";

const VALID = { name: "Satellite Zone", lat: 23.022, lng: 72.571 };

describe("destinationSchema (DEST-01)", () => {
  it("accepts a minimal valid destination", () => {
    expect(destinationSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an empty name with the user message", () => {
    const r = destinationSchema.safeParse({ ...VALID, name: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/destination name/i);
  });

  it("rejects lat below −90", () => {
    const r = destinationSchema.safeParse({ ...VALID, lat: -91 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/latitude/i);
  });

  it("rejects lat above 90", () => {
    const r = destinationSchema.safeParse({ ...VALID, lat: 91 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/latitude/i);
  });

  it("rejects lng below −180", () => {
    const r = destinationSchema.safeParse({ ...VALID, lng: -181 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/longitude/i);
  });

  it("rejects lng above 180", () => {
    const r = destinationSchema.safeParse({ ...VALID, lng: 181 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/longitude/i);
  });

  it("accepts optional area and city", () => {
    expect(
      destinationSchema.safeParse({ ...VALID, area: "Maninagar", city: "Ahmedabad" })
        .success,
    ).toBe(true);
  });

  it("accepts blank area (empty string)", () => {
    expect(destinationSchema.safeParse({ ...VALID, area: "" }).success).toBe(true);
  });
});
