import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk's server auth() — requireRole/getSession read from it.
const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));
// server-only is a no-op guard at runtime; stub it for the test environment.
vi.mock("server-only", () => ({}));

import { requireRole, getSession, AuthError } from "./session";

function session(userId: string | null, role?: string, onboardingComplete = true) {
  return {
    userId,
    sessionClaims: userId ? { metadata: { role, onboardingComplete } } : null,
  };
}

beforeEach(() => authMock.mockReset());

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
});
