import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { partnersRepo } from "@/server/db/repositories/partners";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES, RUN_SLOT_LABELS } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
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

  // Driver name for the header meta (existing read; no query change).
  const driverName = runWithStops.driverId
    ? (await profilesRepo.getById(runWithStops.driverId))?.name ?? null
    : null;
  const meta = [
    runDate,
    t("runs.stopCountMeta", { count: runWithStops.stops.length }),
    driverName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[40rem]">
      <PageHeader
        eyebrow={t("runs.detailEyebrow")}
        title={RUN_SLOT_LABELS[runWithStops.slot]}
        meta={meta}
        action={<RunStatusPill status={runWithStops.status} />}
      />
      <div className="mb-6">
        <RunStatusControls runId={runWithStops.id} status={runWithStops.status} />
      </div>

      {runWithStops.status === "active" && (
        <section className="mb-6 border-t border-border pt-6">
          <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.liveMap.title")}</h2>
          <RunLiveMap runId={runWithStops.id} active nextStop={nextStopCoords} />
        </section>
      )}

      <section className="mb-6 border-t border-border pt-6">
        <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.stopsSection")}</h2>
        <StopList stops={runWithStops.stops} runId={runWithStops.id} />
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.addStop")}</h2>
        <AddStopForm
          runId={runWithStops.id}
          nextSeq={nextSeq}
          partners={partners}
          destinations={destinations}
        />
      </section>
    </div>
  );
}
