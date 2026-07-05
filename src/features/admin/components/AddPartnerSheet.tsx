"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/forms";
import { PartnerForm } from "./PartnerForm";

export function AddPartnerSheet() {
  const t = useTranslations("admin");
  return (
    <FormSheet
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> {t("partners.newButton")}
        </Button>
      }
      title={t("partners.addPartner")}
    >
      {(close) => <PartnerForm mode="create" onDone={close} onCancel={close} />}
    </FormSheet>
  );
}
