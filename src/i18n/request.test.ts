import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Strategy: the dynamic imports `./messages/${locale}/common.json` etc. use
// a fully-variable path that Vite cannot statically analyse in test mode.
// However, Vite CAN resolve them when the files exist on disk, because
// the i18n/messages/** stub files are created as part of Task 1.
// The tests below mock only next/headers (cookies) and next-intl/server
// (getRequestConfig identity unwrap), then let the real dynamic imports
// resolve to the stub JSON files.
// ---------------------------------------------------------------------------

// Hoisted to avoid temporal dead zone issues inside vi.mock factories.
const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));

// Mock next/headers — used by getRequestConfig.
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: cookieGet }),
}));

// Mock next-intl/server: unwrap getRequestConfig so its callback is directly
// callable — avoids the next-intl Server Context requirement in tests.
vi.mock("next-intl/server", () => ({
  getRequestConfig: (cb: () => Promise<unknown>) => cb,
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place.
// ---------------------------------------------------------------------------
import getConfig, {
  isValidLocale,
  SUPPORTED_LOCALES,
} from "./request";

// ---------------------------------------------------------------------------
// Helper: call the default export (the async callback, since our mock replaces
// getRequestConfig with an identity function).
// ---------------------------------------------------------------------------
async function callConfig() {
  return (
    getConfig as unknown as () => Promise<{
      locale: string;
      messages: Record<string, unknown>;
    }>
  )();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  cookieGet.mockReset();
  // Default: valid 'en' cookie (most tests want a working baseline)
  cookieGet.mockReturnValue({ value: "en" });
});

describe("SUPPORTED_LOCALES + isValidLocale (allowlist guard — T-7-01-01)", () => {
  it("SUPPORTED_LOCALES contains exactly en, gu, hi", () => {
    expect([...SUPPORTED_LOCALES].sort()).toEqual(["en", "gu", "hi"].sort());
  });

  it("accepts 'en', 'gu', 'hi'", () => {
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("gu")).toBe(true);
    expect(isValidLocale("hi")).toBe(true);
  });

  it("rejects 'fr', 'zh', '', undefined", () => {
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale("zh")).toBe(false);
    expect(isValidLocale("")).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
  });
});

describe("getRequestConfig (I18N-01 — cookie-based locale detection)", () => {
  it("test 1: cookie 'en' → locale 'en'", async () => {
    cookieGet.mockReturnValue({ value: "en" });
    const result = await callConfig();
    expect(result.locale).toBe("en");
  });

  it("test 2: cookie 'gu' → locale 'gu'", async () => {
    cookieGet.mockReturnValue({ value: "gu" });
    const result = await callConfig();
    expect(result.locale).toBe("gu");
  });

  it("test 3: cookie 'hi' → locale 'hi'", async () => {
    cookieGet.mockReturnValue({ value: "hi" });
    const result = await callConfig();
    expect(result.locale).toBe("hi");
  });

  it("test 4: cookie 'fr' (invalid) → locale 'en' (allowlist fallback)", async () => {
    cookieGet.mockReturnValue({ value: "fr" });
    const result = await callConfig();
    expect(result.locale).toBe("en");
  });

  it("test 5: no cookie → locale 'en' (missing cookie fallback)", async () => {
    cookieGet.mockReturnValue(undefined);
    const result = await callConfig();
    expect(result.locale).toBe("en");
  });

  it("test 6: messages object has nested top-level keys common/landing/portal/admin (not flat-spread)", async () => {
    cookieGet.mockReturnValue({ value: "en" });
    const result = await callConfig();
    // Must have exactly these 4 top-level namespace keys.
    // Guards against flat-spread regression where portal.dashboard and
    // admin.dashboard would collide at the top level.
    expect(Object.keys(result.messages).sort()).toEqual(
      ["admin", "common", "landing", "portal"].sort(),
    );
    // Each namespace value is a truthy object (not a string or undefined)
    expect(result.messages.common).toBeTruthy();
    expect(result.messages.landing).toBeTruthy();
    expect(result.messages.portal).toBeTruthy();
    expect(result.messages.admin).toBeTruthy();
  });
});
