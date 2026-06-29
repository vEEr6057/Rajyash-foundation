import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusSquare, Route, PackageOpen } from "lucide-react";
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
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
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

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Overview — Rajyash Food Rescue" };

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardContent className="pt-5">
        <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-subtle-foreground">{hint}</p>}
      </CardContent>
    </Card>
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
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  const statusSlices: DonutSlice[] = [
    { name: ov("openPickups"), value: o.pickups.open, color: "var(--warning)" },
    { name: ov("inProgress"), value: o.pickups.inProgress, color: "var(--info)" },
    { name: ov("delivered"), value: o.pickups.delivered, color: "var(--leaf)" },
    { name: ov("cancelled"), value: o.pickups.cancelled, color: "var(--muted-foreground)" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{ov("title")}</h1>
          <p className="text-xs text-muted-foreground">{ov("lastUpdated", { time: updated })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={ROUTES.adminSurplusNew} className={buttonVariants({ size: "sm" })}>
            <PlusSquare className="size-4" /> {t("dashboard.surplusLink")}
          </Link>
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
        </div>
      </div>

      {/* KPI row — impact */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={ov("servings")} value={o.impact.servings} />
        <Stat label={ov("kg")} value={o.impact.kg} />
        <Stat label={ov("deliveries")} value={o.impact.count} />
        <Stat label={ov("openPickups")} value={o.pickups.open} />
        <Stat label={ov("inProgress")} value={o.pickups.inProgress} />
        <Stat label={ov("activeRuns")} value={o.runs.active} />
      </div>

      {/* Trend + status composition */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{ov("trendTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveriesTrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ov("statusTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ov("topPartnersTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TopBar data={topPartners} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ov("topDestinationsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TopBar data={topDestinations} />
          </CardContent>
        </Card>
      </div>

      {/* Directory */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {ov("directoryTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={ov("partners")} value={o.partners} />
          <Stat label={ov("destinations")} value={o.destinations} />
          <Stat label={ov("volunteers")} value={o.volunteers} />
          <Stat label={ov("drivers")} value={o.drivers} />
        </div>
      </section>
    </div>
  );
}
