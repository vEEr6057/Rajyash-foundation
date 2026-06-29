"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { MoreHorizontal, Eye, UserPlus } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PickupStatusPill } from "@/features/pickups/components/PickupStatusPill";
import { formatQuantity } from "@/features/pickups/lib/format";
import { assignPickup } from "@/features/admin";
import { ROUTES } from "@/config/constants";
import type { Pickup } from "@/server/db/schema";

type Volunteer = { id: string; name: string };

export function PickupsTable({
  pickups,
  volunteers,
}: {
  pickups: Pickup[];
  volunteers: Volunteer[];
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [assignFor, setAssignFor] = useState<Pickup | null>(null);

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("pickups.table.status")}</TableHead>
            <TableHead>{t("pickups.table.category")}</TableHead>
            <TableHead>{t("pickups.table.quantity")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("pickups.table.location")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("pickups.table.volunteer")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("pickups.table.createdAt")}</TableHead>
            <TableHead className="w-12 text-right">{t("pickups.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pickups.length === 0 ? (
            <TableEmpty colSpan={7}>{t("pickups.noMatch")}</TableEmpty>
          ) : (
            pickups.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <PickupStatusPill status={p.status} />
                </TableCell>
                <TableCell className="font-medium">
                  {tCommon(`foodCategory.${p.category}`)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatQuantity(p.quantity, p.quantityUnit)}
                </TableCell>
                <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground md:table-cell">
                  {p.address}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {p.volunteerId
                    ? t("pickups.table.assigned")
                    : t("pickups.table.unassigned")}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                  {fmtDate(p.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={t("pickups.table.actions")}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(ROUTES.pickup(p.id))}>
                        <Eye /> {tCommon("buttons.view")}
                      </DropdownMenuItem>
                      {p.status === "requested" && (
                        <DropdownMenuItem onClick={() => setAssignFor(p)}>
                          <UserPlus /> {t("pickups.assign.button")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AssignDialog
        pickup={assignFor}
        volunteers={volunteers}
        onClose={() => setAssignFor(null)}
        onAssigned={() => {
          setAssignFor(null);
          router.refresh();
        }}
      />
    </>
  );
}

function AssignDialog({
  pickup,
  volunteers,
  onClose,
  onAssigned,
}: {
  pickup: Pickup | null;
  volunteers: Volunteer[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const t = useTranslations("admin");
  const [vol, setVol] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={!!pickup}
      onOpenChange={(o) => {
        if (!o) {
          setVol("");
          setErr(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pickups.assign.button")}</DialogTitle>
          <DialogDescription>{t("pickups.assign.label")}</DialogDescription>
        </DialogHeader>

        {volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pickups.assign.noVolunteers")}
          </p>
        ) : (
          <Select value={vol} onValueChange={setVol}>
            <SelectTrigger>
              <SelectValue placeholder={t("pickups.assign.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {volunteers.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {err && <p className="text-sm text-destructive">{err}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("pickups.filters.clearButton")}</Button>
          </DialogClose>
          <Button
            disabled={!vol || pending || !pickup}
            onClick={() => {
              if (!pickup) return;
              setErr(null);
              start(async () => {
                const res = await assignPickup(pickup.id, vol);
                if (!res.ok) setErr(res.message ?? t("pickups.assign.errorMessage"));
                else onAssigned();
              });
            }}
          >
            {pending ? "…" : t("pickups.assign.submitButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
