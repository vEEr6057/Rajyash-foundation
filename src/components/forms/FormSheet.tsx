"use client";

import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The ONE shared create/edit-form overlay (charter §3.5 "form sheet" + the
 * Log-surplus/New-run precedent): a titled side sheet with a button trigger,
 * used instead of a standalone page. Every persona's create/edit form goes
 * through this so the pattern reads identically everywhere.
 *
 * Two usage shapes:
 *  - Self-triggered (uncontrolled): pass `trigger`; the sheet manages its own
 *    open state. `children` may be a function `(close) => ReactNode` so the
 *    wrapped form can close itself after a non-navigating success (e.g. an
 *    in-place edit that just refreshes the list).
 *  - Externally controlled (no visible trigger here): pass `open` +
 *    `onOpenChange` from the parent — used for "edit this row" flows where a
 *    table row, not a button in this component, decides when to open it.
 */
export function FormSheet({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  children,
  side = "right",
  className,
}: {
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  side?: "left" | "right";
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const close = () => setOpen(false);

  return (
    <Sheet open={actualOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side={side} className={cn("overflow-y-auto sm:max-w-lg", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {typeof children === "function" ? children(close) : children}
      </SheetContent>
    </Sheet>
  );
}
