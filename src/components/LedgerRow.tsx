import { cn } from "@/lib/utils";

/**
 * The app-side distillation of the homepage ledger (APP-UI-CHARTER §3.3): a
 * hairline-ruled row of stats with slab tabular numerals and a provenance line.
 * No card, no shadow — the ruled row IS the pattern. Presentational: no tests.
 */

// Static class map so Tailwind sees literal grid-cols utilities (dynamic
// `md:grid-cols-${n}` would be purged).
const MD_COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

export function LedgerRow({
  stats,
  provenance,
}: {
  stats: { value: string; label: string }[];
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
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-5 first:pl-0">
            <div className="font-display font-medium tabular-nums text-[clamp(1.75rem,3vw,2.25rem)] leading-none">
              {s.value}
            </div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      {provenance && (
        <p className="pt-2.5 text-xs text-muted-foreground">{provenance}</p>
      )}
    </div>
  );
}
