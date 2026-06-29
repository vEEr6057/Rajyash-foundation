import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { Card, CardContent } from "@/components/ui/card";
import { DestinationForm } from "@/features/admin/components/DestinationForm";
import { DestinationList } from "@/features/admin/components/DestinationList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Destinations — Rajyash Food Rescue" };

export default async function AdminDestinationsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const [t, destinations] = await Promise.all([
    getTranslations("admin"),
    destinationsRepo.list(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {t("destinations.title")}
      </h1>

      <Card>
        <CardContent className="pt-5">
          <p className="mb-3 font-display text-lg font-bold tracking-tight">
            {t("destinations.addDestination")}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("destinations.seedNote")}
          </p>
          <DestinationForm mode="create" />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("destinations.allDestinations")}
        </h2>
        <DestinationList destinations={destinations} />
      </section>
    </div>
  );
}
