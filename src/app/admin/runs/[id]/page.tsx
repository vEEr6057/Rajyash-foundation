import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { partnersRepo } from "@/server/db/repositories/partners";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { ROUTES, RUN_SLOT_LABELS } from "@/config/constants";
import { RunStatusPill } from "@/features/runs/components/RunStatusPill";
import { RunStatusControls } from "@/features/runs/components/RunStatusControls";
import { StopList } from "@/features/runs/components/StopList";
import { AddStopForm } from "@/features/runs/components/AddStopForm";
import { RunLiveMap } from "@/features/runs/components/RunLiveMap";

export const dynamic = "force-dynamic";

export default async function AdminRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const t = await getTranslations("admin");
  const [runWithStops, partners, destinations] = await Promise.all([
    runsRepo.getRunWithStops(id),
    partnersRepo.list(),
    destinationsRepo.list(),
  ]);
  if (!runWithStops) notFound();

  const nextSeq = (runWithStops.stops.at(-1)?.seq ?? 0) + 1;
  const nextPending = runWithStops.stops
    .filter((s) => s.status === "pending" && s.lat !== null && s.lng !== null)
    .sort((a, b) => a.seq - b.seq)[0];
  const nextStopCoords =
    nextPending && nextPending.lat !== null && nextPending.lng !== null
      ? { lat: nextPending.lat, lng: nextPending.lng }
      : null;
  const runDate = new Date(runWithStops.runDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {RUN_SLOT_LABELS[runWithStops.slot]}
          </h1>
          <RunStatusPill status={runWithStops.status} />
        </div>
        <p className="text-sm text-muted-foreground">{runDate}</p>
        <RunStatusControls runId={runWithStops.id} status={runWithStops.status} />
      </header>

      {runWithStops.status === "active" && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold">{t("runs.liveMap.title")}</h2>
          <RunLiveMap runId={runWithStops.id} active nextStop={nextStopCoords} />
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">{t("runs.stopsSection")}</h2>
        <StopList stops={runWithStops.stops} runId={runWithStops.id} />
      </section>

      <section>
        <div className="rounded-xl border border-border bg-card p-4">
          <AddStopForm
            runId={runWithStops.id}
            nextSeq={nextSeq}
            partners={partners}
            destinations={destinations}
          />
        </div>
      </section>
    </div>
  );
}
