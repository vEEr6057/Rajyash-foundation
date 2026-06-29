"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BuildRunForm } from "./BuildRunForm";
import type { Profile } from "@/server/db/schema";

/** New-run as a side sheet (longer form) — replaces navigating to /admin/runs/new.
 * BuildRunForm navigates to the new run's detail on success, which closes the sheet. */
export function NewRunSheet({ drivers }: { drivers: Profile[] }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="leaf" size="sm">
          <Plus className="size-4" /> {t("runs.newButton")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("runs.form.title")}</SheetTitle>
        </SheetHeader>
        <BuildRunForm drivers={drivers} />
      </SheetContent>
    </Sheet>
  );
}
