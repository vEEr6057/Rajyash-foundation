import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES } from "@/config/constants";
import { RunsTable } from "@/features/runs/components/RunsTable";
import { NewRunSheet } from "@/features/runs/components/NewRunSheet";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Runs — Rajyash Food Rescue Admin" };

export default async function AdminRunsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  // Only drivers are ever referenced by runs.driverId — fetch just that role
  // instead of the whole profiles table (serves both the picker and name map).
  const [t, runs, drivers] = await Promise.all([
    getTranslations("admin"),
    runsRepo.listRuns(),
    profilesRepo.listByRole("driver"),
  ]);
  const driverNameById = Object.fromEntries(drivers.map((p) => [p.id, p.name]));
  // One grouped query for every run's stop count (was an N+1 of getByRunId().length).
  const stopCountByRunId = await runStopsRepo.countByRunIds(runs.map((r) => r.id));
  const stopCounts = runs.map((r) => stopCountByRunId[r.id] ?? 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("runs.title")}
        meta={t("runs.meta", { count: runs.length })}
        action={<NewRunSheet drivers={drivers} />}
      />
      {runs.length === 0 ? (
        <EmptyState
          title={t("runs.empty.title")}
          body={t("runs.empty.body")}
          action={<NewRunSheet drivers={drivers} />}
        />
      ) : (
        <RunsTable runs={runs} stopCounts={stopCounts} driverNameById={driverNameById} />
      )}
    </div>
  );
}
