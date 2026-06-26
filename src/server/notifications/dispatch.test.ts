import { describe, it, expect, vi, beforeEach } from "vitest";

const sendInApp = vi.fn().mockResolvedValue(undefined);
const sendEmail = vi.fn().mockResolvedValue(undefined);
const claim = vi.fn();
const release = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/db/repositories/deliveries", () => ({
  deliveriesRepo: {
    claim: (...a: unknown[]) => claim(...a),
    release: (...a: unknown[]) => release(...a),
  },
}));
vi.mock("@/server/notifications/registry", () => ({
  CHANNELS: {
    in_app: { key: "in_app", send: (...a: unknown[]) => sendInApp(...a) },
    email: { key: "email", send: (...a: unknown[]) => sendEmail(...a) },
    web_push: { key: "web_push", send: vi.fn() },
  },
}));

// RED until 04-02 creates dispatch.ts.
import { dispatchToChannel } from "./dispatch";

const msg = {
  type: "pickup/claimed",
  title: "t",
  body: "b",
  url: "/portal/pickups/pk1",
};
const to = { userId: "donor-1", email: "d@x.com" };

describe("dispatchToChannel (NOT-04 isolation + NOT-05 dedup)", () => {
  beforeEach(() => {
    sendInApp.mockClear();
    sendEmail.mockClear();
    claim.mockReset();
    release.mockClear();
  });

  it("sends when the delivery row is fresh (claim returns truthy)", async () => {
    claim.mockResolvedValue(true);
    await dispatchToChannel("in_app", "pk1:claimed", msg, to);
    expect(claim).toHaveBeenCalledWith("pk1:claimed", "donor-1", "in_app");
    expect(sendInApp).toHaveBeenCalledTimes(1);
  });

  it("skips the send when already delivered (claim returns falsy) — NOT-05", async () => {
    claim.mockResolvedValue(false);
    await dispatchToChannel("in_app", "pk1:claimed", msg, to);
    expect(sendInApp).not.toHaveBeenCalled();
  });

  it("isolates failure: an email throw does not affect a separate in_app send — NOT-04", async () => {
    claim.mockResolvedValue(true);
    sendEmail.mockRejectedValueOnce(new Error("resend 500"));
    await expect(
      dispatchToChannel("email", "pk1:claimed", msg, to),
    ).rejects.toThrow();
    // NOT-05: a failed send releases its claim so the retry can re-send (no silent loss).
    expect(release).toHaveBeenCalledWith("pk1:claimed", "donor-1", "email");
    await dispatchToChannel("in_app", "pk1:claimed", msg, to);
    expect(sendInApp).toHaveBeenCalledTimes(1);
  });
});
