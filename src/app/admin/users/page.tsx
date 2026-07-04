import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { UsersTable } from "@/features/admin/components/UsersTable";
import { AddUserDialog } from "@/features/admin/components/AddUserDialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Users — Rajyash Food Porter" };

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const [t, users] = await Promise.all([
    getTranslations("admin"),
    profilesRepo.listAll(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("users.title")}
        meta={t("users.meta", { count: users.length })}
        action={<AddUserDialog />}
      />
      {users.length === 0 ? (
        <EmptyState
          title={t("users.empty.title")}
          body={t("users.empty.body")}
        />
      ) : (
        <UsersTable users={users} currentAdminId={session.userId} />
      )}
    </div>
  );
}
