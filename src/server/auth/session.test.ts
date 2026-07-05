import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk's server auth() — requireRole/getSession read from it.
const authMock = vi.fn();
const getUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: vi.fn().mockResolvedValue({
    users: { getUser: (...a: unknown[]) => getUser(...a) },
  }),
}));
// server-only is a no-op guard at runtime; stub it for the test environment.
vi.mock("server-only", () => ({}));
// getSession now reads the profile to enforce the soft-deactivate flag — mock the repo
// so the auth tests don't hit the DB (default: an active profile).
const getById = vi.fn();
const upsert = vi.fn().mockResolvedValue({ id: "u_provisioned" });
vi.mock("@/server/db/repositories/profiles", () => ({
  profilesRepo: {
    getById: (...a: unknown[]) => getById(...a),
    upsert: (...a: unknown[]) => upsert(...a),
  },
}));
// Cookie read inside ensureInvitedProfile (locale) — no NEXT_LOCALE cookie by default.
const cookiesGet = vi.fn().mockReturnValue(undefined);
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: (...a: unknown[]) => cookiesGet(...a) }),
}));
vi.mock("@/i18n/request", () => ({
  isValidLocale: (v: string | undefined) => v === "en" || v === "gu" || v === "hi",
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { requireRole, getSession, AuthError } from "./session";

function session(userId: string | null, role?: string, onboardingComplete = true) {
  return {
    userId,
    sessionClaims: userId ? { metadata: { role, onboardingComplete } } : null,
  };
}

beforeEach(() => {
  authMock.mockReset();
  getById.mockReset();
  getById.mockResolvedValue({ deactivatedAt: null }); // active by default
  getUser.mockReset();
  upsert.mockClear();
  cookiesGet.mockReturnValue(undefined);
});

describe("requireRole", () => {
  it("returns { userId, role } for an authenticated user with an allowed role", async () => {
    authMock.mockResolvedValue(session("u_1", "donor"));
    await expect(requireRole(["donor"])).resolves.toEqual({
      userId: "u_1",
      role: "donor",
    });
  });

  it("accepts any of several allowed roles", async () => {
    authMock.mockResolvedValue(session("u_2", "volunteer"));
    await expect(requireRole(["donor", "volunteer"])).resolves.toMatchObject({
      role: "volunteer",
    });
  });

  it("throws UNAUTHORIZED when not signed in", async () => {
    authMock.mockResolvedValue(session(null));
    await expect(requireRole(["donor"])).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when the session role is not allowed", async () => {
    authMock.mockResolvedValue(session("u_3", "donor"));
    await expect(requireRole(["admin"])).rejects.toBeInstanceOf(AuthError);
    await expect(requireRole(["admin"])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when the user has no role yet", async () => {
    authMock.mockResolvedValue(session("u_4", undefined));
    await expect(requireRole(["donor"])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("getSession", () => {
  it("returns null when unauthenticated", async () => {
    authMock.mockResolvedValue(session(null));
    expect(await getSession()).toBeNull();
  });

  it("surfaces role and onboarding flag", async () => {
    authMock.mockResolvedValue(session("u_5", "admin", false));
    expect(await getSession()).toEqual({
      userId: "u_5",
      role: "admin",
      onboardingComplete: false,
    });
  });

  it("returns null when the user is soft-deactivated (Phase 6)", async () => {
    authMock.mockResolvedValue(session("u_6", "donor"));
    getById.mockResolvedValue({ deactivatedAt: new Date() });
    expect(await getSession()).toBeNull();
  });
});

describe("getSession — admin-invite lazy profile provisioning", () => {
  it("provisions a profile from invited Clerk metadata when getById returns null", async () => {
    authMock.mockResolvedValue(session("u_invited", "driver", true));
    getById.mockResolvedValue(null);
    getUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "driver@example.com" },
      primaryPhoneNumber: null,
      firstName: null,
      lastName: null,
      publicMetadata: {
        invitedName: "Driver Dan",
        invitedPhone: "9876543210",
        invitedCity: "Surat",
      },
    });

    const result = await getSession();

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "u_invited",
        name: "Driver Dan",
        email: "driver@example.com",
        phone: "9876543210",
        role: "driver",
        city: "Surat",
        onboardingComplete: true,
        locale: "en",
      }),
    );
    expect(result).toEqual({
      userId: "u_invited",
      role: "driver",
      onboardingComplete: true,
    });
  });

  it("does not provision when a profile already exists", async () => {
    authMock.mockResolvedValue(session("u_existing", "donor", true));
    getById.mockResolvedValue({ id: "u_existing", deactivatedAt: null });

    await getSession();

    expect(upsert).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("does not provision when onboardingComplete is false (self sign-up flow, untouched)", async () => {
    authMock.mockResolvedValue(session("u_new", "donor", false));
    getById.mockResolvedValue(null);

    await getSession();

    expect(upsert).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("fails open — a provisioning error does not throw and getSession still returns", async () => {
    authMock.mockResolvedValue(session("u_broken", "volunteer", true));
    getById.mockResolvedValue(null);
    getUser.mockRejectedValue(new Error("Clerk API down"));

    const result = await getSession();

    expect(result).toEqual({
      userId: "u_broken",
      role: "volunteer",
      onboardingComplete: true,
    });
  });
});
