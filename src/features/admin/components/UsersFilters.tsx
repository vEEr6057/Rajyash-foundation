"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROLES, type Role } from "@/config/constants";

// One control height, hairline-matched to the pickups filter bar (AdminPickupFilters).
const FIELD =
  "rj-field h-9 rounded-md border border-border bg-transparent px-3 text-sm";
const SEARCH_DEBOUNCE_MS = 300;

/**
 * UX-13: name/email search + role filter for the admin users table. Server-side
 * (profilesRepo.listAll), driven by URL searchParams — shareable + survives
 * reload, unlike client-side filtering. The search box is debounced so it
 * doesn't push a URL update (and a server round-trip) on every keystroke; the
 * role select applies immediately.
 */
export function UsersFilters({
  current,
}: {
  current: { q?: string; role?: Role };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [q, setQ] = useState(current.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync with external URL changes (back/forward nav).
  useEffect(() => {
    setQ(current.q ?? "");
  }, [current.q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function pushParams(next: { q?: string; role?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.role !== undefined) {
      if (next.role) params.set("role", next.role);
      else params.delete("role");
    }
    params.delete("page"); // filter change -> back to page 1 (list is paginated)
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        type="search"
        className={FIELD}
        value={q}
        onChange={(e) => handleQChange(e.target.value)}
        placeholder={t("users.filters.searchPlaceholder")}
        aria-label={t("users.filters.searchLabel")}
      />
      <select
        className={FIELD}
        value={current.role ?? ""}
        onChange={(e) => pushParams({ role: e.target.value })}
        aria-label={t("users.filters.roleLabel")}
      >
        <option value="">{t("users.filters.allRoles")}</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {tCommon(`role.${r}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
