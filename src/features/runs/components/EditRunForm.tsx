"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormSelect, FormDateTime, FormActions } from "@/components/forms";
import { editRun } from "@/features/runs/actions/runActions";
import { editRunSchema, type EditRunInput } from "@/features/runs/validations/run";
import type { RunSlot } from "@/config/constants";

const SELECT = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const ERR = "mt-1 text-xs text-destructive";

/**
 * RUN-04 UI gap fix: `editRun(runId, input)` already existed as a server
 * action (change an existing run's slot/date/driver) but had no caller. This
 * form covers slot + date only — reassigning the driver is the dedicated
 * AssignRunDriverForm control on the same page, so `driverId` is left out of
 * defaultValues here (editRun leaves an omitted field untouched).
 */
export function EditRunForm({
  runId,
  slot,
  runDate,
  onDone,
}: {
  runId: string;
  slot: RunSlot;
  runDate: string; // yyyy-mm-dd
  onDone?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(editRunSchema),
    defaultValues: { slot, runDate },
  });

  function onSubmit(data: EditRunInput) {
    setErr(null);
    start(async () => {
      const res = await editRun(runId, data);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSelect
        control={control}
        name="slot"
        label={t("runs.form.slot")}
        className={SELECT}
        errorClassName={ERR}
        options={[
          { value: "morning", label: t("runs.slotMorning") },
          { value: "night", label: t("runs.slotNight") },
        ]}
      />
      <FormDateTime
        control={control}
        name="runDate"
        label={t("runs.form.date")}
        kind="date"
        className="mt-1"
        errorClassName={ERR}
      />
      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
      <FormActions
        onCancel={onDone}
        cancelLabel={tCommon("buttons.cancel")}
        submitLabel={pending ? tCommon("buttons.loading") : tCommon("buttons.save")}
        pending={pending}
        submitVariant="leaf"
      />
    </form>
  );
}
