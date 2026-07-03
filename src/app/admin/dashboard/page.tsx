import Link from "next/link";
import { redirect } from "next/navigation";
import { Route, PackageOpen } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import {
  getAdminOverview,
  getDeliveriesTrend,
  type AdminOverview,
  type TrendPoint,
} from "@/server/db/repositories/stats";
import { reportsRepo } from "@/server/db/repositories/reports";
import { partnersRepo } from "@/server/db/repositories/partners";
import { logger } from "@/lib/logger";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LedgerRow } from "@/components/LedgerRow";
import { LogSurplusSheet } from "@/features/admin/components/LogSurplusSheet";
import {
  DeliveriesTrendChart,
  StatusDonut,
  TopBar,
  type DonutSlice,
  type BarDatum,
} from "@/features/admin/components/AnalyticsCharts";

const EMPTY_OVERVIEW: AdminOverview = {
  impact: { servings: 0, kg: 0, count: 0 },
  pickups: { total: 0, open: 0, inProgress: 0, delivered: 0, cancelled: 0 },
  runs: { total: 0, active: 0, planned: 0, completed: 0 },
  partners: 0,
  destinations: 0,
  volunteers: 0,
  drivers: 0,
};

const ALL_TIME_FROM = new Date(0);
const ALL_TIME_TO = new Date(9999, 0, 1);

// Pickup-status composition colours draw from the status-pill DOT tokens so the
// donut reads the same language as the pills elsewhere (charter §1.2).
const CHART_COLORS = {
  open: "var(--st-requested-dot)", // amber
  inProgress: "var(--st-accepted-dot)", // blue
  delivered: "var(--st-delivered-dot)", // green
  cancelled: "var(--st-cancelled-dot)", // red/grey
} as const;

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Overview — Rajyash Food Rescue" };

/** Hairline chart panel (charter §3 / batch-3 §1.1): one rule, no shadow. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-transparent p-4">
      <h2 className="border-b border-border pb-3 font-display text-[15px] font-semibold">
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);

  // Partners power the Log-surplus popup (rendered in the header, not a separate page).
  const partners = await partnersRepo.list().catch(() => []);

  let o: AdminOverview = EMPTY_OVERVIEW;
  let trend: TrendPoint[] = [];
  let topPartners: BarDatum[] = [];
  let topDestinations: BarDatum[] = [];
  try {
    const [overview, t30, partnerRows, destRows] = await Promise.all([
      getAdminOverview(),
      getDeliveriesTrend(30),
      reportsRepo.partnerBreakdown(ALL_TIME_FROM, ALL_TIME_TO),
      reportsRepo.destinationBreakdown(ALL_TIME_FROM, ALL_TIME_TO),
    ]);
    o = overview;
    trend = t30;
    topPartners = partnerRows
      .slice(0, 5)
      .map((p) => ({ name: p.partnerName, value: p.count }));
    topDestinations = destRows
      .slice(0, 5)
      .map((d) => ({ name: d.destinationName, value: d.completedDropCount }));
  } catch (e) {
    logger.error("admin overview stats failed", { err: String(e) });
  }

  const ov = (k: string, values?: Record<string, string>) =>
    t(`dashboard.overview.${k}`, values);
  const updated = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  const statusSlices: DonutSlice[] = [
    { name: ov("openPickups"), value: o.pickups.open, color: CHART_COLORS.open },
    { name: ov("inProgress"), value: o.pickups.inProgress, color: CHART_COLORS.inProgress },
    { name: ov("delivered"), value: o.pickups.delivered, color: CHART_COLORS.delivered },
    { name: ov("cancelled"), value: o.pickups.cancelled, color: CHART_COLORS.cancelled },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={t("dashboard.title")}
        title={ov("title")}
        meta={ov("lastUpdated", { time: updated })}
        action={
          <>
            <LogSurplusSheet partners={partners} />
            <Link
              href={`${ROUTES.adminRuns}/new`}
              className={buttonVariants({ variant: "leaf", size: "sm" })}
            >
              <Route className="size-4" /> {t("runs.newButton")}
            </Link>
            <Link
              href={ROUTES.adminPickups}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <PackageOpen className="size-4" /> {t("dashboard.pickupsLink")}
            </Link>
          </>
        }
      />

      {/* Impact ledger — one hairline-ruled row, provenance stated (charter §3.3) */}
      <LedgerRow
        stats={[
          { value: o.impact.servings.toLocaleString(), label: ov("servings") },
          { value: o.impact.kg.toLocaleString(), label: ov("kg") },
          { value: o.impact.count.toLocaleString(), label: ov("deliveries") },
          { value: o.pickups.open.toLocaleString(), label: ov("openPickups") },
          { value: o.pickups.inProgress.toLocaleString(), label: ov("inProgress") },
          { value: o.runs.active.toLocaleString(), label: ov("activeRuns") },
        ]}
        provenance={ov("provenance")}
      />

      {/* Trend + status composition */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title={ov("trendTitle")}>
            <DeliveriesTrendChart data={trend} />
          </Panel>
        </div>
        <Panel title={ov("statusTitle")}>
          <StatusDonut data={statusSlices} />
          <ul className="mt-3 space-y-1">
            {statusSlices.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">{s.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={ov("topPartnersTitle")}>
          <TopBar data={topPartners} />
        </Panel>
        <Panel title={ov("topDestinationsTitle")}>
          <TopBar data={topDestinations} />
        </Panel>
      </div>

      {/* Directory — a linked ledger row (charter §3.3), each stat to its page */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-gold-ink">
          {ov("directoryTitle")}
        </h2>
        <LedgerRow
          stats={[
            { value: o.partners.toLocaleString(), label: ov("partners"), href: ROUTES.adminPartners },
            { value: o.destinations.toLocaleString(), label: ov("destinations"), href: ROUTES.adminDestinations },
            { value: o.volunteers.toLocaleString(), label: ov("volunteers"), href: ROUTES.adminUsers },
            { value: o.drivers.toLocaleString(), label: ov("drivers"), href: ROUTES.adminUsers },
          ]}
        />
      </section>
    </div>
  );
}
