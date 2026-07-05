"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/forms";
import { DestinationForm } from "./DestinationForm";

export function AddDestinationSheet() {
  const t = useTranslations("admin");
  return (
    <FormSheet
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> {t("destinations.addDestination")}
        </Button>
      }
      title={t("destinations.addDestination")}
      description={t("destinations.seedNote")}
      className="sm:max-w-xl"
    >
      {(close) => <DestinationForm mode="create" onDone={close} onCancel={close} />}
    </FormSheet>
  );
}
