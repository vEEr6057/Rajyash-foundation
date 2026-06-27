import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("pickup.donor.title")}</h1>
        <Link href={ROUTES.newPickup} className={buttonVariants({ size: "sm" })}>
          <Plus className="size-4" /> {t("pickup.donor.newButton")}
        </Link>
      </header>

      {pickups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center">
          <p className="text-muted-foreground">{t("pickup.donor.emptyState")}</p>
          <Link href={ROUTES.newPickup} className={buttonVariants({ size: "lg" }) + " mt-4"}>
            {t("pickup.donor.firstPickupCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pickups.map((p) => (
            <PickupCard key={p.id} pickup={p} />
          ))}
        </div>
      )}
    </main>
  );
}
