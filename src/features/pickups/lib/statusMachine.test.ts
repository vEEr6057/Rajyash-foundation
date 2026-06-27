import { describe, it, expect } from "vitest";
import { canTransition, nextStatus, isDeliveringTransition } from "./statusMachine";

describe("canTransition", () => {
  it("allows the happy forward path", () => {
    expect(canTransition("requested", "accepted")).toBe(true);
    expect(canTransition("accepted", "en_route")).toBe(true);
    expect(canTransition("en_route", "picked_up")).toBe(true);
    expect(canTransition("picked_up", "delivered")).toBe(true);
  });

  it("allows donor cancel only from requested", () => {
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("accepted", "cancelled")).toBe(false);
  });

  it("blocks skipping a step", () => {
    expect(canTransition("requested", "picked_up")).toBe(false);
    expect(canTransition("accepted", "delivered")).toBe(false);
  });

  it("blocks transitions out of terminal states", () => {
    expect(canTransition("delivered", "picked_up")).toBe(false);
    expect(canTransition("cancelled", "accepted")).toBe(false);
  });

  it("blocks going backwards", () => {
    expect(canTransition("en_route", "accepted")).toBe(false);
  });
});

describe("nextStatus", () => {
  it("returns the next forward status (never cancelled)", () => {
    expect(nextStatus("requested")).toBe("accepted");
    expect(nextStatus("accepted")).toBe("en_route");
    expect(nextStatus("picked_up")).toBe("delivered");
  });
  it("returns null for terminal states", () => {
    expect(nextStatus("delivered")).toBeNull();
    expect(nextStatus("cancelled")).toBeNull();
  });
});

describe("isDeliveringTransition", () => {
  it("is true only for picked_up → delivered", () => {
    expect(isDeliveringTransition("picked_up", "delivered")).toBe(true);
    expect(isDeliveringTransition("en_route", "picked_up")).toBe(false);
  });
});
