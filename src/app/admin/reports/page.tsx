import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES, RUN_SLOT_LABEL_KEYS, type RunSlot } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { reportsRepo } from "@/server/db/repositories/reports";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LedgerRow } from "@/components/LedgerRow";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ImpactReport } from "@/features/admin/components/ImpactReport";
import { TopBar } from "@/features/admin/components/AnalyticsCharts";
import { formatReportRange } from "@/features/admin/lib/reportRange";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Reports — Rajyash Food Rescue" };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Quiet inline empty — a single centred row, never the big leaf EmptyState
 * (three per page would repeat the glyph, batch-3 §2.4). */
function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/** Section title matching the dashboard panel titles — slab 15px + hairline. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-border pb-3 font-display text-[15px] font-semibold">
      {children}
    </h2>
  );
}

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

  const [t, tCommon, locale, report, runRows, destRows, partnerRows] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    pickupsRepo.impactReport(from, to),
    reportsRepo.runSummary(from, to),
    reportsRepo.destinationBreakdown(from, to),
    reportsRepo.partnerBreakdown(from, to),
  ]);

  // Human range for the header meta — format the raw YYYY-MM-DD (UTC-anchored so
  // the day never drifts across timezones) rather than the query-mutated `to`.
  const rangeMeta = formatReportRange(fromStr, toStr, locale);

  const stats = [
    { label: t("reports.metrics.servings"), value: report.servings },
    { label: t("reports.metrics.kg"), value: report.kg },
    { label: t("reports.metrics.deliveries"), value: report.count },
  ];

  const exportUrl = `/admin/reports/export?from=${fromStr}&to=${toStr}`;
  const pickupsUrl = `/admin/pickups/export?from=${fromStr}&to=${toStr}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("reports.title")} meta={rangeMeta} />

      {/* Toolbar — date range + CSV exports on one row (worktable recipe) */}
      <div>
        <ImpactReport
          current={{ from: fromStr, to: toStr }}
          trailing={
            <>
              <a
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={pickupsUrl}
                title={t("reports.exportButton")}
              >
                {t("reports.exportButtonShort")}
              </a>
              <a
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={exportUrl}
                title={t("reports.runExportButton")}
              >
                {t("reports.runExportButtonShort")}
              </a>
            </>
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">{t("reports.approximationNote")}</p>
      </div>

      {/* Top-line metrics — ledger with provenance (batch-3 §2.3) */}
      <LedgerRow
        stats={stats.map((s) => ({ value: s.value.toLocaleString(), label: s.label }))}
        provenance={t("reports.totalsNote")}
      />

      {/* Run summary */}
      <section>
        <SectionTitle>{t("reports.breakdowns.runTitle")}</SectionTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.breakdowns.runDate")}</TableHead>
              <TableHead>{t("reports.breakdowns.runSlot")}</TableHead>
              <TableHead>{t("reports.breakdowns.runStatus")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.runPickupStops")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.runDropStops")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.runCompletedDrops")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runRows.length === 0 ? (
              <EmptyRow colSpan={6}>{t("reports.breakdowns.runEmpty")}</EmptyRow>
            ) : (
              runRows.map((r) => (
                <TableRow key={r.runId}>
                  <TableCell className="whitespace-nowrap">{r.runDate}</TableCell>
                  <TableCell>{t(RUN_SLOT_LABEL_KEYS[r.slot as RunSlot])}</TableCell>
                  <TableCell>{tCommon(`runStatus.${r.status}`)}</TableCell>
                  <TableCell className="text-right">{r.pickupStopCount}</TableCell>
                  <TableCell className="text-right">{r.dropStopCount}</TableCell>
                  <TableCell className="text-right">{r.completedDropCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {/* Destination breakdown */}
      <section>
        <SectionTitle>{t("reports.breakdowns.destTitle")}</SectionTitle>
        {destRows.length > 0 && (
          <div className="mb-3 rounded-lg border border-border bg-transparent p-3">
            <TopBar
              data={destRows
                .slice(0, 8)
                .map((r) => ({
                  name: r.destinationId ? r.destinationName : tCommon("adHocDestination"),
                  value: r.completedDropCount,
                }))}
            />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.breakdowns.destName")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.destDrops")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destRows.length === 0 ? (
              <EmptyRow colSpan={2}>{t("reports.breakdowns.destEmpty")}</EmptyRow>
            ) : (
              destRows.map((r, i) => (
                <TableRow key={r.destinationId ?? `adhoc-${i}`}>
                  <TableCell>
                    {r.destinationId ? r.destinationName : tCommon("adHocDestination")}
                  </TableCell>
                  <TableCell className="text-right">{r.completedDropCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {/* Partner breakdown */}
      <section>
        <SectionTitle>{t("reports.breakdowns.partnerTitle")}</SectionTitle>
        {partnerRows.length > 0 && (
          <div className="mb-3 rounded-lg border border-border bg-transparent p-3">
            <TopBar
              data={partnerRows
                .slice(0, 8)
                .map((r) => ({
                  name: r.partnerId ? r.partnerName : tCommon("unknownPartner"),
                  value: r.count,
                }))}
            />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.breakdowns.partnerName")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.partnerServings")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.partnerKg")}</TableHead>
              <TableHead className="text-right">{t("reports.breakdowns.partnerDeliveries")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partnerRows.length === 0 ? (
              <EmptyRow colSpan={4}>{t("reports.breakdowns.partnerEmpty")}</EmptyRow>
            ) : (
              partnerRows.map((r, i) => (
                <TableRow key={r.partnerId ?? `unknown-${i}`}>
                  <TableCell>
                    {r.partnerId ? r.partnerName : tCommon("unknownPartner")}
                  </TableCell>
                  <TableCell className="text-right">{r.servings.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.kg.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.count.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
