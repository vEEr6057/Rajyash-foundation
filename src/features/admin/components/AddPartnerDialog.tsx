"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PartnerForm } from "./PartnerForm";

export function AddPartnerDialog() {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> {t("partners.newButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("partners.addPartner")}</DialogTitle>
        </DialogHeader>
        <PartnerForm mode="create" onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
