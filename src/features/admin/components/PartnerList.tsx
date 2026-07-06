"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FormSheet } from "@/components/forms";
import { type PartnerType } from "@/config/constants";
import { deletePartner } from "../actions/adminActions";
import type { Partner } from "@/server/db/schema";
import { PartnerForm } from "./PartnerForm";

function Row({ p, onEdit }: { p: Partner; onEdit: (p: Partner) => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doDelete = () =>
    start(async () => {
      const res = await deletePartner(p.id);
      if (res.ok) {
        toast.success(tCommon("toast.deleted"));
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? tCommon("toast.error"));
      }
    });

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
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <Trash2 /> {tCommon("buttons.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tCommon("confirm.deleteTitle", { item: t("partners.title").toLowerCase() })}
        description={tCommon("confirm.deleteBody")}
        confirmLabel={tCommon("confirm.deleteConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={doDelete}
      />
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
          {partners.map((p) => (
            <Row key={p.id} p={p} onEdit={setEditing} />
          ))}
        </TableBody>
      </Table>

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={t("partners.addPartner")}
      >
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
            onCancel={() => setEditing(null)}
          />
        )}
      </FormSheet>
    </>
  );
}
