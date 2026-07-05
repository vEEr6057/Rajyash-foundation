import type { LucideIcon } from "lucide-react";
import { LeafMark } from "@/components/LeafMark";

/**
 * The shared "nothing here yet" block (APP-UI-CHARTER §3.2): brand leaf, one slab
 * sentence, one body line, one optional CTA — never a bare "No data.". Built here;
 * adopted per-screen in batches 2–5, and in compact contexts (UX-16, e.g. the
 * notification popover) via `compact`.
 *
 * `icon` overrides the default brand leaf mark — only pass it where a Lucide glyph
 * reads better than the leaf (a small popover list); full-page empty states should
 * keep the default so the brand mark stays consistent.
 */
export function EmptyState({
  title,
  body,
  action,
  icon: Icon,
  compact = false,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-16"}`}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={compact ? "size-5 text-gold-ink opacity-70" : "size-8 text-gold-ink opacity-70"}
        />
      ) : (
        <LeafMark className={compact ? "size-5 text-gold-ink opacity-70" : "size-8 text-gold-ink opacity-70"} />
      )}
      <p className={`font-display font-medium ${compact ? "mt-2 text-sm" : "mt-4 text-lg"}`}>
        {title}
      </p>
      {body && (
        <p
          className={`text-balance text-muted-foreground ${compact ? "mt-1 max-w-xs text-xs" : "mt-1.5 max-w-sm text-sm"}`}
        >
          {body}
        </p>
      )}
      {action && <div className={compact ? "mt-3" : "mt-5"}>{action}</div>}
    </div>
  );
}
