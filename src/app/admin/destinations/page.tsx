import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { DestinationList } from "@/features/admin/components/DestinationList";
import { AddDestinationDialog } from "@/features/admin/components/AddDestinationDialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Destinations — Rajyash Food Porter" };

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
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("destinations.title")}
        meta={t("destinations.meta", { count: destinations.length })}
        action={<AddDestinationDialog />}
      />

      {destinations.length === 0 ? (
        <EmptyState
          title={t("destinations.empty.title")}
          body={t("destinations.empty.body")}
          action={<AddDestinationDialog />}
        />
      ) : (
        <DestinationList destinations={destinations} />
      )}
    </div>
  );
}
