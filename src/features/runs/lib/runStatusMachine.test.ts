import { describe, it, expect } from "vitest";
import {
  canRunTransition,
  canStopTransition,
  nextRunStatus,
  nextStopStatus,
  allStopsDone,
} from "./runStatusMachine";

describe("canRunTransition", () => {
  it("allows planned → active and planned → cancelled", () => {
    expect(canRunTransition("planned", "active")).toBe(true);
    expect(canRunTransition("planned", "cancelled")).toBe(true);
  });
  it("allows active → completed and active → cancelled", () => {
    expect(canRunTransition("active", "completed")).toBe(true);
    expect(canRunTransition("active", "cancelled")).toBe(true);
  });
  it("blocks terminal + backward transitions", () => {
    expect(canRunTransition("completed", "active")).toBe(false);
    expect(canRunTransition("cancelled", "active")).toBe(false);
    expect(canRunTransition("active", "planned")).toBe(false);
  });
});

describe("canStopTransition", () => {
  it("allows pending → done and pending → skipped", () => {
    expect(canStopTransition("pending", "done")).toBe(true);
    expect(canStopTransition("pending", "skipped")).toBe(true);
  });
  it("blocks transitions out of terminal states", () => {
    expect(canStopTransition("done", "pending")).toBe(false);
    expect(canStopTransition("skipped", "pending")).toBe(false);
  });
});

describe("nextRunStatus", () => {
  it("advances planned → active → completed, then null", () => {
    expect(nextRunStatus("planned")).toBe("active");
    expect(nextRunStatus("active")).toBe("completed");
    expect(nextRunStatus("completed")).toBeNull();
    expect(nextRunStatus("cancelled")).toBeNull();
  });
});

describe("nextStopStatus", () => {
  it("advances pending → done, then null", () => {
    expect(nextStopStatus("pending")).toBe("done");
    expect(nextStopStatus("done")).toBeNull();
    expect(nextStopStatus("skipped")).toBeNull();
  });
});

describe("allStopsDone", () => {
  it("is true when all stops are done", () => {
    expect(allStopsDone([{ status: "done" }, { status: "done" }])).toBe(true);
  });
  it("counts skipped as done for run-completion", () => {
    expect(allStopsDone([{ status: "done" }, { status: "skipped" }])).toBe(true);
  });
  it("is false when any stop is still pending", () => {
    expect(allStopsDone([{ status: "done" }, { status: "pending" }])).toBe(false);
  });
  it("is false for an empty run", () => {
    expect(allStopsDone([])).toBe(false);
  });
});
