"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const FIELD =
  "rj-field h-9 rounded-md border border-border bg-transparent px-3 text-sm";
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced text search bound to the `q` URL param (server-side filtering —
 * shareable + survives reload). Changing the query also DROPS the `page`
 * param: a new search must land on page 1 or it points into a stale window.
 * Same pattern as UsersFilters (UX-13), extracted for every admin list.
 */
export function SearchParamInput({
  current,
  placeholder,
  ariaLabel,
  className,
}: {
  current?: string;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(current ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync with external URL changes (back/forward nav).
  useEffect(() => {
    setQ(current ?? "");
  }, [current]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function push(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    params.delete("page"); // new search -> page 1
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  function handleChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(value), SEARCH_DEBOUNCE_MS);
  }

  return (
    <input
      type="search"
      className={className ?? FIELD}
      value={q}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}
