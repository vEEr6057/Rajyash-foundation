"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The shared Cancel/primary-action footer for every create/edit form (charter
 * §3.5 "form sheet"): ghost Cancel + full-width-on-mobile primary submit.
 * `onCancel` is typically a FormSheet `close()` callback; omit it for a form
 * with no meaningful cancel affordance (rare — most now sit in a FormSheet).
 *
 * `sticky` (UX-6): pins the bar to the bottom of the scrollable FormSheet on
 * mobile only (`sm:static` releases it back into flow on desktop) — for long
 * forms where the primary action would otherwise sit below the fold.
 */
export function FormActions({
  onCancel,
  cancelLabel,
  submitLabel,
  pending,
  submitVariant,
  sticky,
}: {
  onCancel?: () => void;
  cancelLabel: string;
  submitLabel: string;
  pending?: boolean;
  submitVariant?: ButtonProps["variant"];
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        sticky &&
          "sticky bottom-0 z-10 -mx-4 border-t border-border bg-surface px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0",
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        size="lg"
        variant={submitVariant}
        className="min-h-12 w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
