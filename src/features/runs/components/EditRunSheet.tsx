"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/forms";
import { EditRunForm } from "./EditRunForm";
import type { RunSlot } from "@/config/constants";

/** Trigger + FormSheet host for EditRunForm — reuses the shared form-sheet
 * pattern (charter §3.5) rather than a standalone edit page. */
export function EditRunSheet({
  runId,
  slot,
  runDate,
}: {
  runId: string;
  slot: RunSlot;
  runDate: string; // yyyy-mm-dd
}) {
  const t = useTranslations("admin");
  return (
    <FormSheet
      trigger={
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> {t("runs.editButton")}
        </Button>
      }
      title={t("runs.editTitle")}
    >
      {(close) => (
        <EditRunForm runId={runId} slot={slot} runDate={runDate} onDone={close} />
      )}
    </FormSheet>
  );
}
