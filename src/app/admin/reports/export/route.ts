import { requireRole, AuthError } from "@/server/auth/session";
import { reportsRepo } from "@/server/db/repositories/reports";
import { toCsv } from "@/features/admin/lib/csv";

const parseDate = (s: string | null, fallback: Date): Date => {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
};

/** RPT-01: Export combined run-impact breakdown as CSV. Admin-gated (AUTH-05). */
export async function GET(req: Request) {
  try {
    await requireRole(["admin"]); // middleware is not the boundary
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: 403 });
    throw e;
  }

  const url = new URL(req.url);
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const from = parseDate(url.searchParams.get("from"), defaultFrom);
  const to = parseDate(url.searchParams.get("to"), now);
  to.setHours(23, 59, 59, 999);

  const [runRows, destRows, partnerRows] = await Promise.all([
    reportsRepo.runSummary(from, to),
    reportsRepo.destinationBreakdown(from, to),
    reportsRepo.partnerBreakdown(from, to),
  ]);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  // NOTE: Totals are approximate aggregates only — no per-delivery headcount (RPT-01).
  // Run section is stop counts, not meal/kg (no FK links pickups→runs).
  const runSection = toCsv(
    ["runId", "runDate", "slot", "status", "driverId", "pickupStops", "dropStops", "completedDrops"],
    runRows.map((r) => [
      r.runId,
      r.runDate,
      r.slot,
      r.status,
      r.driverId ?? "",
      r.pickupStopCount,
      r.dropStopCount,
      r.completedDropCount,
    ]),
  );

  const destSection = toCsv(
    ["destinationId", "destinationName", "completedDrops"],
    destRows.map((r) => [r.destinationId ?? "", r.destinationName, r.completedDropCount]),
  );

  const partnerSection = toCsv(
    ["partnerId", "partnerName", "servings", "kg", "pickupsDelivered"],
    partnerRows.map((r) => [r.partnerId ?? "", r.partnerName, r.servings, r.kg, r.count]),
  );

  // Combine: plain-text section divider rows (not formula leads) + each section's CSV block.
  const body = [
    `--- Run Summary (stop counts only; ${fromStr} to ${toStr}) ---\r\n`,
    runSection,
    `\r\n--- Destination Breakdown (completed drop count) ---\r\n`,
    destSection,
    `\r\n--- Partner Breakdown (delivered pickups by partner) ---\r\n`,
    partnerSection,
  ].join("");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="run-report-${fromStr}-to-${toStr}.csv"`,
    },
  });
}
