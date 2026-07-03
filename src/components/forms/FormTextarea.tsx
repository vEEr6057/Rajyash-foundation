"use client";

import * as React from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FieldError, DEFAULT_ERROR_CLASS } from "./FieldError";

const DEFAULT_TEXTAREA_CLASS =
  "rj-field w-full rounded-lg border border-input bg-surface px-3 py-2 text-[15px]";

/**
 * Shared textarea field (frontend-practices §2): label + textarea + inline
 * error from `control` + `name`.
 */
export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  id = name,
  className = DEFAULT_TEXTAREA_CLASS,
  errorClassName = DEFAULT_ERROR_CLASS,
  ...textareaProps
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  id?: string;
  className?: string;
  errorClassName?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id" | "className">) {
  const { field, fieldState } = useController({ control, name });
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} className={className} {...textareaProps} {...field} value={field.value ?? ""} />
      <FieldError message={fieldState.error?.message} className={errorClassName} />
    </div>
  );
}
