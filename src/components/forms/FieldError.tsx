"use client";

/** Default inline-error styling shared by the Form* field components. */
export const DEFAULT_ERROR_CLASS = "mt-1.5 text-sm text-destructive";

/**
 * Inline validation error under a form control. Renders nothing when the
 * field is valid; the message always comes from the Zod schema (zodResolver).
 */
export function FieldError({
  message,
  className = DEFAULT_ERROR_CLASS,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return <p className={className}>{message}</p>;
}
