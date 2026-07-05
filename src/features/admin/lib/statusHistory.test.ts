import { describe, it, expect } from "vitest";
import { buildStatusHistory, type StatusEventLike } from "./statusHistory";

const UNKNOWN = "Unknown";

describe("buildStatusHistory", () => {
  it("orders events chronologically even when the input is out of order", () => {
    const events: StatusEventLike[] = [
      {
        id: "e2",
        fromStatus: "accepted",
        toStatus: "en_route",
        actorId: "u1",
        createdAt: new Date("2026-07-05T10:00:00Z"),
      },
      {
        id: "e1",
        fromStatus: "requested",
        toStatus: "accepted",
        actorId: "u1",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStatusHistory(events, new Map([["u1", "Priya"]]), UNKNOWN);
    expect(rows.map((r) => r.id)).toEqual(["e1", "e2"]);
  });

  it("resolves the actor id to a display name via the lookup map", () => {
    const events: StatusEventLike[] = [
      {
        id: "e1",
        fromStatus: "requested",
        toStatus: "accepted",
        actorId: "admin-1",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStatusHistory(events, new Map([["admin-1", "Coordinator Ravi"]]), UNKNOWN);
    expect(rows[0].actorName).toBe("Coordinator Ravi");
  });

  it("falls back to the unknown-actor label when the actor isn't in the lookup map", () => {
    const events: StatusEventLike[] = [
      {
        id: "e1",
        fromStatus: "requested",
        toStatus: "cancelled",
        actorId: "deleted-user",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStatusHistory(events, new Map(), UNKNOWN);
    expect(rows[0].actorName).toBe(UNKNOWN);
  });

  it("carries a null fromStatus through untouched (e.g. a future 'created' event)", () => {
    const events: StatusEventLike[] = [
      {
        id: "e1",
        fromStatus: null,
        toStatus: "requested",
        actorId: "donor-1",
        createdAt: new Date("2026-07-05T09:00:00Z"),
      },
    ];
    const rows = buildStatusHistory(events, new Map([["donor-1", "Meera"]]), UNKNOWN);
    expect(rows[0].fromStatus).toBeNull();
    expect(rows[0].toStatus).toBe("requested");
  });
});
