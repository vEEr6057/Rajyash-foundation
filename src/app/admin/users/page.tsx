import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES, ADMIN_PAGE_SIZE } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { parseUserFilters } from "@/features/admin";
import { UsersTable } from "@/features/admin";
import { UsersFilters } from "@/features/admin";
import { AddUserDialog } from "@/features/admin";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
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
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params.set(k, v);
  }
  const filters = parseUserFilters(params);
  const hasFilters = !!(filters.q || filters.role);
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [t, { rows: users, total }] = await Promise.all([
    getTranslations("admin"),
    profilesRepo.listAllPaged(filters, page, ADMIN_PAGE_SIZE),
  ]);
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const hrefForPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("users.title")}
        meta={t("users.meta", { count: total })}
        action={<AddUserDialog />}
      />
      <UsersFilters current={{ q: filters.q, role: filters.role }} />
      {users.length === 0 ? (
        <EmptyState
          title={t(hasFilters ? "users.empty.noMatchTitle" : "users.empty.title")}
          body={t(hasFilters ? "users.empty.noMatchBody" : "users.empty.body")}
        />
      ) : (
        <>
          <UsersTable users={users} currentAdminId={session.userId} />
          <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
