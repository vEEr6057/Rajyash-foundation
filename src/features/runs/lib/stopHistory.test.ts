import { describe, it, expect } from "vitest";
import {
  buildStopTimeline,
  buildStopHistory,
  type StopTimelineInput,
  type StopStatusEventLike,
} from "./stopHistory";

describe("buildStopTimeline", () => {
  it("orders completed stops chronologically by doneAt", () => {
    const stops: StopTimelineInput[] = [
      { id: "s2", kind: "drop", address: "Shelter B", doneAt: new Date("2026-07-05T09:00:00Z") },
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: new Date("2026-07-05T08:00:00Z") },
    ];
    const rows = buildStopTimeline(stops);
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2"]);
  });

  it("excludes stops that aren't done yet (doneAt null)", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: new Date("2026-07-05T08:00:00Z") },
      { id: "s2", kind: "drop", address: "Shelter B", doneAt: null },
    ];
    const rows = buildStopTimeline(stops);
    expect(rows.map((r) => r.id)).toEqual(["s1"]);
  });

  it("returns an empty list when no stops are done yet", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: null },
    ];
    expect(buildStopTimeline(stops)).toEqual([]);
  });
});

describe("buildStopHistory", () => {
  const actorNameById = new Map([["drv-1", "Rakesh"], ["admin-1", "Priya"]]);

  it("orders multiple events chronologically with actor + status labels resolved", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: new Date("2026-07-05T10:00:00Z") },
    ];
    const events: StopStatusEventLike[] = [
      {
        id: "e2",
        stopId: "s1",
        fromStatus: "done",
        toStatus: "skipped",
        actorId: "admin-1",
        createdAt: new Date("2026-07-05T10:00:00Z"),
      },
      {
        id: "e1",
        stopId: "s1",
        fromStatus: "pending",
        toStatus: "done",
        actorId: "drv-1",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStopHistory(stops, events, actorNameById, "Unknown");
    expect(rows.map((r) => r.id)).toEqual(["e1", "e2"]);
    expect(rows[0]).toMatchObject({
      fromStatus: "pending",
      toStatus: "done",
      actorName: "Rakesh",
      isLegacy: false,
    });
    expect(rows[1]).toMatchObject({
      fromStatus: "done",
      toStatus: "skipped",
      actorName: "Priya",
      isLegacy: false,
    });
  });

  it("falls back to the completion-time-only line when a stop has NO events (legacy rows)", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "drop", address: "Shelter B", doneAt: new Date("2026-07-05T08:00:00Z") },
    ];
    const rows = buildStopHistory(stops, [], actorNameById, "Unknown");
    expect(rows).toEqual([
      {
        id: "s1",
        stopId: "s1",
        kind: "drop",
        address: "Shelter B",
        fromStatus: null,
        toStatus: "done",
        actorName: null,
        createdAt: stops[0].doneAt,
        isLegacy: true,
      },
    ]);
  });

  it("falls back to the unknown-actor label when the actor isn't in the map", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: null },
    ];
    const events: StopStatusEventLike[] = [
      {
        id: "e1",
        stopId: "s1",
        fromStatus: null,
        toStatus: "pending",
        actorId: "ghost",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStopHistory(stops, events, actorNameById, "Unknown");
    expect(rows[0].actorName).toBe("Unknown");
  });

  it("mixes events for one stop with a legacy fallback for another (no events) in one chronological list", () => {
    const stops: StopTimelineInput[] = [
      { id: "s1", kind: "pickup", address: "Restaurant A", doneAt: null },
      { id: "s2", kind: "drop", address: "Shelter B", doneAt: new Date("2026-07-05T07:00:00Z") },
    ];
    const events: StopStatusEventLike[] = [
      {
        id: "e1",
        stopId: "s1",
        fromStatus: "pending",
        toStatus: "done",
        actorId: "drv-1",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStopHistory(stops, events, actorNameById, "Unknown");
    expect(rows.map((r) => r.stopId)).toEqual(["s2", "s1"]); // s2 (legacy, 07:00) before s1's event (09:00)
    expect(rows[0].isLegacy).toBe(true);
    expect(rows[1].isLegacy).toBe(false);
  });
});
