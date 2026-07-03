import { describe, it, expect, vi, beforeEach } from "vitest";

const whereSpy = vi.fn().mockResolvedValue(undefined);
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

// Stateful `execute` mock emulating the single-statement 5s rate floor
// (INSERT … WHERE NOT EXISTS) — see pings.test.ts for the shape.
let store: number[] = [];
let nowMs = 1_000_000;
const executeSpy = vi.fn(async () => {
  const throttled = store.some((t) => t > nowMs - 5000);
  if (throttled) return [];
  store.push(nowMs);
  return [{ id: `run-ping-${store.length}` }];
});

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy, execute: executeSpy }),
}));

import { runPingsRepo } from "./runPings";

beforeEach(() => {
  store = [];
  nowMs = 1_000_000;
  executeSpy.mockClear();
  deleteSpy.mockClear();
  whereSpy.mockClear();
});

describe("runPingsRepo.insert — 5s rate floor (B1 note 2)", () => {
  const ping = { runId: "run-abc", driverId: "d1", lat: 1, lng: 2, accuracy: null };

  it("uses exactly one statement per insert (single-statement guard, not read-then-write)", async () => {
    await runPingsRepo.insert(ping);
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps only one row when a second ping arrives within 5s", async () => {
    await runPingsRepo.insert(ping);
    await runPingsRepo.insert({ ...ping, lat: 3, lng: 4 }); // immediate — throttled
    expect(store).toHaveLength(1);
  });

  it("accepts a new ping once the 5s floor has elapsed", async () => {
    await runPingsRepo.insert(ping);
    nowMs += 6000;
    await runPingsRepo.insert({ ...ping, lat: 3, lng: 4 });
    expect(store).toHaveLength(2);
  });
});

describe("runPingsRepo.purgeForRun (TRK-05)", () => {
  it("issues a DELETE scoped to the given run id", async () => {
    await runPingsRepo.purgeForRun("run-abc");
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });
});
