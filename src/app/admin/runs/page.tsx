import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES } from "@/config/constants";
import { RunsTable } from "@/features/runs/components/RunsTable";
import { NewRunSheet } from "@/features/runs/components/NewRunSheet";

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

  const [t, runs, allProfiles] = await Promise.all([
    getTranslations("admin"),
    runsRepo.listRuns(),
    profilesRepo.listAll(),
  ]);
  const drivers = allProfiles.filter((p) => p.role === "driver" && !p.deactivatedAt);
  const driverNameById = Object.fromEntries(allProfiles.map((p) => [p.id, p.name]));
  const stopCounts = await Promise.all(
    runs.map((r) => runStopsRepo.getByRunId(r.id).then((s) => s.length)),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("runs.title")}</h1>
        <NewRunSheet drivers={drivers} />
      </header>
      <RunsTable runs={runs} stopCounts={stopCounts} driverNameById={driverNameById} />
    </div>
  );
}
