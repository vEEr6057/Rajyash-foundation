import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin — Rajyash Food Rescue" };

export default async function AdminDashboardPage() {
  // Defence in depth — admin-only, re-checked server-side (AUTH-05). Middleware
  // already 403s non-admins; this guards direct/RSC access too.
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const t = await getTranslations("admin");

  const SECTIONS = [
    { href: ROUTES.adminPickups, title: t("dashboard.pickupsLink"), desc: t("dashboard.pickupsDesc") },
    { href: ROUTES.adminSurplusNew, title: t("dashboard.surplusLink"), desc: t("dashboard.surplusDesc") },
    { href: ROUTES.adminUsers, title: t("dashboard.usersLink"), desc: t("dashboard.usersDesc") },
    { href: ROUTES.adminPartners, title: t("dashboard.partnersLink"), desc: t("dashboard.partnersDesc") },
    { href: ROUTES.adminDestinations, title: t("dashboard.destinationsLink"), desc: t("dashboard.destinationsDesc") },
    { href: ROUTES.adminRuns, title: t("dashboard.runsLink"), desc: t("dashboard.runsDesc") },
    { href: ROUTES.adminReports, title: t("dashboard.reportsLink"), desc: t("dashboard.reportsDesc") },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">
        {t("dashboard.title")}
      </h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:border-border-strong">
              <CardContent className="pt-5">
                <p className="font-display text-lg font-bold tracking-tight">
                  {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
