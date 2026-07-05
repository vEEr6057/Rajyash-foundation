import { z } from "zod";
import { ROLES } from "@/config/constants";
import type { AdminUserFilters } from "@/server/db/repositories/profiles";

const blankToUndefined = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t; // pass the TRIMMED value (no stray-space mismatches)
};

/** UX-13: admin users search + role filter input. Both optional; blanks coerce to undefined. */
export const userFiltersSchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().optional()),
  role: z.preprocess(blankToUndefined, z.enum(ROLES).optional()),
});
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;

/** Parse query params -> the repo filter shape (used by the admin users page). */
export function parseUserFilters(params: URLSearchParams): AdminUserFilters {
  const parsed = userFiltersSchema.safeParse({
    q: params.get("q") ?? undefined,
    role: params.get("role") ?? undefined,
  });
  return parsed.success ? parsed.data : {};
}
