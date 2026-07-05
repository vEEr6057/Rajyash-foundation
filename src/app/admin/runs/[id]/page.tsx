import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { partnersRepo } from "@/server/db/repositories/partners";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { stopStatusEventsRepo } from "@/server/db/repositories/stopStatusEvents";
import { ROUTES, RUN_SLOT_LABEL_KEYS } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { RunStatusPill } from "@/features/runs/components/RunStatusPill";
import { RunStatusControls } from "@/features/runs/components/RunStatusControls";
import { AssignRunDriverForm } from "@/features/runs/components/AssignRunDriverForm";
import { EditRunSheet } from "@/features/runs/components/EditRunSheet";
import { StopList } from "@/features/runs/components/StopList";
import { AddStopForm } from "@/features/runs/components/AddStopForm";
import { RunLiveMap } from "@/features/runs/components/RunLiveMap";
import { StopHistorySection } from "@/features/runs/components/StopHistorySection";
import { buildStopHistory } from "@/features/runs/lib/stopHistory";

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
  const [runWithStops, partners, destinations, drivers] = await Promise.all([
    runsRepo.getRunWithStops(id),
    partnersRepo.list(),
    // UX-15: the add-stop picker may only offer active destinations.
    destinationsRepo.list({ activeOnly: true }),
    // Backs both the (re)assign-driver control and the edit-run sheet below.
    profilesRepo.listByRole("driver"),
  ]);
  if (!runWithStops) notFound();

  // B4 parity: the stop list is only mutable while the run is planned/active — mirror
  // the server guardRunMutable so the UI never offers edits the server will reject.
  const editable =
    runWithStops.status === "planned" || runWithStops.status === "active";
  const nextSeq = (runWithStops.stops.at(-1)?.seq ?? 0) + 1;
  const nextPending = runWithStops.stops
    .filter((s) => s.status === "pending" && s.lat !== null && s.lng !== null)
    .sort((a, b) => a.seq - b.seq)[0];
  const nextStopCoords =
    nextPending && nextPending.lat !== null && nextPending.lng !== null
      ? { lat: nextPending.lat, lng: nextPending.lng }
      : null;
  const locale = await getLocale();
  const runDateObj = new Date(runWithStops.runDate);
  const runDate = runDateObj.toLocaleDateString(`${locale}-IN`, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // yyyy-mm-dd for the edit-run form's date input (defaultValues, not display).
  const runDateISO = runDateObj.toISOString().slice(0, 10);

  // Driver name for the header meta (existing read; no query change).
  const driverName = runWithStops.driverId
    ? (await profilesRepo.getById(runWithStops.driverId))?.name ?? null
    : null;

  // UX-14 v2: full stop status audit trail — one batched query for every stop
  // on this run, then resolve the distinct actors to display names (mirrors
  // the admin pickup detail page's actor-resolution pattern).
  const stopEvents = await stopStatusEventsRepo.listForStopIds(
    runWithStops.stops.map((s) => s.id),
  );
  const stopActorIds = [...new Set(stopEvents.map((e) => e.actorId))];
  const stopActorProfiles = await Promise.all(
    stopActorIds.map((aid) => profilesRepo.getById(aid)),
  );
  const stopActorNameById = new Map(
    stopActorIds.map((aid, i) => [aid, stopActorProfiles[i]?.name ?? t("runs.detail.actorUnknown")]),
  );
  const stopHistoryRows = buildStopHistory(
    runWithStops.stops,
    stopEvents,
    stopActorNameById,
    t("runs.detail.actorUnknown"),
  );
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
        title={t(RUN_SLOT_LABEL_KEYS[runWithStops.slot])}
        meta={meta}
        action={<RunStatusPill status={runWithStops.status} />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <RunStatusControls runId={runWithStops.id} status={runWithStops.status} />
        {editable && (
          <EditRunSheet
            runId={runWithStops.id}
            slot={runWithStops.slot}
            runDate={runDateISO}
          />
        )}
      </div>

      {editable && (
        <section className="mb-6 border-t border-border pt-6">
          <h2 className="mb-3 font-display text-[15px] font-semibold">
            {t("runs.assignDriver.sectionTitle")}
          </h2>
          <AssignRunDriverForm
            runId={runWithStops.id}
            currentDriverId={runWithStops.driverId}
            drivers={drivers}
          />
        </section>
      )}

      {runWithStops.status === "active" && (
        <section className="mb-6 border-t border-border pt-6">
          <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.liveMap.title")}</h2>
          <RunLiveMap runId={runWithStops.id} active nextStop={nextStopCoords} />
        </section>
      )}

      <section className="mb-6 border-t border-border pt-6">
        <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.stopsSection")}</h2>
        <StopList stops={runWithStops.stops} runId={runWithStops.id} editable={editable} />
      </section>

      <StopHistorySection rows={stopHistoryRows} />

      {editable && (
        <section className="border-t border-border pt-6">
          <h2 className="mb-3 font-display text-[15px] font-semibold">{t("runs.addStop")}</h2>
          <AddStopForm
            runId={runWithStops.id}
            nextSeq={nextSeq}
            partners={partners}
            destinations={destinations}
          />
        </section>
      )}
    </div>
  );
}
