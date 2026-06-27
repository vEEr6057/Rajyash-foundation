import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PickupForm } from "@/features/pickups/components/PickupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New pickup — Rajyash Food Rescue" };

export default async function NewPickupPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "donor") redirect(ROUTES.portalDashboard);

  const t = await getTranslations("portal");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("pickup.form.title")}</CardTitle>
          <CardDescription>{t("pickup.form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PickupForm mode="create" />
        </CardContent>
      </Card>
    </main>
  );
}
