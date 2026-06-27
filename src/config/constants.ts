/**
 * App-wide constants: roles, routes, query keys.
 */

// Roles (D-01). `admin` is assigned manually via Clerk metadata, never self-selected.
export const ROLES = ["donor", "volunteer", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Roles a user may choose at onboarding (admin excluded — manual elevation only).
export const SELECTABLE_ROLES = ["donor", "volunteer"] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export const DEFAULT_CITY = "Ahmedabad";

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  onboarding: "/onboarding",
  portalDashboard: "/portal/dashboard",
  adminDashboard: "/admin/dashboard",
} as const;

// TanStack Query keys (centralized — frontend-practices §5).
export const QUERY_KEYS = {
  profile: ["profile"] as const,
} as const;
