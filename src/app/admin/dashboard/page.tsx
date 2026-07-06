import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import {
  getAdminDashboardData,
  type AdminOverview,
  type AdminDashboardData,
} from "@/server/db/repositories/stats";
import { partnersRepo } from "@/server/db/repositories/partners";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/withTimeout";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { LedgerRow } from "@/components/LedgerRow";
import { LogSurplusSheet } from "@/features/admin";
import { NewRunSheet } from "@/features/runs";
import {
  DeliveriesTrendChart,
  StatusDonut,
  TopBar,
  type DonutSlice,
  type BarDatum,
} from "@/features/admin";

const EMPTY_OVERVIEW: AdminOverview = {
  impact: { servings: 0, kg: 0, count: 0 },
  pickups: { total: 0, open: 0, inProgress: 0, delivered: 0, cancelled: 0 },
  runs: { total: 0, active: 0, planned: 0, completed: 0 },
  partners: 0,
  destinations: 0,
  volunteers: 0,
  drivers: 0,
};

const EMPTY_DASHBOARD: AdminDashboardData = {
  overview: EMPTY_OVERVIEW,
  trend: [],
  partnerBreakdown: [],
  destinationBreakdown: [],
};

// Pickup-status composition colours draw from the status-pill DOT tokens so the
// donut reads the same language as the pills elsewhere (charter §1.2).
const CHART_COLORS = {
  open: "var(--st-requested-dot)", // amber
  inProgress: "var(--st-accepted-dot)", // blue
  delivered: "var(--st-delivered-dot)", // green
  cancelled: "var(--st-cancelled-dot)", // red/grey
} as const;

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Overview" };

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

  // UX-11 → single-round-trip rewrite (2026-07-07): the previous shape fired
  // the four analytics aggregates as separate wrapped promises (~9 queries
  // total with the popup directories). On Workers each request opens fresh
  // Postgres connections (pool max 5, server/db/client.ts) and pays
  // cross-region RTT per query, so the batch routinely blew the 8s budget and
  // EVERY tile degraded to zero (wrangler-tail evidence: "withTimeout:
  // dependency exceeded budget, label: dashboard.overview/trend"). All
  // aggregates now ride ONE json_build_object statement
  // (getAdminDashboardData) — one connection, one round trip — leaving three
  // DB reads total. withTimeout still bounds each so a slow moment degrades a
  // panel, not the page (production-discipline §3).
  const DB_BUDGET_MS = 8000;
  const [t, tCommon, locale, partners, drivers, dash] = await Promise.all([
    getTranslations("admin"),
    getTranslations("common"),
    getLocale(),
    // Partners power the Log-surplus popup; drivers power the New-run popup
    // (both rendered in the header, not a separate page).
    withTimeout(partnersRepo.list().catch(() => []), DB_BUDGET_MS, [], "dashboard.partners"),
    withTimeout(
      profilesRepo.listByRole("driver").catch(() => []),
      DB_BUDGET_MS,
      [],
      "dashboard.drivers",
    ),
    withTimeout(
      getAdminDashboardData(30).catch((e: unknown) => {
        logger.error("admin dashboard aggregates failed", { err: String(e) });
        return EMPTY_DASHBOARD;
      }),
      DB_BUDGET_MS,
      EMPTY_DASHBOARD,
      "dashboard.aggregates",
    ),
  ]);
  const { overview: o, trend, partnerBreakdown: partnerRows, destinationBreakdown: destRows } = dash;

  const topPartners: BarDatum[] = partnerRows.slice(0, 5).map((p) => ({
    name: p.partnerId ? p.partnerName : tCommon("unknownPartner"),
    value: p.count,
  }));
  const topDestinations: BarDatum[] = destRows.slice(0, 5).map((d) => ({
    name: d.destinationId ? d.destinationName : tCommon("adHocDestination"),
    value: d.completedDropCount,
  }));

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
            <NewRunSheet drivers={drivers} />
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
          {
            value: o.impact.servings.toLocaleString(),
            label: ov("servings"),
            hint: ov("servingsHint"),
          },
          { value: o.impact.kg.toLocaleString(), label: ov("kg"), hint: ov("kgHint") },
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
