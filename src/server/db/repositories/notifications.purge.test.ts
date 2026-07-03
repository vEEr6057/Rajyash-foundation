import { describe, it, expect, vi, beforeEach } from "vitest";

const returningSpy = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
const whereSpy = vi.fn(() => ({ returning: returningSpy }));
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { notificationsRepo } from "./notifications";

beforeEach(() => {
  deleteSpy.mockClear();
  whereSpy.mockClear();
  returningSpy.mockClear();
});

describe("notificationsRepo hygiene purges (B3)", () => {
  it("purgeReadOlderThan issues an age-scoped DELETE and returns the count", async () => {
    const n = await notificationsRepo.purgeReadOlderThan(new Date("2026-04-01"));
    expect(deleteSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled(); // read_at IS NOT NULL AND created_at < cutoff
    expect(n).toBe(2);
  });

  it("purgeUnreadOlderThan issues an age-scoped DELETE and returns the count", async () => {
    const n = await notificationsRepo.purgeUnreadOlderThan(new Date("2026-01-01"));
    expect(deleteSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled(); // read_at IS NULL AND created_at < cutoff
    expect(n).toBe(2);
  });
});
