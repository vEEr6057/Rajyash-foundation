"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect, FormDateTime } from "@/components/forms";
import { createRun } from "@/features/runs/actions/runActions";
import { createRunSchema, type CreateRunInput } from "@/features/runs/validations/run";
import { ROUTES } from "@/config/constants";
import type { Profile } from "@/server/db/schema";

const SELECT = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const ERR = "mt-1 text-xs text-destructive";

export function BuildRunForm({ drivers }: { drivers: Profile[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
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
      <Button type="submit" variant="leaf" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? t("runs.form.creating") : t("runs.form.create")}
      </Button>
    </form>
  );
}
