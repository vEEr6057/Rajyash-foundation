"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteDestination } from "../actions/destinationActions";
import type { Destination } from "@/server/db/schema";
import { DestinationForm } from "./DestinationForm";

function Row({ d, onEdit }: { d: Destination; onEdit: (d: Destination) => void }) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{d.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {d.area ? `${d.area}, ` : ""}
        {d.city}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
        {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
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
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteDestination(d.id);
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

export function DestinationList({ destinations }: { destinations: Destination[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [editing, setEditing] = useState<Destination | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("destinations.form.name")}</TableHead>
            <TableHead>{t("destinations.form.area")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("destinations.form.lat")}</TableHead>
            <TableHead className="w-12 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinations.length === 0 ? (
            <TableEmpty colSpan={4}>{t("destinations.noDestinations")}</TableEmpty>
          ) : (
            destinations.map((d) => <Row key={d.id} d={d} onEdit={setEditing} />)
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("destinations.addDestination")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <DestinationForm
              mode="edit"
              destinationId={editing.id}
              defaults={{
                name: editing.name,
                area: editing.area ?? "",
                lat: editing.lat,
                lng: editing.lng,
                city: editing.city,
                active: editing.active,
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
