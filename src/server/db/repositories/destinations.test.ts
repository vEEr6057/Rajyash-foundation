import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the drizzle db client so we never touch a real DB.
const mockSelect = vi.fn();
vi.mock("@/server/db/client", () => ({
  getDb: () => ({ select: mockSelect }),
}));

import { destinationsRepo } from "./destinations";

// Chainable builder — every query-builder method returns a thenable that resolves
// to the stubbed rows, regardless of which method ends the chain (mirrors the
// pattern in runStops.test.ts).
function chainBuilder(result: unknown[]) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "orderBy"])
    b[m] = vi.fn(() => ({ ...b, then: (r: (v: unknown) => unknown) => r(result) }));
  b.then = (r: (v: unknown) => unknown) => r(result);
  return b;
}

beforeEach(() => mockSelect.mockReset());

// UX-15: destination pickers/selects must default to active-only so a
// deactivated drop point can't be chosen for a new stop; the admin LIST page
// still wants every row (active + inactive, badge distinguishes them).
describe("destinationsRepo.list", () => {
  it("returns every destination with no filter by default (LIST page)", async () => {
    const chain = chainBuilder([
      { id: "d1", active: true },
      { id: "d2", active: false },
    ]);
    mockSelect.mockReturnValue(chain);

    const rows = await destinationsRepo.list();

    expect(rows).toHaveLength(2);
    expect(chain.where).not.toHaveBeenCalled();
  });

  it("filters to active-only when a picker asks for it", async () => {
    const chain = chainBuilder([{ id: "d1", active: true }]);
    mockSelect.mockReturnValue(chain);

    const rows = await destinationsRepo.list({ activeOnly: true });

    expect(rows).toEqual([{ id: "d1", active: true }]);
    expect(chain.where).toHaveBeenCalledOnce();
  });
});
