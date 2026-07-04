"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ROUTES,
  PICKUP_STATUSES,
} from "@/config/constants";

type Filters = {
  status?: string;
  donorId?: string;
  volunteerId?: string;
  from?: string;
  to?: string;
};

// One control height, hairline-matched to the worktable shell (BATCH-2 §2).
const FIELD =
  "rj-field h-9 rounded-md border border-border bg-transparent px-3 text-sm";

export function AdminPickupFilters({ current }: { current: Filters }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [f, setF] = useState<Filters>(current);

  const queryString = () => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <select
        className={FIELD}
        value={f.status ?? ""}
        onChange={(e) => setF({ ...f, status: e.target.value })}
        aria-label={t("pickups.filters.status")}
      >
        <option value="">{t("pickups.filters.allStatuses")}</option>
        {PICKUP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {tCommon(`status.${s}`)}
          </option>
        ))}
      </select>
      <input
        type="date"
        className={FIELD}
        value={f.from ?? ""}
        onChange={(e) => setF({ ...f, from: e.target.value })}
        aria-label={t("pickups.filters.dateFrom")}
      />
      <input
        type="date"
        className={FIELD}
        value={f.to ?? ""}
        onChange={(e) => setF({ ...f, to: e.target.value })}
        aria-label={t("pickups.filters.dateTo")}
      />
      <Button size="sm" onClick={() => router.push(`${ROUTES.adminPickups}?${queryString()}`)}>
        {t("pickups.filters.applyButton")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          // Reset the local field state too, or the <select> stays visually stuck on
          // the old status even though the URL (and data) cleared.
          setF({});
          router.push(ROUTES.adminPickups);
        }}
      >
        {t("pickups.filters.clearButton")}
      </Button>
      <a
        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "ml-auto")}
        href={`/admin/pickups/export?${queryString()}`}
      >
        {t("pickups.export.button")}
      </a>
    </div>
  );
}
