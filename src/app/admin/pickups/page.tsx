import { redirect } from "next/navigation";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { parseAdminFilters } from "@/features/admin";
import { AdminPickupFilters } from "@/features/admin/components/AdminPickupFilters";
import { AdminPickupRow } from "@/features/admin/components/AdminPickupRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Pickups — Rajyash Food Rescue" };

export default async function AdminPickupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params.set(k, v);
  }
  const filters = parseAdminFilters(params);
  const [pickups, volunteers] = await Promise.all([
    pickupsRepo.listForAdmin(filters),
    profilesRepo.listAssignableVolunteers(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">
        Pickups
      </h1>
      <AdminPickupFilters
        current={{
          status: params.get("status") ?? undefined,
          donorId: params.get("donorId") ?? undefined,
          volunteerId: params.get("volunteerId") ?? undefined,
          from: params.get("from") ?? undefined,
          to: params.get("to") ?? undefined,
        }}
      />
      {pickups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pickups match these filters.
        </p>
      ) : (
        <div className="space-y-2">
          {pickups.map((p) => (
            <AdminPickupRow key={p.id} pickup={p} volunteers={volunteers} />
          ))}
        </div>
      )}
    </main>
  );
}
