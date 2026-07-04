import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Repo-level test of the ATOMIC webhook idempotency (PAY-02). A fake db.transaction that
 * faithfully models commit/rollback: the `claimed` set mutated by the on-conflict insert
 * is restored if the callback throws. This is what proves the money-critical property —
 * a mutation failure rolls the claim BACK, so a Razorpay re-delivery re-processes instead
 * of being deduped into a lost payment.
 */
const claimed = vi.hoisted(() => new Set<string>());
const control = vi.hoisted(() => ({
  updateThrows: false,
  updateRows: [{ id: "don_1", status: "paid" }] as unknown[],
}));

vi.mock("@/server/db/client", () => {
  const tx = {
    insert: () => ({
      values: (v: { eventId: string }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (claimed.has(v.eventId)) return []; // conflict → 0 rows
            claimed.add(v.eventId);
            return [{ eventId: v.eventId }];
          },
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        // where() returns a thenable that ALSO has .returning() — so it works both for
        // recordFailed (awaits where() directly) and recordCapture (chains .returning()).
        where: () => {
          const exec = async () => {
            if (control.updateThrows) throw new Error("transient db error");
            return control.updateRows;
          };
          return {
            returning: () => exec(),
            then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
              exec().then(resolve, reject),
          };
        },
      }),
    }),
  };
  return {
    getDb: () => ({
      // Model transactional atomicity: snapshot before, restore (rollback) on throw.
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => {
        const snapshot = new Set(claimed);
        try {
          return await cb(tx);
        } catch (e) {
          claimed.clear();
          for (const id of snapshot) claimed.add(id);
          throw e;
        }
      },
    }),
  };
});

import { donationsRepo } from "./donations";

const FIELDS = { razorpayPaymentId: "pay_1", receiptNumber: "RJ-FY2026-27-ABCDEF" };

beforeEach(() => {
  claimed.clear();
  control.updateThrows = false;
  control.updateRows = [{ id: "don_1", status: "paid" }];
});

describe("donationsRepo.recordCapture (atomic idempotency)", () => {
  it("claims the event and returns { outcome: 'paid', donation } on first delivery", async () => {
    const res = await donationsRepo.recordCapture("evt_1", "order_1", FIELDS);
    expect(res.outcome).toBe("paid");
    expect(res.outcome === "paid" && res.donation.id).toBe("don_1");
    expect(claimed.has("evt_1")).toBe(true);
  });

  it("dedups a replayed event id without mutating", async () => {
    claimed.add("evt_1"); // already processed
    const res = await donationsRepo.recordCapture("evt_1", "order_1", FIELDS);
    expect(res.outcome).toBe("dedup");
  });

  it("returns not_found when the order row is absent (claim still commits)", async () => {
    control.updateRows = [];
    const res = await donationsRepo.recordCapture("evt_2", "order_missing", FIELDS);
    expect(res.outcome).toBe("not_found");
    expect(claimed.has("evt_2")).toBe(true);
  });

  it("rolls the claim BACK when the mutation throws, so a re-delivery re-processes (not deduped)", async () => {
    // 1st delivery: the UPDATE throws → transaction rolls back → recordCapture rejects.
    control.updateThrows = true;
    await expect(
      donationsRepo.recordCapture("evt_3", "order_3", FIELDS),
    ).rejects.toThrow();
    // The claim was undone — evt_3 is NOT recorded.
    expect(claimed.has("evt_3")).toBe(false);

    // Re-delivery of the SAME event id: the UPDATE now succeeds → it re-processes.
    control.updateThrows = false;
    const retry = await donationsRepo.recordCapture("evt_3", "order_3", FIELDS);
    expect(retry.outcome).toBe("paid");
    expect(claimed.has("evt_3")).toBe(true);
  });
});

describe("donationsRepo.recordFailed (atomic idempotency)", () => {
  it("claims + records on first delivery, dedups on replay", async () => {
    const first = await donationsRepo.recordFailed("evt_f", "order_f", "pay_f");
    expect(first.outcome).toBe("recorded");
    const replay = await donationsRepo.recordFailed("evt_f", "order_f", "pay_f");
    expect(replay.outcome).toBe("dedup");
  });

  it("rolls back the claim when the mutation throws", async () => {
    control.updateThrows = true;
    await expect(
      donationsRepo.recordFailed("evt_f2", "order_f2", "pay_f2"),
    ).rejects.toThrow();
    expect(claimed.has("evt_f2")).toBe(false);
  });
});
