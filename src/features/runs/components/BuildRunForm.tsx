"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRun } from "@/features/runs/actions/runActions";
import { createRunSchema, type CreateRunInput } from "@/features/runs/validations/run";
import { ROUTES } from "@/config/constants";
import type { Profile } from "@/server/db/schema";

export function BuildRunForm({ drivers }: { drivers: Profile[] }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
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
      <div>
        <Label htmlFor="slot">{t("runs.form.slot")}</Label>
        <select
          id="slot"
          {...register("slot")}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="morning">{t("runs.slotMorning")}</option>
          <option value="night">{t("runs.slotNight")}</option>
        </select>
        {errors.slot && (
          <p className="mt-1 text-xs text-destructive">{errors.slot.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="runDate">{t("runs.form.date")}</Label>
        <Input id="runDate" type="date" {...register("runDate")} className="mt-1" />
        {errors.runDate && (
          <p className="mt-1 text-xs text-destructive">{String(errors.runDate.message)}</p>
        )}
      </div>
      <div>
        <Label htmlFor="driverId">{t("runs.form.driver")}</Label>
        <select
          id="driverId"
          {...register("driverId")}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("runs.form.noDriver")}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
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
