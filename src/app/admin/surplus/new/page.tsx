import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole, AuthError, getSession } from "@/server/auth/session";
import { partnersRepo } from "@/server/db/repositories/partners";
import { ROUTES } from "@/config/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AdminSurplusForm } from "@/features/admin/components/AdminSurplusForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log surplus — Rajyash Food Rescue" };

export default async function AdminSurplusNewPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const t = await getTranslations("admin");
  const partners = await partnersRepo.list();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("surplus.title")}</CardTitle>
          <CardDescription>{t("surplus.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSurplusForm partners={partners} />
        </CardContent>
      </Card>
    </main>
  );
}
