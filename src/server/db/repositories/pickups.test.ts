import { describe, it, expect, vi, beforeEach } from "vitest";

// Transaction chain: tx.update(...).set(...).where(...).returning() → cancelled rows,
// then tx.insert(statusEvents).values(rows). getDb().transaction runs the callback with `tx`.
const returning = vi.fn();
const where = vi.fn(() => ({ returning }));
const set = vi.fn(() => ({ where }));
const update = vi.fn(() => ({ set }));
const values = vi.fn().mockResolvedValue(undefined);
const insert = vi.fn(() => ({ values }));
const tx = { update, insert };
const transaction = vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ transaction }),
}));

import { pickupsRepo } from "./pickups";

beforeEach(() => {
  returning.mockReset();
  where.mockClear();
  set.mockClear();
  update.mockClear();
  values.mockClear();
  insert.mockClear();
  transaction.mockClear();
});

describe("pickupsRepo.cancelStaleRequested (B4)", () => {
  it("cancels the matched rows and writes one status_events row per pickup (actor = donor)", async () => {
    returning.mockResolvedValue([
      { id: "p1", donorId: "donor-1" },
      { id: "p2", donorId: "donor-2" },
    ]);
    const n = await pickupsRepo.cancelStaleRequested(new Date("2026-07-01"));

    expect(n).toBe(2);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith([
      { pickupId: "p1", actorId: "donor-1", fromStatus: "requested", toStatus: "cancelled" },
      { pickupId: "p2", actorId: "donor-2", fromStatus: "requested", toStatus: "cancelled" },
    ]);
  });

  it("writes no status_events row when nothing is stale", async () => {
    returning.mockResolvedValue([]);
    const n = await pickupsRepo.cancelStaleRequested(new Date("2026-07-01"));

    expect(n).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });
});
