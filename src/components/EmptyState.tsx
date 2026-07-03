import { LeafMark } from "@/components/LeafMark";

/**
 * The shared "nothing here yet" block (APP-UI-CHARTER §3.2): brand leaf, one slab
 * sentence, one body line, one optional CTA — never a bare "No data.". Built here;
 * adopted per-screen in batches 2–5.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <LeafMark className="size-8 text-gold-ink opacity-70" />
      <p className="mt-4 font-display font-medium text-lg">{title}</p>
      {body && (
        <p className="mt-1.5 max-w-sm text-balance text-sm text-muted-foreground">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
