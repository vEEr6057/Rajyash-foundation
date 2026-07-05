import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { partnersRepo } from "@/server/db/repositories/partners";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerList } from "@/features/admin/components/PartnerList";
import { LinkDonorControl } from "@/features/admin/components/LinkDonorControl";
import { AddPartnerSheet } from "@/features/admin/components/AddPartnerSheet";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Partners — Rajyash Food Porter" };

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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("partners.title")}
        meta={t("partners.meta", { count: partners.length })}
        action={<AddPartnerSheet />}
      />

      {partners.length === 0 ? (
        <EmptyState
          title={t("partners.empty.title")}
          body={t("partners.empty.body")}
        />
      ) : (
        <PartnerList partners={partners} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("partners.linkDonorTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LinkDonorControl donors={donors} partners={partnerOpts} />
        </CardContent>
      </Card>
    </div>
  );
}
