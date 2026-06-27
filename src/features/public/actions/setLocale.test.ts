import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before module import.
// Use vi.hoisted() to ensure cookiesSet is accessible inside vi.mock factories
// without temporal dead zone issues.
// ---------------------------------------------------------------------------

const { cookiesSet } = vi.hoisted(() => ({
  cookiesSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: cookiesSet }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up.
// ---------------------------------------------------------------------------
import { setLocaleCookieAction } from "./setLocale";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setLocaleCookieAction (I18N-02 — persistent locale cookie)", () => {
  it("test 1: called with 'en' → cookies().set called with 'NEXT_LOCALE', 'en'", async () => {
    await setLocaleCookieAction("en");
    expect(cookiesSet).toHaveBeenCalledWith(
      "NEXT_LOCALE",
      "en",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("test 2: called with 'gu' → cookies().set called with 'NEXT_LOCALE', 'gu'", async () => {
    await setLocaleCookieAction("gu");
    expect(cookiesSet).toHaveBeenCalledWith(
      "NEXT_LOCALE",
      "gu",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("test 3: called with 'fr' (invalid) → cookies().set NOT called (silently rejected)", async () => {
    // Type coercion needed because the type guard prevents invalid values at TS level
    await setLocaleCookieAction("fr" as "en");
    expect(cookiesSet).not.toHaveBeenCalled();
  });

  it("test 4: called with 'en' → maxAge = 31536000 (1 year), httpOnly = false, sameSite = 'lax'", async () => {
    await setLocaleCookieAction("en");
    expect(cookiesSet).toHaveBeenCalledWith(
      "NEXT_LOCALE",
      "en",
      expect.objectContaining({
        maxAge: 31536000,
        httpOnly: false,
        sameSite: "lax",
      }),
    );
  });

  it("calls revalidatePath after setting a valid locale", async () => {
    await setLocaleCookieAction("hi");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does NOT call revalidatePath when locale is invalid", async () => {
    await setLocaleCookieAction("zh" as "en");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
