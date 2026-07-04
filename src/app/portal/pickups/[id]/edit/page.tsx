import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { PickupForm } from "@/features/pickups/components/PickupForm";
import { toDatetimeLocal } from "@/features/pickups/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("pickup.form.editMetaTitle") };
}

export default async function EditPickupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);

  const pickup = await pickupsRepo.getById(id);
  if (!pickup || pickup.donorId !== session.userId) notFound();
  if (pickup.status !== "requested") redirect(ROUTES.pickup(id));

  const t = await getTranslations("portal");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={t("pickup.form.eyebrow")}
        title={t("pickup.form.editTitle")}
      />
      <PickupForm
        mode="edit"
        pickupId={id}
        defaults={{
          category: pickup.category,
          description: pickup.description ?? "",
          quantity: pickup.quantity,
          quantityUnit: pickup.quantityUnit,
          windowStart: toDatetimeLocal(pickup.windowStart),
          windowEnd: toDatetimeLocal(pickup.windowEnd),
          address: pickup.address,
          lat: pickup.lat,
          lng: pickup.lng,
          safetyAttested: true,
          foodPhotoPath: pickup.foodPhotoPath ?? "",
        }}
      />
    </main>
  );
}
