import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES, ADMIN_PAGE_SIZE } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { partnersRepo } from "@/server/db/repositories/partners";
import { parseAdminFilters } from "@/features/admin";
import { AdminPickupFilters } from "@/features/admin/components/AdminPickupFilters";
import { PickupsTable } from "@/features/admin/components/PickupsTable";
import { LogSurplusSheet } from "@/features/admin/components/LogSurplusSheet";
import { Pagination } from "@/components/ui/pagination";

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
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [t, { rows, total }, volunteers, partners] = await Promise.all([
    getTranslations("admin"),
    pickupsRepo.listForAdminPaged(filters, page, ADMIN_PAGE_SIZE),
    profilesRepo.listAssignableVolunteers(),
    partnersRepo.list(),
  ]);

  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const hrefForPage = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    return `${ROUTES.adminPickups}?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("pickups.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()}
          </p>
        </div>
        <LogSurplusSheet partners={partners} />
      </div>

      <AdminPickupFilters
        current={{
          status: params.get("status") ?? undefined,
          donorId: params.get("donorId") ?? undefined,
          volunteerId: params.get("volunteerId") ?? undefined,
          from: params.get("from") ?? undefined,
          to: params.get("to") ?? undefined,
        }}
      />

      <PickupsTable pickups={rows} volunteers={volunteers} />

      <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </div>
  );
}
