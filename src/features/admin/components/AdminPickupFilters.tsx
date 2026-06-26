"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ROUTES,
  PICKUP_STATUSES,
  PICKUP_STATUS_LABELS,
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
        aria-label="Status"
      >
        <option value="">All statuses</option>
        {PICKUP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PICKUP_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <input
        type="date"
        className={SELECT}
        value={f.from ?? ""}
        onChange={(e) => setF({ ...f, from: e.target.value })}
        aria-label="From date"
      />
      <input
        type="date"
        className={SELECT}
        value={f.to ?? ""}
        onChange={(e) => setF({ ...f, to: e.target.value })}
        aria-label="To date"
      />
      <Button size="sm" onClick={() => router.push(`${ROUTES.adminPickups}?${queryString()}`)}>
        Filter
      </Button>
      <Button size="sm" variant="ghost" onClick={() => router.push(ROUTES.adminPickups)}>
        Clear
      </Button>
      <a
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href={`/admin/pickups/export?${queryString()}`}
      >
        Export CSV
      </a>
    </div>
  );
}
