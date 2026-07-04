import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Server-friendly pagination. Renders Prev / page numbers / Next as links so it
 * works inside server components (URL-driven, ?page=N). Caller supplies the href
 * builder so existing query params (filters) are preserved.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  className,
  label = "Pagination",
  prevLabel = "Previous page",
  nextLabel = "Next page",
}: {
  page: number;
  totalPages: number;
  hrefForPage: (p: number) => string;
  className?: string;
  // aria labels — pass localized strings from the call site (this primitive has no
  // translator so it stays usable in both server and client trees).
  label?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;

  // Compact window: first, last, current ±1, ellipses.
  const pages: (number | "…")[] = [];
  const push = (p: number) => pages.push(p);
  const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  let prev = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (!window.has(p)) continue;
    if (p - prev > 1) pages.push("…");
    push(p);
    prev = p;
  }

  const linkCls = (active: boolean) =>
    cn(
      buttonVariants({ variant: active ? "primary" : "ghost", size: "icon" }),
      "min-w-9",
    );

  return (
    <nav
      aria-label={label}
      className={cn("flex items-center justify-end gap-1", className)}
    >
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={linkCls(false)} aria-label={prevLabel}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkCls(false), "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefForPage(p)}
            aria-current={p === page ? "page" : undefined}
            className={linkCls(p === page)}
          >
            {p}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={linkCls(false)} aria-label={nextLabel}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkCls(false), "pointer-events-none opacity-40")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
