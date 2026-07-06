import { requireRole, AuthError } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { toCsv } from "@/features/admin";
import { parseAdminFilters } from "@/features/admin";

/** ADM-06: export the filtered pickups list as CSV. Re-checks admin (Pitfall P4). */
export async function GET(req: Request) {
  try {
    await requireRole(["admin"]); // AUTH-05 — middleware is not the boundary
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: 403 });
    throw e;
  }
  const filters = parseAdminFilters(new URL(req.url).searchParams);
  const rows = await pickupsRepo.listForAdmin(filters);
  const csv = toCsv(
    [
      "id",
      "status",
      "category",
      "quantity",
      "unit",
      "donorId",
      "volunteerId",
      "createdAt",
      "deliveredAt",
    ],
    rows.map((r) => [
      r.id,
      r.status,
      r.category,
      r.quantity,
      r.quantityUnit,
      r.donorId,
      r.volunteerId ?? "",
      r.createdAt.toISOString(),
      r.deliveredAt?.toISOString() ?? "",
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pickups-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
