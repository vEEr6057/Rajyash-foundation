"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/forms";
import { PickupForm } from "./PickupForm";
import { toDatetimeLocal } from "../lib/format";
import type { Pickup } from "@/server/db/schema";

type EditablePickup = Pick<
  Pickup,
  | "id"
  | "category"
  | "description"
  | "quantity"
  | "quantityUnit"
  | "windowStart"
  | "windowEnd"
  | "address"
  | "lat"
  | "lng"
  | "foodPhotoPath"
>;

/**
 * Donor "Edit pickup" as the shared form sheet, opened from the pickup detail
 * page — replaces the standalone /portal/pickups/[id]/edit page. Edits happen
 * in place: on success the sheet closes and the detail page refreshes rather
 * than navigating away, so this is the one PickupForm caller that passes
 * `onSuccess` (every other caller keeps the default push-to-detail-page).
 */
export function EditPickupSheet({
  pickup,
  trigger,
}: {
  pickup: EditablePickup;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("portal");
  return (
    <FormSheet trigger={trigger} title={t("pickup.form.editTitle")}>
      {(close) => (
        <PickupForm
          mode="edit"
          pickupId={pickup.id}
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
          onCancel={close}
          onSuccess={() => {
            close();
            router.refresh();
          }}
        />
      )}
    </FormSheet>
  );
}
