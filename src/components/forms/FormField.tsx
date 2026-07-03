"use client";

import * as React from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, DEFAULT_ERROR_CLASS } from "./FieldError";

/**
 * Shared text/number/date input field (frontend-practices §2): renders
 * label + control + inline error from just `control` + `name`. Validation
 * text comes from the Zod schema via zodResolver — never hand-written.
 */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  id = name,
  errorClassName = DEFAULT_ERROR_CLASS,
  ...inputProps
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  id?: string;
  errorClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  const { field, fieldState } = useController({ control, name });
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...inputProps} {...field} value={field.value ?? ""} />
      <FieldError message={fieldState.error?.message} className={errorClassName} />
    </div>
  );
}
