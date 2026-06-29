import { describe, it, expect } from "vitest";
import { bucketPickupStatuses, bucketRunStatuses } from "./overview";

describe("bucketPickupStatuses", () => {
  it("groups in-progress statuses and sums total", () => {
    const b = bucketPickupStatuses([
      { status: "requested", n: 3 },
      { status: "accepted", n: 2 },
      { status: "en_route", n: 1 },
      { status: "picked_up", n: 1 },
      { status: "delivered", n: 10 },
      { status: "cancelled", n: 4 },
    ]);
    expect(b).toEqual({ total: 21, open: 3, inProgress: 4, delivered: 10, cancelled: 4 });
  });

  it("treats missing statuses as zero", () => {
    const b = bucketPickupStatuses([{ status: "delivered", n: 5 }]);
    expect(b).toEqual({ total: 5, open: 0, inProgress: 0, delivered: 5, cancelled: 0 });
  });
});

describe("bucketRunStatuses", () => {
  it("surfaces active/planned/completed and total", () => {
    const b = bucketRunStatuses([
      { status: "active", n: 2 },
      { status: "planned", n: 3 },
      { status: "completed", n: 7 },
      { status: "cancelled", n: 1 },
    ]);
    expect(b).toEqual({ total: 13, active: 2, planned: 3, completed: 7 });
  });
});
