import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES, ADMIN_PAGE_SIZE } from "@/config/constants";
import { RunsTable } from "@/features/runs";
import { NewRunSheet } from "@/features/runs";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SearchParamInput } from "@/components/forms/SearchParamInput";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Runs" };

export default async function AdminRunsPage({
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
  const q = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  // Only drivers are ever referenced by runs.driverId — fetch just that role
  // instead of the whole profiles table (serves both the picker and name map).
  const [t, { rows: runs, total }, drivers] = await Promise.all([
    getTranslations("admin"),
    runsRepo.listRunsPaged(q, page, ADMIN_PAGE_SIZE),
    profilesRepo.listByRole("driver"),
  ]);
  const driverNameById = Object.fromEntries(drivers.map((p) => [p.id, p.name]));
  // One grouped query for every run's stop count (was an N+1 of getByRunId().length).
  const stopCountByRunId = await runStopsRepo.countByRunIds(runs.map((r) => r.id));
  const stopCounts = runs.map((r) => stopCountByRunId[r.id] ?? 0);
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("runs.title")}
        meta={t("runs.meta", { count: total })}
        action={<NewRunSheet drivers={drivers} />}
      />
      <SearchParamInput
        current={q}
        placeholder={t("list.searchDriverPlaceholder")}
        ariaLabel={t("list.searchLabel")}
        className="rj-field mb-4 h-9 rounded-md border border-border bg-transparent px-3 text-sm"
      />
      {runs.length === 0 ? (
        <EmptyState
          title={t("runs.empty.title")}
          body={t("runs.empty.body")}
          action={<NewRunSheet drivers={drivers} />}
        />
      ) : (
        <>
          <RunsTable runs={runs} stopCounts={stopCounts} driverNameById={driverNameById} />
          <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
