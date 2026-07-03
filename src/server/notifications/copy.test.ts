import { describe, it, expect } from "vitest";
import { buildCopy } from "./copy";

describe("buildCopy (single source of truth, EN)", () => {
  it("created -> volunteer 'new pickup' alert, links to the pickup", () => {
    const c = buildCopy("pickup/created", { pickupId: "pk1" });
    expect(c.title).toMatch(/new pickup/i);
    expect(c.url).toBe("/portal/pickups/pk1");
  });
  it("claimed -> addresses the donor", () => {
    expect(buildCopy("pickup/claimed", { pickupId: "pk1" }).title).toMatch(/claimed/i);
  });
  it("delivered status -> a distinct delivered message", () => {
    const c = buildCopy("pickup/status_changed", { pickupId: "pk1", toStatus: "delivered" });
    expect(c.title).toMatch(/deliver/i);
  });
  it("unknown status -> a safe fallback (no throw)", () => {
    expect(
      buildCopy("pickup/status_changed", { pickupId: "pk1", toStatus: "weird" }).title,
    ).toBeTruthy();
  });
});

describe("buildCopy run events (B3)", () => {
  it("run/assigned -> driver run route, body carries the slot + date", () => {
    const c = buildCopy("run/assigned", {
      runId: "r1",
      slot: "morning",
      runDate: new Date("2026-07-04T00:00:00Z"),
    });
    expect(c.title).toMatch(/assigned/i);
    expect(c.url).toBe("/portal/run");
    expect(c.body).toMatch(/Morning drive/);
  });
  it("run/completed -> links to the admin run page", () => {
    const c = buildCopy("run/completed", { runId: "r7", slot: "night" });
    expect(c.title).toMatch(/completed/i);
    expect(c.url).toBe("/admin/runs/r7");
    expect(c.body).toMatch(/Night drive/);
  });
});

describe("buildCopy recipient-locale (B3)", () => {
  it("returns Gujarati copy for gu", () => {
    expect(buildCopy("pickup/claimed", { pickupId: "pk1" }, "gu").title).toBe(
      "તમારું પિકઅપ લેવાયું",
    );
    expect(buildCopy("run/assigned", { runId: "r1", slot: "morning" }, "gu").title).toBe(
      "તમને એક રન સોંપાયો",
    );
  });
  it("returns Hindi copy for hi", () => {
    expect(buildCopy("pickup/claimed", { pickupId: "pk1" }, "hi").title).toBe(
      "आपका पिकअप ले लिया गया",
    );
    expect(buildCopy("run/completed", { runId: "r1", slot: "night" }, "hi").title).toBe(
      "रन पूरा हुआ",
    );
  });
  it("falls back to English for an unknown locale", () => {
    expect(buildCopy("pickup/claimed", { pickupId: "pk1" }, "fr").title).toMatch(/claimed/i);
  });
});
