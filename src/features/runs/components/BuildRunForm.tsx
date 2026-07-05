"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormSelect, FormDateTime, FormActions } from "@/components/forms";
import { createRun } from "@/features/runs/actions/runActions";
import { createRunSchema, type CreateRunInput } from "@/features/runs/validations/run";
import { ROUTES } from "@/config/constants";
import type { Profile } from "@/server/db/schema";

const SELECT = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const ERR = "mt-1 text-xs text-destructive";

export function BuildRunForm({
  drivers,
  onCancel,
}: {
  drivers: Profile[];
  // A FormSheet host passes its `close` so Cancel dismisses the sheet.
  onCancel?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      slot: "morning" as const,
      runDate: new Date().toISOString().slice(0, 10),
      driverId: "",
    },
  });

  function onSubmit(data: CreateRunInput) {
    setErr(null);
    start(async () => {
      const res = await createRun(data);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      router.push(ROUTES.adminRun(res.id));
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
      <FormSelect
        control={control}
        name="driverId"
        label={t("runs.form.driver")}
        className={SELECT}
        errorClassName={ERR}
        placeholder={t("runs.form.noDriver")}
        // Append the email when present so two same-named drivers are distinguishable.
        options={drivers.map((d) => ({
          value: d.id,
          label: d.email ? `${d.name} (${d.email})` : d.name,
        }))}
      />
      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
      <FormActions
        onCancel={onCancel}
        cancelLabel={tCommon("buttons.cancel")}
        submitLabel={pending ? t("runs.form.creating") : t("runs.form.create")}
        pending={pending}
        submitVariant="leaf"
      />
    </form>
  );
}
