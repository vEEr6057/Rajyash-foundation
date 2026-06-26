// src/server/db/repositories/impact.ts
import "server-only"; // mirrors all other repo files — never imported in client components
import { unstable_cache } from "next/cache";
import { pickupsRepo } from "./pickups";

// RESEARCH Pitfall 4: impactReport() requires non-null Date bounds (uses gte/lte unconditionally).
// Wrap all-time with epoch → far future.
const ALL_TIME_FROM = new Date(0); // Unix epoch — 1970-01-01
const ALL_TIME_TO = new Date(9999, 0, 1); // Far future

// SECURITY (T-7-02-01): Returns ONLY aggregate counts — no per-record pickup data,
// no donor/volunteer PII, no row IDs. Safe to call from public unauthenticated routes.
export const getCachedImpactReport = unstable_cache(
  async () => pickupsRepo.impactReport(ALL_TIME_FROM, ALL_TIME_TO),
  ["impact-report-all-time"],
  { revalidate: 300 }, // 5-min TTL; per-isolate in-memory on CF Workers without R2 (RESEARCH §Pattern 5)
);
// Return type: Promise<{ servings: number; kg: number; count: number }>
// (inferred from pickupsRepo.impactReport — no re-declaration needed)
