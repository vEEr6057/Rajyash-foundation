"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

// Thin re-export (shadcn convention) — no extra styling needed, callers compose
// with their own trigger button + content wrapper (see PickupHistorySection).
export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
export const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
