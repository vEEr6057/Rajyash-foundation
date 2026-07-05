import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { runsRepo } from "@/server/db/repositories/runs";
import { ROUTES, RUN_SLOT_LABEL_KEYS } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { APP_TIME_ZONE } from "@/features/pickups/lib/format";
import { DistributionRunCard } from "@/features/runs/components/DistributionRunCard";

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
          {runsWithStops.map((run) => {
            if (!run) return null;
            const dropStops = run.stops
              .filter((s) => s.kind === "drop")
              .sort((a, b) => a.seq - b.seq);
            const runDate = new Date(run.runDate).toLocaleDateString(`${locale}-IN`, {
              timeZone: APP_TIME_ZONE,
              day: "numeric",
              month: "short",
            });
            const meta = [tAdmin(RUN_SLOT_LABEL_KEYS[run.slot]), runDate].join(" · ");
            return (
              <DistributionRunCard
                key={run.id}
                meta={meta}
                dropStops={dropStops}
                noDropStopsLabel={t("distributions.noDropStops")}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
