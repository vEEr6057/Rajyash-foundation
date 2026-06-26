"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { assignPickup } from "@/features/admin";

export function AssignVolunteerControl({
  pickupId,
  volunteers,
}: {
  pickupId: string;
  volunteers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [vol, setVol] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (volunteers.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("pickups.assign.noVolunteers")}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm"
        value={vol}
        onChange={(e) => setVol(e.target.value)}
        aria-label={t("pickups.assign.label")}
      >
        <option value="">{t("pickups.assign.button")}…</option>
        {volunteers.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!vol || pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const res = await assignPickup(pickupId, vol);
            if (!res.ok) setErr(res.message ?? t("pickups.assign.errorMessage"));
            else router.refresh();
          });
        }}
      >
        {pending ? "…" : t("pickups.assign.submitButton")}
      </Button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}
