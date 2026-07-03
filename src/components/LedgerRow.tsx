import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The app-side distillation of the homepage ledger (APP-UI-CHARTER §3.3): a
 * hairline-ruled row of stats with slab tabular numerals and a provenance line.
 * No card, no shadow — the ruled row IS the pattern. Presentational: no tests.
 *
 * A stat may carry an optional `href`; when present its cell becomes a link
 * (anchor wrapper, `hover:bg-surface-2`) — used by the dashboard directory.
 * Backward-compatible: stats without `href` render as plain cells.
 */

export type LedgerStat = { value: string; label: string; href?: string };

// Static class map so Tailwind sees literal grid-cols utilities (dynamic
// `md:grid-cols-${n}` would be purged).
const MD_COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const CELL = "px-4 py-5 first:pl-0";

function StatBody({ stat }: { stat: LedgerStat }) {
  return (
    <>
      <div className="font-display font-medium tabular-nums text-[clamp(1.75rem,3vw,2.25rem)] leading-none">
        {stat.value}
      </div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">
        {stat.label}
      </div>
    </>
  );
}

export function LedgerRow({
  stats,
  provenance,
}: {
  stats: LedgerStat[];
  provenance?: string;
}) {
  const cols = MD_COLS[stats.length] ?? "md:grid-cols-3";
  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-2 divide-x divide-border border-y border-border",
          cols,
        )}
      >
        {stats.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className={cn(CELL, "transition-colors hover:bg-surface-2")}
            >
              <StatBody stat={s} />
            </Link>
          ) : (
            <div key={s.label} className={CELL}>
              <StatBody stat={s} />
            </div>
          ),
        )}
      </div>
      {provenance && (
        <p className="pt-2.5 text-xs text-muted-foreground">{provenance}</p>
      )}
    </div>
  );
}
