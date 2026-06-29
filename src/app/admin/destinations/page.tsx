import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { DestinationList } from "@/features/admin/components/DestinationList";
import { AddDestinationDialog } from "@/features/admin/components/AddDestinationDialog";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t("destinations.title")}
        </h1>
        <AddDestinationDialog />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("destinations.allDestinations")}
        </h2>
        <DestinationList destinations={destinations} />
      </section>
    </div>
  );
}
