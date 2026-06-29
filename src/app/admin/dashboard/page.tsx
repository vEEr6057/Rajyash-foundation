import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusSquare, Route, PackageOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { getAdminOverview } from "@/server/db/repositories/stats";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Overview — Rajyash Food Rescue" };

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
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

  const [t, o] = await Promise.all([getTranslations("admin"), getAdminOverview()]);
  const ov = (k: string) => t(`dashboard.overview.${k}`);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {ov("title")}
        </h1>
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

      {/* Impact */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {ov("impactTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={ov("servings")} value={o.impact.servings} />
          <Stat label={ov("kg")} value={o.impact.kg} />
          <Stat label={ov("deliveries")} value={o.impact.count} />
        </div>
      </section>

      {/* Operations */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {ov("opsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label={ov("openPickups")} value={o.pickups.open} />
          <Stat label={ov("inProgress")} value={o.pickups.inProgress} />
          <Stat label={ov("delivered")} value={o.pickups.delivered} />
          <Stat label={ov("activeRuns")} value={o.runs.active} />
          <Stat label={ov("plannedRuns")} value={o.runs.planned} />
        </div>
      </section>

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
