import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the drizzle db client so we never hit a real DB.
const mockSelect = vi.fn();
vi.mock("@/server/db/client", () => ({
  getDb: () => ({
    select: mockSelect,
  }),
}));

// Import after mock
import { reportsRepo } from "./reports";

// Chainable builder helper — each query-builder method returns a thenable so `await`
// resolves to the stubbed rows regardless of which method ends the chain.
function chainBuilder(result: unknown[]) {
  const b: Record<string, unknown> = {};
  const methods = ["select", "from", "leftJoin", "where", "groupBy", "orderBy", "limit"];
  for (const m of methods)
    b[m] = vi.fn(() => ({ ...b, then: (r: (v: unknown) => unknown) => r(result) }));
  b.then = (r: (v: unknown) => unknown) => r(result);
  return b;
}

beforeEach(() => {
  mockSelect.mockReset();
});

describe("reportsRepo.runSummary", () => {
  it("returns an array of RunSummaryRow with correct shape", async () => {
    const stub = [
      {
        runId: "r1",
        runDate: "2026-06-01",
        slot: "morning",
        status: "completed",
        driverId: "d1",
        pickupStopCount: 2,
        dropStopCount: 3,
        completedDropCount: 3,
      },
    ];
    mockSelect.mockReturnValue(chainBuilder(stub));
    const rows = await reportsRepo.runSummary(new Date("2026-06-01"), new Date("2026-06-30"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      runId: "r1",
      slot: "morning",
      status: "completed",
      pickupStopCount: 2,
      dropStopCount: 3,
      completedDropCount: 3,
    });
  });

  it("returns an empty array when no runs match the date range", async () => {
    mockSelect.mockReturnValue(chainBuilder([]));
    const rows = await reportsRepo.runSummary(new Date("2020-01-01"), new Date("2020-01-02"));
    expect(rows).toEqual([]);
  });
});

describe("reportsRepo.destinationBreakdown", () => {
  it("returns destination rows with completedDropCount", async () => {
    const stub = [{ destinationId: "dest1", destinationName: "Zone A", completedDropCount: 4 }];
    mockSelect.mockReturnValue(chainBuilder(stub));
    const rows = await reportsRepo.destinationBreakdown(
      new Date("2026-06-01"),
      new Date("2026-06-30"),
    );
    expect(rows[0]).toMatchObject({ destinationName: "Zone A", completedDropCount: 4 });
  });

  it("passes through an 'Ad-hoc' coalesced row with null destinationId", async () => {
    const stub = [{ destinationId: null, destinationName: "Ad-hoc", completedDropCount: 1 }];
    mockSelect.mockReturnValue(chainBuilder(stub));
    const rows = await reportsRepo.destinationBreakdown(
      new Date("2026-06-01"),
      new Date("2026-06-30"),
    );
    expect(rows[0].destinationName).toBe("Ad-hoc");
    expect(rows[0].destinationId).toBeNull();
  });
});

describe("reportsRepo.partnerBreakdown", () => {
  it("returns per-partner servings/kg/count shape", async () => {
    const stub = [{ partnerId: "p1", partnerName: "Raj Hotel", servings: 50, kg: 10, count: 2 }];
    mockSelect.mockReturnValue(chainBuilder(stub));
    const rows = await reportsRepo.partnerBreakdown(
      new Date("2026-06-01"),
      new Date("2026-06-30"),
    );
    expect(rows[0]).toEqual({
      partnerId: "p1",
      partnerName: "Raj Hotel",
      servings: 50,
      kg: 10,
      count: 2,
    });
  });

  it("passes through an 'Unknown partner' coalesced row with null partnerId", async () => {
    const stub = [
      { partnerId: null, partnerName: "Unknown partner", servings: 20, kg: 0, count: 1 },
    ];
    mockSelect.mockReturnValue(chainBuilder(stub));
    const rows = await reportsRepo.partnerBreakdown(
      new Date("2026-06-01"),
      new Date("2026-06-30"),
    );
    expect(rows[0].partnerName).toBe("Unknown partner");
    expect(rows[0].partnerId).toBeNull();
  });
});
