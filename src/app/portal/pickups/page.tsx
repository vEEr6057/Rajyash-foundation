import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PickupCard } from "@/features/pickups/components/PickupCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My pickups — Rajyash Food Rescue" };

export default async function DonorPickupsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);

  const [t, pickups] = await Promise.all([
    getTranslations("portal"),
    pickupsRepo.listByDonor(session.userId),
  ]);

  const delivered = pickups.filter((p) => p.status === "delivered").length;
  const active = pickups.filter(
    (p) => p.status !== "delivered" && p.status !== "cancelled",
  ).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={t("pickup.donor.eyebrow")}
        title={t("pickup.donor.title")}
        meta={t("pickup.donor.meta", { active, delivered })}
        action={
          <Link href={ROUTES.newPickup} className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> {t("pickup.donor.newButton")}
          </Link>
        }
      />

      {pickups.length === 0 ? (
        <EmptyState
          title={t("pickup.donor.emptyTitle")}
          body={t("pickup.donor.emptyBody")}
          action={
            <Link href={ROUTES.newPickup} className={buttonVariants()}>
              {t("pickup.form.title")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pickups.map((p) => (
            <PickupCard key={p.id} pickup={p} />
          ))}
        </div>
      )}
    </main>
  );
}
