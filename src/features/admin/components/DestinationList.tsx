"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, MapPin } from "lucide-react";
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
import { deleteDestination } from "../actions/destinationActions";
import type { Destination } from "@/server/db/schema";
import { DestinationForm } from "./DestinationForm";

function Row({ d, onEdit }: { d: Destination; onEdit: (d: Destination) => void }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doDelete = () =>
    start(async () => {
      const res = await deleteDestination(d.id);
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
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          {d.name}
          {/* UX-15: the delete-conflict guidance ("mark it inactive instead") only
              helps if the list actually shows which destinations are already inactive. */}
          {!d.active && <Badge variant="outline">{t("destinations.inactiveBadge")}</Badge>}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {d.area ? `${d.area}, ` : ""}
        {d.city}
      </TableCell>
      <TableCell className="hidden max-w-[22rem] text-muted-foreground sm:table-cell">
        <span className="block truncate">{d.address ?? "—"}</span>
        <a
          href={
            d.mapsLink ||
            `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          <MapPin className="size-3" /> {t("destinations.openInMaps")}
        </a>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tCommon("buttons.edit")}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(d)}>
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
        title={tCommon("confirm.deleteTitle", { item: t("destinations.title").toLowerCase() })}
        description={tCommon("confirm.deleteBody")}
        confirmLabel={tCommon("confirm.deleteConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={doDelete}
      />
    </TableRow>
  );
}

export function DestinationList({ destinations }: { destinations: Destination[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [editing, setEditing] = useState<Destination | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("destinations.table.name")}</TableHead>
            <TableHead>{t("destinations.table.area")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("destinations.table.address")}</TableHead>
            <TableHead className="w-12 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinations.map((d) => (
            <Row key={d.id} d={d} onEdit={setEditing} />
          ))}
        </TableBody>
      </Table>

      <FormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={t("destinations.addDestination")}
        className="sm:max-w-xl"
      >
        {editing && (
          <DestinationForm
            mode="edit"
            destinationId={editing.id}
            defaults={{
              name: editing.name,
              area: editing.area ?? "",
              address: editing.address ?? "",
              mapsLink: editing.mapsLink ?? "",
              lat: editing.lat,
              lng: editing.lng,
              city: editing.city,
              active: editing.active,
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
