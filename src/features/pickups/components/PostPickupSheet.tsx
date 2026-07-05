"use client";

import { useTranslations } from "next-intl";
import { FormSheet } from "@/components/forms";
import { PickupForm } from "./PickupForm";

/** "Post a pickup" as the shared form sheet — same treatment as Log surplus /
 * New run, replacing the standalone /portal/pickups/new page. PickupForm's
 * default create-success path (`router.push` to the new pickup's detail page)
 * naturally closes the sheet by navigating away, so no `onSuccess` override
 * is needed here. */
export function PostPickupSheet({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations("portal");
  return (
    <FormSheet trigger={trigger} title={t("pickup.form.title")} description={t("pickup.form.subtitle")}>
      {(close) => <PickupForm mode="create" onCancel={close} />}
    </FormSheet>
  );
}
