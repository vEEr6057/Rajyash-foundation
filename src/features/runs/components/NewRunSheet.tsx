"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FormSheet } from "@/components/forms";
import { BuildRunForm } from "./BuildRunForm";
import type { Profile } from "@/server/db/schema";

/** New-run as the shared form sheet (longer form) — replaces navigating to
 * /admin/runs/new. BuildRunForm navigates to the new run's detail on
 * success, which closes the sheet. `triggerVariant`/`triggerSize` let callers
 * (runs list vs admin dashboard) match their own action-row styling. */
export function NewRunSheet({
  drivers,
  triggerVariant = "leaf",
  triggerSize = "sm",
}: {
  drivers: Profile[];
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const t = useTranslations("admin");
  return (
    <FormSheet
      trigger={
        <Button variant={triggerVariant} size={triggerSize}>
          <Plus className="size-4" /> {t("runs.newButton")}
        </Button>
      }
      title={t("runs.form.title")}
    >
      {(close) => <BuildRunForm drivers={drivers} onCancel={close} />}
    </FormSheet>
  );
}
