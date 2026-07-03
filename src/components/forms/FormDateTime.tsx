"use client";

import * as React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField } from "./FormField";

/**
 * Shared date / datetime field (frontend-practices §2) — a FormField locked
 * to the native date pickers so every schedule input looks and errors alike.
 */
export function FormDateTime<T extends FieldValues>({
  kind = "datetime-local",
  ...props
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  id?: string;
  errorClassName?: string;
  kind?: "datetime-local" | "date";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type">) {
  return <FormField {...props} type={kind} />;
}
