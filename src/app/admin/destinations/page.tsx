import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES, ADMIN_PAGE_SIZE } from "@/config/constants";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { DestinationList } from "@/features/admin";
import { AddDestinationSheet } from "@/features/admin";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SearchParamInput } from "@/components/forms/SearchParamInput";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Destinations" };

export default async function AdminDestinationsPage({
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

  const [t, { rows: destinations, total }] = await Promise.all([
    getTranslations("admin"),
    destinationsRepo.listPaged(q, page, ADMIN_PAGE_SIZE),
  ]);
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("destinations.title")}
        meta={t("destinations.meta", { count: total })}
        action={<AddDestinationSheet />}
      />

      <SearchParamInput
        current={q}
        placeholder={t("list.searchPlaceholder")}
        ariaLabel={t("list.searchLabel")}
      />

      {destinations.length === 0 ? (
        <EmptyState
          title={t("destinations.empty.title")}
          body={t("destinations.empty.body")}
          action={<AddDestinationSheet />}
        />
      ) : (
        <>
          <DestinationList destinations={destinations} />
          <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
