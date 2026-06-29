import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES } from "@/config/constants";
import { BuildRunForm } from "@/features/runs/components/BuildRunForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Run — Rajyash Food Rescue Admin" };

export default async function NewRunPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const t = await getTranslations("admin");
  const allProfiles = await profilesRepo.listAll();
  const drivers = allProfiles.filter((p) => p.role === "driver" && !p.deactivatedAt);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">
        {t("runs.form.title")}
      </h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <BuildRunForm drivers={drivers} />
      </div>
    </div>
  );
}
