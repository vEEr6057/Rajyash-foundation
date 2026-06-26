import { describe, it, expect } from "vitest";
import { buildEventId } from "./events";

describe("buildEventId (NOT-05 dedup key, Open Q1)", () => {
  it("uses the :created literal for a new pickup", () => {
    expect(buildEventId("created", "pk1")).toBe("pk1:created");
  });
  it("keys a status transition on its target status", () => {
    expect(buildEventId("delivered", "pk1")).toBe("pk1:delivered");
  });
  it("produces distinct ids for different transitions of the same pickup", () => {
    const ids = ["created", "claimed", "en_route", "delivered"].map((t) =>
      buildEventId(t, "pk1"),
    );
    expect(new Set(ids).size).toBe(4);
  });
});
