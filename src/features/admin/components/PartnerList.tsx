"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type PartnerType } from "@/config/constants";
import { deletePartner } from "@/features/admin";
import type { Partner } from "@/server/db/schema";
import { PartnerForm } from "./PartnerForm";

function Row({ p, onEdit }: { p: Partner; onEdit: (p: Partner) => void }) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{p.name}</TableCell>
      <TableCell>
        <Badge variant="outline">{tCommon(`partnerType.${p.type as PartnerType}`)}</Badge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {p.contactName || p.contactEmail || p.contactPhone || "—"}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{p.city}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tCommon("buttons.edit")}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(p)}>
              <Pencil /> {tCommon("buttons.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deletePartner(p.id);
                  if (res.ok) router.refresh();
                })
              }
            >
              <Trash2 /> {tCommon("buttons.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function PartnerList({ partners }: { partners: Partner[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [editing, setEditing] = useState<Partner | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("partners.table.name")}</TableHead>
            <TableHead>{t("partners.table.type")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("partners.table.contact")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("partners.form.city")}</TableHead>
            <TableHead className="w-12 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.length === 0 ? (
            <TableEmpty colSpan={5}>{t("partners.noPartners")}</TableEmpty>
          ) : (
            partners.map((p) => <Row key={p.id} p={p} onEdit={setEditing} />)
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("partners.addPartner")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <PartnerForm
              mode="edit"
              partnerId={editing.id}
              defaults={{
                name: editing.name,
                type: editing.type as PartnerType,
                contactName: editing.contactName ?? "",
                contactPhone: editing.contactPhone ?? "",
                contactEmail: editing.contactEmail ?? "",
                address: editing.address ?? "",
                city: editing.city,
              }}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
