"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { assignDriver } from "@/features/runs/actions/runActions";
import type { Profile } from "@/server/db/schema";

/**
 * RUN-01 UI gap fix: `assignDriver(runId, driverId)` already existed as a
 * server action (re-assign the driver on an EXISTING run) but had no caller —
 * the only way to set a run's driver was at creation time. This surfaces it
 * on the admin run detail page as an inline driver picker + Save.
 */
export function AssignRunDriverForm({
  runId,
  currentDriverId,
  drivers,
}: {
  runId: string;
  currentDriverId: string | null;
  drivers: Profile[];
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [driverId, setDriverId] = useState(currentDriverId ?? "");
  const [pending, start] = useTransition();

  function save() {
    if (!driverId || driverId === currentDriverId) return;
    start(async () => {
      const res = await assignDriver(runId, driverId);
      if (res.ok) {
        toast.success(tCommon("toast.updated"));
        router.refresh();
      } else {
        toast.error(res.message ?? tCommon("toast.error"));
      }
    });
  }

  if (drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("runs.assignDriver.noDrivers")}</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        {t("runs.assignDriver.label")}
      </span>
      <Select value={driverId} onValueChange={setDriverId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t("runs.form.noDriver")} />
        </SelectTrigger>
        <SelectContent>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.email ? `${d.name} (${d.email})` : d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="leaf"
        disabled={pending || !driverId || driverId === currentDriverId}
        onClick={save}
      >
        {pending ? "…" : tCommon("buttons.save")}
      </Button>
    </div>
  );
}
