import { describe, it, expect, vi } from "vitest";

const returningSpy = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
const whereSpy = vi.fn(() => ({ returning: returningSpy }));
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { runPingsRepo } from "./runPings";

describe("runPingsRepo.purgeForRun (TRK-05)", () => {
  it("issues a DELETE scoped to the given run id", async () => {
    await runPingsRepo.purgeForRun("run-abc");
    expect(deleteSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled();
  });
});

describe("runPingsRepo.purgeOlderThan (B3 hygiene)", () => {
  it("issues an age-scoped DELETE and returns the purged count", async () => {
    const n = await runPingsRepo.purgeOlderThan(new Date("2026-01-01"));
    expect(whereSpy).toHaveBeenCalled(); // WHERE created_at < cutoff (not table-wide)
    expect(returningSpy).toHaveBeenCalled();
    expect(n).toBe(2);
  });
});
