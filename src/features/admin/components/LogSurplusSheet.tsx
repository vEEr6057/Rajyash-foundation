"use client";

import { useTranslations } from "next-intl";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/forms";
import { AdminSurplusForm } from "./AdminSurplusForm";
import type { Partner } from "@/server/db/schema";

/** Log-surplus-on-behalf as the shared form sheet (INT-02). AdminSurplusForm
 * navigates to /admin/pickups on success, which closes the sheet. */
export function LogSurplusSheet({
  partners,
}: {
  partners: Pick<Partner, "id" | "name" | "type" | "address">[];
}) {
  const t = useTranslations("admin");
  return (
    <FormSheet
      trigger={
        <Button variant="outline" size="sm">
          <PlusSquare className="size-4" /> {t("surplus.submitLabel")}
        </Button>
      }
      title={t("surplus.title")}
      description={t("surplus.subtitle")}
    >
      {(close) => <AdminSurplusForm partners={partners} onCancel={close} />}
    </FormSheet>
  );
}
