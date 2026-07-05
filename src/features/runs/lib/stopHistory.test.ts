import { describe, it, expect } from "vitest";
import { buildStopTimeline, type StopTimelineInput } from "./stopHistory";

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
