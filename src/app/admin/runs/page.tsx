import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { runStopsRepo } from "@/server/db/repositories/runStops";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { RunCard } from "@/features/runs/components/RunCard";

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

  const t = await getTranslations("admin");
  const runs = await runsRepo.listRuns();
  const stopCounts = await Promise.all(
    runs.map((r) => runStopsRepo.getByRunId(r.id).then((s) => s.length)),
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("runs.title")}</h1>
        <Link
          href={`${ROUTES.adminRuns}/new`}
          className={buttonVariants({ variant: "leaf", size: "sm" })}
        >
          {t("runs.newButton")}
        </Link>
      </header>
      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          {t("runs.emptyState")}
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run, i) => (
            <RunCard key={run.id} run={run} stopCount={stopCounts[i] ?? 0} />
          ))}
        </div>
      )}
    </main>
  );
}
