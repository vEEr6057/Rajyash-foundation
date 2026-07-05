import { describe, it, expect } from "vitest";
import {
  bucketPickupStatuses,
  bucketRunStatuses,
  extractDeliveredImpact,
  extractDirectoryCounts,
} from "./overview";

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

// UX-11: getAdminOverview folds the all-time impact tile into the SAME GROUP BY
// status query as the pickup buckets (one round trip instead of two) — this pins
// down that the merge picks the right row and stays zeroed when there's no data,
// same as the old separate impactReport() call would have returned.
describe("extractDeliveredImpact", () => {
  it("pulls servings/kg/count from the 'delivered' row only", () => {
    const impact = extractDeliveredImpact([
      { status: "requested", n: 3, servings: 0, kg: 0 },
      { status: "delivered", n: 10, servings: 120, kg: 45 },
      { status: "cancelled", n: 2, servings: 0, kg: 0 },
    ]);
    expect(impact).toEqual({ servings: 120, kg: 45, count: 10 });
  });

  it("returns zeros when there's no delivered row yet", () => {
    const impact = extractDeliveredImpact([{ status: "requested", n: 1, servings: 0, kg: 0 }]);
    expect(impact).toEqual({ servings: 0, kg: 0, count: 0 });
  });
});

// UX-11: partners-count + destinations-count merged into one UNION ALL round
// trip, tagged by `kind` — this pins down the un-merge back into the same
// { partners, destinations } shape callers relied on before.
describe("extractDirectoryCounts", () => {
  it("maps the unioned kind/n rows back to named counts", () => {
    const counts = extractDirectoryCounts([
      { kind: "partners", n: 12 },
      { kind: "destinations", n: 7 },
    ]);
    expect(counts).toEqual({ partners: 12, destinations: 7 });
  });

  it("treats a missing kind as zero", () => {
    const counts = extractDirectoryCounts([{ kind: "partners", n: 5 }]);
    expect(counts).toEqual({ partners: 5, destinations: 0 });
  });
});
