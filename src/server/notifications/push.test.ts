import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@block65/webcrypto-web-push", () => ({
  buildPushPayload: vi
    .fn()
    .mockResolvedValue({ method: "post", headers: {}, body: new Uint8Array() }),
}));
// env is imported transitively by push.ts — stub it so the module loads under test.
vi.mock("@/config/env", () => ({
  env: {
    VAPID_SUBJECT: "mailto:x@y.com",
    VAPID_PUBLIC_KEY: "pub",
    VAPID_PRIVATE_KEY: "priv",
  },
}));

// RED until 04-02 creates push.ts.
import { sendWebPush } from "./push";

const sub = {
  endpoint: "https://push.example/abc",
  expirationTime: null,
  keys: { p256dh: "p", auth: "a" },
};
const payload = { title: "t", body: "b", url: "/portal/pickups/pk1" };

describe("sendWebPush (NOT-02 prune vs retry)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 'sent' on a 2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201 }));
    await expect(sendWebPush(sub, payload)).resolves.toBe("sent");
  });
  it("returns 'pruned' on 404 (dead endpoint)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    await expect(sendWebPush(sub, payload)).resolves.toBe("pruned");
  });
  it("returns 'pruned' on 410 Gone (unsubscribed)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 410 }),
    );
    await expect(sendWebPush(sub, payload)).resolves.toBe("pruned");
  });
  it("throws on a transient non-2xx so Inngest retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(sendWebPush(sub, payload)).rejects.toThrow();
  });
});
