import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus, HeartHandshake, Map as MapIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationBell, PushOptIn } from "@/features/notifications";
import { LanguageSwitcher } from "@/features/public/components/LanguageSwitcher";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Rajyash Food Rescue" };

export default async function PortalDashboardPage() {
  // Defence in depth — never rely on middleware alone (AUTH-05).
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);

  const t = await getTranslations("portal");

  const isDonor = session.role === "donor";
  const isVolunteer = session.role === "volunteer";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <NotificationBell />
          <UserButton />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {isDonor
              ? t("dashboard.donorCta")
              : isVolunteer
                ? t("dashboard.volunteerCta")
                : t("dashboard.welcomeFallback")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushOptIn />
          {isDonor && (
            <div className="flex flex-wrap gap-3">
              <Link href={ROUTES.newPickup} className={buttonVariants({ size: "lg" })}>
                <Plus className="size-4" /> {t("dashboard.postPickup")}
              </Link>
              <Link href={ROUTES.donorPickups} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <HeartHandshake className="size-4" /> {t("dashboard.myPickups")}
              </Link>
            </div>
          )}
          {isVolunteer && (
            <div className="flex flex-wrap gap-3">
              <Link href={ROUTES.volunteerBoard} className={buttonVariants({ size: "lg" })}>
                {t("dashboard.browsePickups")}
              </Link>
              <Link href={ROUTES.volunteerBoardMap} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <MapIcon className="size-4" /> {t("dashboard.mapView")}
              </Link>
            </div>
          )}
          {session.role === "admin" && (
            <Link href={ROUTES.adminDashboard} className={buttonVariants({ size: "lg" })}>
              {t("dashboard.adminDashboard")}
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
