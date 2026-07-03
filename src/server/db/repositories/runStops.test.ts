import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the drizzle db client so we never touch a real DB.
const mockSelect = vi.fn();
vi.mock("@/server/db/client", () => ({
  getDb: () => ({ select: mockSelect }),
}));

import { runStopsRepo } from "./runStops";

// Chainable builder — every query-builder method returns a thenable that resolves
// to the stubbed rows, regardless of which method ends the chain.
function chainBuilder(result: unknown[]) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "groupBy"])
    b[m] = vi.fn(() => ({ ...b, then: (r: (v: unknown) => unknown) => r(result) }));
  b.then = (r: (v: unknown) => unknown) => r(result);
  return b;
}

beforeEach(() => mockSelect.mockReset());

describe("runStopsRepo.countByRunIds", () => {
  it("folds grouped rows into a { runId: count } map", async () => {
    mockSelect.mockReturnValue(
      chainBuilder([
        { runId: "r1", count: 3 },
        { runId: "r2", count: 1 },
      ]),
    );
    const counts = await runStopsRepo.countByRunIds(["r1", "r2", "r3"]);
    expect(counts).toEqual({ r1: 3, r2: 1 });
    // r3 has no stops → absent from the map (caller resolves via ?? 0).
    expect(counts.r3).toBeUndefined();
  });

  it("short-circuits to {} for an empty id list (no query issued)", async () => {
    const counts = await runStopsRepo.countByRunIds([]);
    expect(counts).toEqual({});
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
