"use client";

import * as React from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Shared boolean toggle field (frontend-practices §2): label + Switch, wired
 * to just `control` + `name` like the other Form* fields. First use: the
 * destination Active flag (UX-15).
 */
export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  id = name,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
}) {
  const { field } = useController({ control, name });
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch
        id={id}
        checked={!!field.value}
        onCheckedChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
      />
    </div>
  );
}
