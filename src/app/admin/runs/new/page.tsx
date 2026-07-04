import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { ROUTES } from "@/config/constants";
import { BuildRunForm } from "@/features/runs/components/BuildRunForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Run — Rajyash Food Porter Admin" };

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
  // Build-run form only offers drivers — fetch just that role, not every profile.
  const drivers = await profilesRepo.listByRole("driver");

  return (
    <div className="mx-auto max-w-[40rem]">
      <h1 className="mb-6 font-display text-2xl font-medium tracking-tight">
        {t("runs.form.title")}
      </h1>
      <BuildRunForm drivers={drivers} />
    </div>
  );
}
