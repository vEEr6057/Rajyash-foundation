import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { reportsRepo } from "@/server/db/repositories/reports";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ImpactReport } from "@/features/admin/components/ImpactReport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Reports — Rajyash Food Rescue" };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const sp = await searchParams;
  const now = new Date();
  const fromStr =
    typeof sp.from === "string" && sp.from
      ? sp.from
      : ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const toStr = typeof sp.to === "string" && sp.to ? sp.to : ymd(now);

  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999);

  const [t, report, runRows, destRows, partnerRows] = await Promise.all([
    getTranslations("admin"),
    pickupsRepo.impactReport(from, to),
    reportsRepo.runSummary(from, to),
    reportsRepo.destinationBreakdown(from, to),
    reportsRepo.partnerBreakdown(from, to),
  ]);

  const stats = [
    { label: t("reports.metrics.servings"), value: report.servings },
    { label: t("reports.metrics.kg"), value: report.kg },
    { label: t("reports.metrics.deliveries"), value: report.count },
  ];

  const exportUrl = `/admin/reports/export?from=${fromStr}&to=${toStr}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">
        {t("reports.title")}
      </h1>
      <ImpactReport current={{ from: fromStr, to: toStr }} />

      {/* Top-line metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-3xl font-bold tracking-tight text-primary">
                {s.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t("reports.totalsNote")}
      </p>

      {/* Export buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={`/admin/pickups/export?from=${fromStr}&to=${toStr}`}
        >
          {t("reports.exportButton")}
        </a>
        <a
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href={exportUrl}
        >
          {t("reports.runExportButton")}
        </a>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("reports.approximationNote")}
      </p>

      {/* Run Summary */}
      <section className="mt-8">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {t("reports.breakdowns.runTitle")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  t("reports.breakdowns.runDate"),
                  t("reports.breakdowns.runSlot"),
                  t("reports.breakdowns.runStatus"),
                  t("reports.breakdowns.runPickupStops"),
                  t("reports.breakdowns.runDropStops"),
                  t("reports.breakdowns.runCompletedDrops"),
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    {t("reports.breakdowns.runEmpty")}
                  </td>
                </tr>
              ) : (
                runRows.map((r) => (
                  <tr key={r.runId} className="odd:bg-background even:bg-muted/20">
                    <td className="px-3 py-2">{r.runDate}</td>
                    <td className="px-3 py-2">{r.slot}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.pickupStopCount}</td>
                    <td className="px-3 py-2">{r.dropStopCount}</td>
                    <td className="px-3 py-2">{r.completedDropCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Destination Breakdown */}
      <section className="mt-8">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {t("reports.breakdowns.destTitle")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  t("reports.breakdowns.destName"),
                  t("reports.breakdowns.destDrops"),
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                    {t("reports.breakdowns.destEmpty")}
                  </td>
                </tr>
              ) : (
                destRows.map((r, i) => (
                  <tr key={r.destinationId ?? `adhoc-${i}`} className="odd:bg-background even:bg-muted/20">
                    <td className="px-3 py-2">{r.destinationName}</td>
                    <td className="px-3 py-2">{r.completedDropCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Partner Breakdown */}
      <section className="mt-8">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {t("reports.breakdowns.partnerTitle")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  t("reports.breakdowns.partnerName"),
                  t("reports.breakdowns.partnerServings"),
                  t("reports.breakdowns.partnerKg"),
                  t("reports.breakdowns.partnerDeliveries"),
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partnerRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    {t("reports.breakdowns.partnerEmpty")}
                  </td>
                </tr>
              ) : (
                partnerRows.map((r, i) => (
                  <tr key={r.partnerId ?? `unknown-${i}`} className="odd:bg-background even:bg-muted/20">
                    <td className="px-3 py-2">{r.partnerName}</td>
                    <td className="px-3 py-2">{r.servings.toLocaleString()}</td>
                    <td className="px-3 py-2">{r.kg.toLocaleString()}</td>
                    <td className="px-3 py-2">{r.count.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
