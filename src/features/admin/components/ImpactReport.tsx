"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";

const FIELD =
  "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

/**
 * Date-range driver for the impact report — pushes ?from&to; the server page
 * aggregates. `trailing` (the CSV export buttons) sits on the same toolbar row,
 * pushed right (charter §3.4 worktable recipe).
 */
export function ImpactReport({
  current,
  trailing,
}: {
  current: { from: string; to: string };
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t("reports.dateFrom")}
        <input
          type="date"
          className={FIELD}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {t("reports.dateTo")}
        <input
          type="date"
          className={FIELD}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <Button
        size="sm"
        onClick={() =>
          router.push(`${ROUTES.adminReports}?from=${from}&to=${to}`)
        }
      >
        {t("reports.updateButton")}
      </Button>
      {trailing && <div className="ml-auto flex flex-wrap gap-2">{trailing}</div>}
    </div>
  );
}
