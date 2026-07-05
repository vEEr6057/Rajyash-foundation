"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * The shared Cancel/primary-action footer for every create/edit form (charter
 * §3.5 "form sheet"): ghost Cancel + full-width-on-mobile primary submit.
 * `onCancel` is typically a FormSheet `close()` callback; omit it for a form
 * with no meaningful cancel affordance (rare — most now sit in a FormSheet).
 */
export function FormActions({
  onCancel,
  cancelLabel,
  submitLabel,
  pending,
  submitVariant,
}: {
  onCancel?: () => void;
  cancelLabel: string;
  submitLabel: string;
  pending?: boolean;
  submitVariant?: ButtonProps["variant"];
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        className="w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
