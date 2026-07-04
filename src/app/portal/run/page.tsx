import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { ROUTES, RUN_SLOT_LABEL_KEYS } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LeafMark } from "@/components/LeafMark";
import { APP_TIME_ZONE } from "@/features/pickups/lib/format";
import { NavigateButton } from "@/features/pickups/components/NavigateButton";
import { StopStatusPill } from "@/features/runs/components/StopStatusPill";
import { MarkStopDoneButton } from "@/features/runs/components/MarkStopDoneButton";
import { RunTracker } from "@/features/runs/components/RunTracker";
import { RunLiveMap } from "@/features/runs/components/RunLiveMap";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("run.metaTitle") };
}

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
  // Slot label lives in the shared `admin` runs catalog (single source).
  const tAdmin = await getTranslations("admin");

  const allRuns = await runsRepo.listRunsForDriver(session.userId);
  const activeRun =
    allRuns.find((r) => r.status === "active") ??
    allRuns.find((r) => r.status === "planned") ??
    null;

  // No run assigned — EmptyState primitive, but keep the coordinator phone line.
  if (!activeRun) {
    const tCommon = await getTranslations("common");
    const phone = tCommon("footer.phone");
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader eyebrow={t("run.eyebrow")} title={t("run.title")} />
        <EmptyState title={t("run.emptyTitle")} body={t("run.emptyState")} />
        <p className="mx-auto max-w-sm border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {t("run.help")}{" "}
          <a href={`tel:${phone}`} className="font-semibold text-primary">
            {phone}
          </a>
        </p>
      </main>
    );
  }

  const runWithStops = await runsRepo.getRunWithStops(activeRun.id);
  if (!runWithStops) redirect(ROUTES.portalDashboard);

  const stops = [...runWithStops.stops].sort((a, b) => a.seq - b.seq);
  // Current stop = first stop still to do (mirrors the mark-done ordering).
  const currentStop = stops.find((s) => s.status === "pending");
  const quietStops = stops.filter((s) => s.id !== currentStop?.id);

  const nextStopCoords =
    currentStop && currentStop.lat !== null && currentStop.lng !== null
      ? { lat: currentStop.lat, lng: currentStop.lng }
      : null;

  const runDate = new Date(activeRun.runDate).toLocaleDateString("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const meta = [
    tAdmin(RUN_SLOT_LABEL_KEYS[activeRun.slot]),
    runDate,
    `${stops.length} ${t("run.stopCount")}`,
  ].join(" · ");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader eyebrow={t("run.eyebrow")} title={t("run.title")} meta={meta} />

      {stops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          {t("run.noStopsYet")}
        </div>
      ) : (
        <div className="space-y-6">
          {currentStop ? (
            /* The one elevated block: current stop + thumb-reach actions. */
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold tabular-nums text-gold-ink">
                    {currentStop.seq}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {currentStop.kind === "pickup"
                      ? t("run.stop.kindPickup")
                      : t("run.stop.kindDrop")}
                  </span>
                </div>
                <StopStatusPill status={currentStop.status} />
              </div>
              <p className="mt-2 text-base font-medium">
                {currentStop.address ?? "—"}
              </p>
              {currentStop.notes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentStop.notes}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {currentStop.lat !== null && currentStop.lng !== null && (
                  <NavigateButton lat={currentStop.lat} lng={currentStop.lng} />
                )}
                <MarkStopDoneButton
                  stopId={currentStop.id}
                  stopStatus={currentStop.status}
                  variant="primary"
                  size="lg"
                />
              </div>
            </div>
          ) : (
            /* All stops handled — static run-complete header. */
            <div className="flex flex-col items-center py-8 text-center">
              <LeafMark className="size-8 text-gold-ink opacity-70" />
              <p className="mt-4 font-display text-lg font-medium">
                {t("run.completeTitle")}
              </p>
            </div>
          )}

          {quietStops.length > 0 && (
            <div className="divide-y divide-border border-y border-border">
              {quietStops.map((stop) => (
                <div key={stop.id} className="flex items-center gap-3 py-4">
                  <span className="w-6 shrink-0 font-display text-sm font-semibold tabular-nums text-gold-ink">
                    {stop.seq}
                  </span>
                  <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {stop.kind === "pickup"
                      ? t("run.stop.kindPickup")
                      : t("run.stop.kindDrop")}
                  </span>
                  <span className="flex-1 truncate text-base">
                    {stop.address ?? "—"}
                  </span>
                  <StopStatusPill status={stop.status} />
                </div>
              ))}
            </div>
          )}
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
