import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { PickupForm } from "@/features/pickups/components/PickupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New pickup — Rajyash Food Porter" };

export default async function NewPickupPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "donor") redirect(ROUTES.portalDashboard);

  const t = await getTranslations("portal");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={t("pickup.form.eyebrow")}
        title={t("pickup.form.title")}
        meta={t("pickup.form.subtitle")}
      />
      <PickupForm mode="create" />
    </main>
  );
}
