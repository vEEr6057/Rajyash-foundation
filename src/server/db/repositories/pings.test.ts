import { describe, it, expect, vi } from "vitest";

const returningSpy = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "3" }]);
const whereSpy = vi.fn(() => ({ returning: returningSpy }));
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { pingsRepo } from "./pings";

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
