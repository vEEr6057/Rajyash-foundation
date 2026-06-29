"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminSurplusForm } from "./AdminSurplusForm";
import type { Partner } from "@/server/db/schema";

/** Log-surplus-on-behalf as a side sheet (INT-02). AdminSurplusForm navigates to
 * /admin/pickups on success, which closes the sheet. */
export function LogSurplusSheet({
  partners,
}: {
  partners: Pick<Partner, "id" | "name" | "type" | "address">[];
}) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusSquare className="size-4" /> {t("surplus.submitLabel")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("surplus.title")}</SheetTitle>
          <SheetDescription>{t("surplus.subtitle")}</SheetDescription>
        </SheetHeader>
        <AdminSurplusForm partners={partners} />
      </SheetContent>
    </Sheet>
  );
}
