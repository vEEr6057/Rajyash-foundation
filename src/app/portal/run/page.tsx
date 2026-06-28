import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { ROUTES, RUN_SLOT_LABELS } from "@/config/constants";
import { RunStopCard } from "@/features/runs/components/RunStopCard";
import { RunTracker } from "@/features/runs/components/RunTracker";
import { RunLiveMap } from "@/features/runs/components/RunLiveMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Run — Rajyash Food Rescue" };

export default async function DriverRunPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["driver"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const t = await getTranslations("portal");

  const allRuns = await runsRepo.listRunsForDriver(session.userId);
  const activeRun =
    allRuns.find((r) => r.status === "active") ??
    allRuns.find((r) => r.status === "planned") ??
    null;

  if (!activeRun) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">
          {t("run.title")}
        </h1>
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          {t("run.emptyState")}
        </div>
      </main>
    );
  }

  const runWithStops = await runsRepo.getRunWithStops(activeRun.id);
  if (!runWithStops) redirect(ROUTES.portalDashboard);

  const nextPending = runWithStops.stops
    .filter((s) => s.status === "pending" && s.lat !== null && s.lng !== null)
    .sort((a, b) => a.seq - b.seq)[0];
  const nextStopCoords =
    nextPending && nextPending.lat !== null && nextPending.lng !== null
      ? { lat: nextPending.lat, lng: nextPending.lng }
      : null;
  const slotLabel = RUN_SLOT_LABELS[activeRun.slot];
  const runDate = new Date(activeRun.runDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("run.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {slotLabel} · {runDate} · {runWithStops.stops.length} {t("run.stopCount")}
        </p>
      </header>

      {runWithStops.stops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          {t("run.noStopsYet")}
        </div>
      ) : (
        <div className="space-y-3">
          {runWithStops.stops.map((stop) => (
            <RunStopCard key={stop.id} stop={stop} seq={stop.seq} />
          ))}
        </div>
      )}

      {activeRun.status === "active" && (
        <div className="mt-6 space-y-4">
          <RunTracker runId={activeRun.id} active />
          <RunLiveMap runId={activeRun.id} active nextStop={nextStopCoords} />
        </div>
      )}
    </main>
  );
}
