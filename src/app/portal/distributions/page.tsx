import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { ROUTES, RUN_SLOT_LABEL_KEYS } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { APP_TIME_ZONE } from "@/features/pickups";
import { DistributionRunCard } from "@/features/runs";
import { DistributionsMap } from "@/features/runs";
import { toDistributionMapPins } from "@/features/runs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today's distributions — Rajyash Food Porter" };

/**
 * dispatch-model-v2 (docs/specs/dispatch-model-v2.md): volunteers never claim
 * pickups — they join an active run as a distribution helper and confirm
 * drops. This is the volunteer's "join a run" surface: today's active runs
 * with their drop stops (the pickup leg is the driver's job, not shown here).
 */
export default async function DistributionsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "volunteer") redirect(ROUTES.portalDashboard);

  const [t, tAdmin, tCommon, locale, allRuns] = await Promise.all([
    getTranslations("portal"),
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    runsRepo.listRuns(),
  ]);
  const activeRuns = allRuns.filter((r) => r.status === "active");
  const runsWithStops = await Promise.all(
    activeRuns.map((r) => runsRepo.getRunWithStops(r.id)),
  );

  // Pre-compute each run's display meta + sorted drop stops once, so the
  // card list and the map (UX-9) render from the same data — no drift.
  const runCards = runsWithStops
    .filter((run): run is NonNullable<typeof run> => run != null)
    .map((run) => {
      const dropStops = run.stops
        .filter((s) => s.kind === "drop")
        .sort((a, b) => a.seq - b.seq);
      const runDate = new Date(run.runDate).toLocaleDateString(`${locale}-IN`, {
        timeZone: APP_TIME_ZONE,
        day: "numeric",
        month: "short",
      });
      const meta = [tAdmin(RUN_SLOT_LABEL_KEYS[run.slot]), runDate].join(" · ");
      return { id: run.id, meta, dropStops };
    });
  const mapPins = toDistributionMapPins(runCards);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={tCommon("role.volunteer")}
        title={t("distributions.title")}
        meta={t("distributions.metaCount", { count: activeRuns.length })}
      />

      {activeRuns.length === 0 ? (
        <EmptyState
          title={t("distributions.emptyTitle")}
          body={t("distributions.emptyBody")}
        />
      ) : (
        <div className="space-y-4">
          {/* UX-9: only rendered when at least one drop stop has coordinates
              — no empty map. */}
          {mapPins.length > 0 && <DistributionsMap pins={mapPins} />}
          {runCards.map(({ id, meta, dropStops }) => (
            <DistributionRunCard
              key={id}
              meta={meta}
              dropStops={dropStops}
              noDropStopsLabel={t("distributions.noDropStops")}
            />
          ))}
        </div>
      )}
    </main>
  );
}
