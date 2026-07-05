import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mutable env stub so each test controls whether the secret is configured.
const envState = vi.hoisted(() => ({ TURNSTILE_SECRET_KEY: undefined as string | undefined }));
vi.mock("@/config/env", () => ({ env: envState }));

import { verifyTurnstile } from "./turnstile";

const fetchMock = vi.fn();

beforeEach(() => {
  envState.TURNSTILE_SECRET_KEY = undefined;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("verifyTurnstile (donation abuse gate — MED-1)", () => {
  it("skips verification (returns true) when no secret is configured", async () => {
    envState.TURNSTILE_SECRET_KEY = undefined;
    const ok = await verifyTurnstile("any-token", "1.2.3.4");
    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled(); // never hits the network while unconfigured
  });

  it("rejects a missing token once the gate is armed", async () => {
    envState.TURNSTILE_SECRET_KEY = "secret";
    const ok = await verifyTurnstile(undefined, "1.2.3.4");
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns true when Cloudflare reports success", async () => {
    envState.TURNSTILE_SECRET_KEY = "secret";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    expect(await verifyTurnstile("tok", "1.2.3.4")).toBe(true);
  });

  it("returns false when Cloudflare reports failure", async () => {
    envState.TURNSTILE_SECRET_KEY = "secret";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    expect(await verifyTurnstile("tok", null)).toBe(false);
  });

  it("fails CLOSED on a non-200 or a network throw (better to reject than open the flood gate)", async () => {
    envState.TURNSTILE_SECRET_KEY = "secret";
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await verifyTurnstile("tok", null)).toBe(false);
    fetchMock.mockRejectedValueOnce(new Error("cf down"));
    expect(await verifyTurnstile("tok", null)).toBe(false);
  });
});
