import { describe, it, expect } from "vitest";
import { pickupFormSchema } from "./pickup";

const base = {
  category: "cooked_meal",
  quantity: 10,
  quantityUnit: "servings",
  windowStart: "2026-07-01T10:00",
  windowEnd: "2026-07-01T12:00",
  address: "Satellite, Ahmedabad",
  lat: 23.0225,
  lng: 72.5714,
  safetyAttested: true,
};

describe("pickupFormSchema googleMapsUrl", () => {
  it("accepts a valid url", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "https://maps.app.goo.gl/x" });
    expect(r.success).toBe(true);
  });
  it("accepts an empty string (no link used)", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "" });
    expect(r.success).toBe(true);
  });
  it("accepts omission", () => {
    const r = pickupFormSchema.safeParse(base);
    expect(r.success).toBe(true);
  });
  it("rejects a non-url string", () => {
    const r = pickupFormSchema.safeParse({ ...base, googleMapsUrl: "not a url" });
    expect(r.success).toBe(false);
  });
});
