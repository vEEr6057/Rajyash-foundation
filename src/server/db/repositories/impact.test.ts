import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before module import.
// unstable_cache: transparent pass-through so getCachedImpactReport IS the inner fn.
// We capture call args to verify the cache key + TTL options at import time.
// ---------------------------------------------------------------------------

const { impactReportMock, unstableCacheSpy } = vi.hoisted(() => {
  const calls: Parameters<typeof import("next/cache").unstable_cache>[] = [];
  return {
    impactReportMock: vi.fn(),
    unstableCacheSpy: {
      calls,
      fn: vi.fn(
        (
          fn: (...args: unknown[]) => Promise<unknown>,
          keys: string[],
          opts: object,
        ) => {
          // Record call so tests can inspect args (module loads before test body)
          calls.push([fn, keys, opts] as never);
          // Transparent pass-through — getCachedImpactReport becomes the inner fn
          return fn;
        },
      ),
    },
  };
});

// Stub pickupsRepo so we never hit a real DB
vi.mock("./pickups", () => ({
  pickupsRepo: {
    impactReport: impactReportMock,
  },
}));

// Transparent unstable_cache that records its call args
vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheSpy.fn,
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks.
// ---------------------------------------------------------------------------
import { getCachedImpactReport } from "./impact";
import { pickupsRepo } from "./pickups";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  impactReportMock.mockReset();
});

describe("getCachedImpactReport (PUB-02 — all-time cached aggregate)", () => {
  it("test 1: calls pickupsRepo.impactReport with Date(0) as from and new Date(9999,0,1) as to", async () => {
    impactReportMock.mockResolvedValue({ servings: 0, kg: 0, count: 0 });
    await getCachedImpactReport();
    const [fromArg, toArg] = (pickupsRepo.impactReport as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fromArg).toEqual(new Date(0));
    expect(toArg).toEqual(new Date(9999, 0, 1));
  });

  it("test 2: returns object with { servings, kg, count } shape", async () => {
    impactReportMock.mockResolvedValue({ servings: 5432, kg: 300, count: 87 });
    const result = await getCachedImpactReport();
    expect(result).toEqual({ servings: 5432, kg: 300, count: 87 });
  });

  it("test 3: cache key is ['impact-report-all-time'] and revalidate: 300", () => {
    // unstable_cache is called at module-load time (top-level const).
    // The hoisted spy captures args before beforeEach can clear them.
    const [, keys, opts] = unstableCacheSpy.calls[0] as [
      unknown,
      string[],
      { revalidate: number },
    ];
    expect(keys).toEqual(["impact-report-all-time"]);
    expect(opts).toEqual({ revalidate: 300 });
  });
});
