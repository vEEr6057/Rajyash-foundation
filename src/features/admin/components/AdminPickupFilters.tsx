"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
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

const SELECT =
  "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

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
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <select
        className={SELECT}
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
        className={SELECT}
        value={f.from ?? ""}
        onChange={(e) => setF({ ...f, from: e.target.value })}
        aria-label={t("pickups.filters.dateFrom")}
      />
      <input
        type="date"
        className={SELECT}
        value={f.to ?? ""}
        onChange={(e) => setF({ ...f, to: e.target.value })}
        aria-label={t("pickups.filters.dateTo")}
      />
      <Button size="sm" onClick={() => router.push(`${ROUTES.adminPickups}?${queryString()}`)}>
        {t("pickups.filters.applyButton")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => router.push(ROUTES.adminPickups)}>
        {t("pickups.filters.clearButton")}
      </Button>
      <a
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href={`/admin/pickups/export?${queryString()}`}
      >
        {t("pickups.export.button")}
      </a>
    </div>
  );
}
