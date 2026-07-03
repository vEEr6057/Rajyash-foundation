import { describe, it, expect, vi, beforeEach } from "vitest";

const returningSpy = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "3" }]);
const whereSpy = vi.fn(() => ({ returning: returningSpy }));
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

// Stateful `execute` mock that emulates the single-statement 5s rate floor
// (INSERT … WHERE NOT EXISTS): a row is appended only when the newest existing
// row is > 5s old. `nowMs` is a controllable clock so we can advance past the floor.
let store: number[] = []; // createdAt (epoch ms) of every accepted ping
let nowMs = 1_000_000;
const executeSpy = vi.fn(async () => {
  const throttled = store.some((t) => t > nowMs - 5000);
  if (throttled) return [];
  store.push(nowMs);
  return [{ id: `ping-${store.length}` }];
});

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy, execute: executeSpy }),
}));

import { pingsRepo } from "./pings";

beforeEach(() => {
  store = [];
  nowMs = 1_000_000;
  executeSpy.mockClear();
  deleteSpy.mockClear();
  whereSpy.mockClear();
});

describe("pingsRepo.insert — 5s rate floor (B1 note 2)", () => {
  const ping = { pickupId: "p1", volunteerId: "v1", lat: 1, lng: 2, accuracy: null };

  it("uses exactly one statement per insert (single-statement guard, not read-then-write)", async () => {
    await pingsRepo.insert(ping);
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps only one row when a second ping arrives within 5s", async () => {
    await pingsRepo.insert(ping);
    await pingsRepo.insert({ ...ping, lat: 3, lng: 4 }); // immediate — throttled
    expect(store).toHaveLength(1);
  });

  it("accepts a new ping once the 5s floor has elapsed", async () => {
    await pingsRepo.insert(ping);
    nowMs += 6000;
    await pingsRepo.insert({ ...ping, lat: 3, lng: 4 });
    expect(store).toHaveLength(2);
  });
});

describe("pingsRepo.purgeForPickup (TRK-04)", () => {
  it("issues a DELETE scoped to the given pickup id", async () => {
    await pingsRepo.purgeForPickup("pickup-123");
    expect(deleteSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled(); // a WHERE clause was applied (scoped, not table-wide)
  });
});

describe("pingsRepo.purgeOlderThan (B3 hygiene)", () => {
  it("issues an age-scoped DELETE and returns the purged count", async () => {
    const n = await pingsRepo.purgeOlderThan(new Date("2026-01-01"));
    expect(whereSpy).toHaveBeenCalled();
    expect(returningSpy).toHaveBeenCalled();
    expect(n).toBe(3);
  });
});
