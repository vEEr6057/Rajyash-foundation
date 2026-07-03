/**
 * The one title block every portal/admin screen opens with (APP-UI-CHARTER §3.1).
 * Type only — no card, no border. Renders the page's single <h1>.
 */
export function PageHeader({
  eyebrow,
  title,
  meta,
  action,
}: {
  eyebrow?: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-gold-ink">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display font-medium text-[clamp(1.375rem,2vw,1.75rem)] leading-tight text-balance">
          {title}
        </h1>
        {meta && (
          <p className="text-[13px] text-muted-foreground tabular-nums">{meta}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap gap-2 sm:justify-end">{action}</div>
      )}
    </div>
  );
}
