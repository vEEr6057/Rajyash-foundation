import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { partnersRepo } from "@/server/db/repositories/partners";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerList } from "@/features/admin";
import { LinkDonorControl } from "@/features/admin";
import { AddPartnerSheet } from "@/features/admin";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SearchParamInput } from "@/components/forms/SearchParamInput";
import { Pagination } from "@/components/ui/pagination";
import { ADMIN_PAGE_SIZE } from "@/config/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Partners" };

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [t, { rows: partners, total }, profiles] = await Promise.all([
    getTranslations("admin"),
    partnersRepo.listPaged(q, page, ADMIN_PAGE_SIZE),
    profilesRepo.listAll(),
  ]);
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };
  const donors = profiles
    .filter((p) => p.role === "donor")
    .map((p) => ({ id: p.id, name: p.name, partnerId: p.partnerId }));
  const partnerOpts = partners.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("partners.title")}
        meta={t("partners.meta", { count: total })}
        action={<AddPartnerSheet />}
      />

      <SearchParamInput
        current={q}
        placeholder={t("list.searchPlaceholder")}
        ariaLabel={t("list.searchLabel")}
      />

      {partners.length === 0 ? (
        <EmptyState
          title={t("partners.empty.title")}
          body={t("partners.empty.body")}
        />
      ) : (
        <>
          <PartnerList partners={partners} />
          <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
        </>
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
