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

/** App-standard native-select styling (matches ui/Input's rj-field look). */
const DEFAULT_SELECT_CLASS =
  "rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]";

/**
 * Shared select field (frontend-practices §2): label + native <select> +
 * inline error from `control` + `name`. Pass `placeholder` to render a
 * disabled-free empty first option (value "").
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  id = name,
  className = DEFAULT_SELECT_CLASS,
  errorClassName = DEFAULT_ERROR_CLASS,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
  className?: string;
  errorClassName?: string;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={className} {...field} value={field.value ?? ""}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError message={fieldState.error?.message} className={errorClassName} />
    </div>
  );
}
