import * as React from "react";
import { cn } from "@/lib/utils";

// Worktable shell (APP-UI-CHARTER §3.4): no floating card — structure by hairlines
// only. `border-y` on the table block, `divide-y` rows, 44px body rows, hover
// `surface-2`. One elevation level per screen, maximum.
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom border-y border-border text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-surface-2 data-[state=selected]:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-3 py-3 align-middle tabular-nums", className)} {...props} />
  );
}

export function TableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
