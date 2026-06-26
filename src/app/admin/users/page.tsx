import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { UserRow } from "@/features/admin/components/UserRow";

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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">
        {t("users.title")}
      </h1>
      <div className="space-y-2">
        {users.map((u) => (
          <UserRow key={u.id} user={u} currentAdminId={session.userId} />
        ))}
      </div>
    </main>
  );
}
