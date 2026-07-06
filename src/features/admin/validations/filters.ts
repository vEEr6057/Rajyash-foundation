import { z } from "zod";
import { PICKUP_STATUSES } from "@/config/constants";
import type { AdminPickupFilters } from "@/server/db/repositories/pickups";

const blankToUndefined = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t; // pass the TRIMMED value (no stray-space mismatches)
};

/** Admin pickup filter input (D-03). All optional; blanks coerce to undefined. */
export const filtersSchema = z.object({
  status: z.preprocess(blankToUndefined, z.enum(PICKUP_STATUSES).optional()),
  donorId: z.preprocess(blankToUndefined, z.string().optional()),
  volunteerId: z.preprocess(blankToUndefined, z.string().optional()),
  from: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  to: z.preprocess(blankToUndefined, z.coerce.date().optional()),
  q: z.preprocess(blankToUndefined, z.string().max(200).optional()),
});
export type AdminPickupFiltersInput = z.infer<typeof filtersSchema>;

/** Parse query params -> the repo filter shape (used by the page + the CSV route). */
export function parseAdminFilters(params: URLSearchParams): AdminPickupFilters {
  const parsed = filtersSchema.safeParse({
    status: params.get("status") ?? undefined,
    donorId: params.get("donorId") ?? undefined,
    volunteerId: params.get("volunteerId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  return parsed.success ? parsed.data : {};
}
