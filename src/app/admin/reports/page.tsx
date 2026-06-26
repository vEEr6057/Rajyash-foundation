import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
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
      : ymd(new Date(now.getFullYear(), now.getMonth(), 1)); // 1st of this month
  const toStr = typeof sp.to === "string" && sp.to ? sp.to : ymd(now);

  const from = new Date(fromStr);
  const to = new Date(toStr);
  to.setHours(23, 59, 59, 999); // include the whole 'to' day

  const [t, report] = await Promise.all([
    getTranslations("admin"),
    pickupsRepo.impactReport(from, to),
  ]);

  const stats = [
    { label: t("reports.metrics.servings"), value: report.servings },
    { label: t("reports.metrics.kg"), value: report.kg },
    { label: t("reports.metrics.deliveries"), value: report.count },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">
        {t("reports.title")}
      </h1>
      <ImpactReport current={{ from: fromStr, to: toStr }} />

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
      <a
        className={buttonVariants({ variant: "outline", size: "md" }) + " mt-4"}
        href={`/admin/pickups/export?from=${fromStr}&to=${toStr}`}
      >
        {t("reports.exportButton")}
      </a>
    </main>
  );
}
