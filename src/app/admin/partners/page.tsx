import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { partnersRepo } from "@/server/db/repositories/partners";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerForm } from "@/features/admin/components/PartnerForm";
import { PartnerList } from "@/features/admin/components/PartnerList";
import { LinkDonorControl } from "@/features/admin/components/LinkDonorControl";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Partners — Rajyash Food Rescue" };

export default async function AdminPartnersPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const [t, partners, profiles] = await Promise.all([
    getTranslations("admin"),
    partnersRepo.list(),
    profilesRepo.listAll(),
  ]);
  const donors = profiles
    .filter((p) => p.role === "donor")
    .map((p) => ({ id: p.id, name: p.name, partnerId: p.partnerId }));
  const partnerOpts = partners.map((p) => ({ id: p.id, name: p.name }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">{t("partners.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("partners.addPartner")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnerForm mode="create" />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("partners.allPartners")}
        </h2>
        <PartnerList partners={partners} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("partners.linkDonorTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LinkDonorControl donors={donors} partners={partnerOpts} />
        </CardContent>
      </Card>
    </main>
  );
}
