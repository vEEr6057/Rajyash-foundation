import { describe, it, expect } from "vitest";
import { onboardingSchema } from "./onboarding";

describe("onboardingSchema", () => {
  it("accepts a valid donor", () => {
    const r = onboardingSchema.safeParse({
      role: "donor",
      name: "Rajesh",
      city: "Ahmedabad",
    });
    expect(r.success).toBe(true);
  });

  it("accepts volunteer", () => {
    expect(
      onboardingSchema.safeParse({
        role: "volunteer",
        name: "Asha",
        city: "Ahmedabad",
      }).success,
    ).toBe(true);
  });

  it("rejects admin as a self-selected role", () => {
    const r = onboardingSchema.safeParse({
      role: "admin",
      name: "Rajesh",
      city: "Ahmedabad",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a name shorter than 2 chars with a user-facing message", () => {
    const r = onboardingSchema.safeParse({
      role: "donor",
      name: "A",
      city: "Ahmedabad",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("Please enter your name");
    }
  });

  it("rejects a missing role", () => {
    expect(
      onboardingSchema.safeParse({ name: "Rajesh", city: "Ahmedabad" }).success,
    ).toBe(false);
  });

  it("rejects an empty city", () => {
    expect(
      onboardingSchema.safeParse({ role: "donor", name: "Rajesh", city: "" })
        .success,
    ).toBe(false);
  });
});
