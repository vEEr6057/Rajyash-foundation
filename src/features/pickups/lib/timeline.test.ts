import { describe, it, expect } from "vitest";
import { buildStatusTimeline } from "./timeline";

const createdAt = new Date("2026-07-01T10:00:00Z");
const updatedAt = new Date("2026-07-01T10:05:00Z");

describe("buildStatusTimeline", () => {
  it("marks only 'posted' as current right after creation, with no other timestamps", () => {
    const stages = buildStatusTimeline({ status: "requested", createdAt, updatedAt }, []);
    expect(stages.map((s) => s.key)).toEqual(["posted", "claimed", "en_route", "delivered"]);
    expect(stages[0]).toMatchObject({ isCurrent: true, isDone: true, timestamp: createdAt });
    expect(stages[1]).toMatchObject({ isCurrent: false, isDone: false, timestamp: null });
  });

  it("marks 'claimed' current and done, 'posted' done, later stages not reached", () => {
    const acceptedAt = new Date("2026-07-01T11:00:00Z");
    const stages = buildStatusTimeline(
      { status: "accepted", createdAt, updatedAt },
      [{ toStatus: "accepted", createdAt: acceptedAt }],
    );
    expect(stages[0]).toMatchObject({ isDone: true, isCurrent: false });
    expect(stages[1]).toMatchObject({ isDone: true, isCurrent: true, timestamp: acceptedAt });
    expect(stages[2]).toMatchObject({ isDone: false, isCurrent: false, timestamp: null });
    expect(stages[3]).toMatchObject({ isDone: false, isCurrent: false, timestamp: null });
  });

  it("folds picked_up into the 'en_route' stage and keeps it current", () => {
    const enRouteAt = new Date("2026-07-01T12:00:00Z");
    const pickedUpAt = new Date("2026-07-01T12:30:00Z");
    const stages = buildStatusTimeline(
      { status: "picked_up", createdAt, updatedAt },
      [
        { toStatus: "accepted", createdAt: new Date("2026-07-01T11:00:00Z") },
        { toStatus: "en_route", createdAt: enRouteAt },
        { toStatus: "picked_up", createdAt: pickedUpAt },
      ],
    );
    const enRouteStage = stages.find((s) => s.key === "en_route")!;
    // Entry time into the merged stage = when it FIRST entered en_route, not
    // the later picked_up sub-transition.
    expect(enRouteStage).toMatchObject({ isCurrent: true, isDone: true, timestamp: enRouteAt });
    expect(stages.find((s) => s.key === "delivered")).toMatchObject({
      isDone: false,
      isCurrent: false,
      timestamp: null,
    });
  });

  it("marks every stage done and 'delivered' current on delivery", () => {
    const deliveredAt = new Date("2026-07-01T13:00:00Z");
    const stages = buildStatusTimeline(
      { status: "delivered", createdAt, updatedAt },
      [
        { toStatus: "accepted", createdAt: new Date("2026-07-01T11:00:00Z") },
        { toStatus: "en_route", createdAt: new Date("2026-07-01T12:00:00Z") },
        { toStatus: "picked_up", createdAt: new Date("2026-07-01T12:30:00Z") },
        { toStatus: "delivered", createdAt: deliveredAt },
      ],
    );
    expect(stages.every((s) => s.isDone)).toBe(true);
    expect(stages.find((s) => s.key === "delivered")).toMatchObject({
      isCurrent: true,
      timestamp: deliveredAt,
    });
  });

  it("collapses to a 2-stage posted→cancelled timeline, using updatedAt when no cancel event was recorded", () => {
    // Donor cancel (pickupActions.cancelPickup) never writes a status_events
    // row — the mapper must still surface a sensible cancelled timestamp.
    const stages = buildStatusTimeline({ status: "cancelled", createdAt, updatedAt }, []);
    expect(stages).toEqual([
      { key: "posted", timestamp: createdAt, isCurrent: false, isDone: true },
      { key: "cancelled", timestamp: updatedAt, isCurrent: true, isDone: true },
    ]);
  });

  it("prefers the recorded cancel event timestamp over updatedAt when one exists (sweeper path)", () => {
    const cancelledAt = new Date("2026-07-02T00:00:00Z");
    const stages = buildStatusTimeline(
      { status: "cancelled", createdAt, updatedAt },
      [{ toStatus: "cancelled", createdAt: cancelledAt }],
    );
    expect(stages[1]).toMatchObject({ timestamp: cancelledAt });
  });
});
