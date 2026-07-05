import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the drizzle db client so we never touch a real DB.
const mockSelect = vi.fn();
vi.mock("@/server/db/client", () => ({
  getDb: () => ({ select: mockSelect }),
}));

// Spy on the real drizzle-orm query-builder functions (not stubbed out) so we can
// assert HOW listAll composes its WHERE clause — which columns/values eq/ilike/or/
// and were actually called with — without hand-rolling SQL introspection.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(actual.eq),
    ilike: vi.fn(actual.ilike),
    or: vi.fn(actual.or),
    and: vi.fn(actual.and),
  };
});

import { eq, ilike, or, and } from "drizzle-orm";
import { profiles } from "@/server/db/schema";
import { profilesRepo } from "./profiles";

// Chainable builder — every query-builder method returns a thenable that resolves
// to the stubbed rows, regardless of which method ends the chain (mirrors the
// pattern in destinations.test.ts / runStops.test.ts).
function chainBuilder(result: unknown[]) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "orderBy"])
    b[m] = vi.fn(() => ({ ...b, then: (r: (v: unknown) => unknown) => r(result) }));
  b.then = (r: (v: unknown) => unknown) => r(result);
  return b;
}

beforeEach(() => {
  mockSelect.mockReset();
  vi.mocked(eq).mockClear();
  vi.mocked(ilike).mockClear();
  vi.mocked(or).mockClear();
  vi.mocked(and).mockClear();
});

describe("profilesRepo.listAll (UX-13 search + role filter)", () => {
  it("skips where() entirely when q/role are both absent", async () => {
    const chain = chainBuilder([{ id: "u1" }]);
    mockSelect.mockReturnValue(chain);

    const rows = await profilesRepo.listAll();

    expect(rows).toEqual([{ id: "u1" }]);
    expect(chain.where).not.toHaveBeenCalled();
  });

  it("filters by role via eq(profiles.role, role)", async () => {
    const chain = chainBuilder([{ id: "u1", role: "driver" }]);
    mockSelect.mockReturnValue(chain);

    await profilesRepo.listAll({ role: "driver" });

    expect(eq).toHaveBeenCalledWith(profiles.role, "driver");
    expect(or).not.toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
  });

  it("matches q against name OR email via case-insensitive ilike", async () => {
    const chain = chainBuilder([{ id: "u1", name: "Ravi" }]);
    mockSelect.mockReturnValue(chain);

    await profilesRepo.listAll({ q: "ravi" });

    expect(ilike).toHaveBeenCalledWith(profiles.name, "%ravi%");
    expect(ilike).toHaveBeenCalledWith(profiles.email, "%ravi%");
    expect(or).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
  });

  it("combines q and role into one AND'd where clause", async () => {
    const chain = chainBuilder([]);
    mockSelect.mockReturnValue(chain);

    await profilesRepo.listAll({ q: "ravi", role: "driver" });

    expect(eq).toHaveBeenCalledWith(profiles.role, "driver");
    expect(ilike).toHaveBeenCalledWith(profiles.name, "%ravi%");
    expect(ilike).toHaveBeenCalledWith(profiles.email, "%ravi%");
    expect(or).toHaveBeenCalled();
    expect(and).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
  });
});
