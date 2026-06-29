import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { UsersTable } from "@/features/admin/components/UsersTable";
import { AddUserDialog } from "@/features/admin/components/AddUserDialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Users — Rajyash Food Rescue" };

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t("users.title")}
        </h1>
        <AddUserDialog />
      </div>
      <UsersTable users={users} currentAdminId={session.userId} />
    </div>
  );
}
