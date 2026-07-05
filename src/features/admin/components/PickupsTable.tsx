"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Eye, UserPlus, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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

type Driver = { id: string; name: string };
type SortKey = "status" | "category" | "quantity" | "createdAt";

export function PickupsTable({
  pickups,
  drivers,
  sort,
  dir,
}: {
  pickups: Pickup[];
  // dispatch-model-v2: the collector role is the driver — pickup.volunteerId
  // holds the assigned driver's id (column name kept to avoid a migration).
  drivers: Driver[];
  sort: SortKey;
  dir: "asc" | "desc";
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assignFor, setAssignFor] = useState<Pickup | null>(null);

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(d);

  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name;

  // Sortable column header — toggles asc/desc via URL, resets to page 1, sets aria-sort.
  function SortHead({
    col,
    label,
    className,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) {
    const active = sort === col;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const q = new URLSearchParams(searchParams);
    q.set("sort", col);
    q.set("dir", active ? nextDir : "asc");
    q.set("page", "1");
    const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
    return (
      <TableHead
        className={className}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <Link
          href={`${pathname}?${q.toString()}`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label}
          <Icon className={active ? "size-3.5" : "size-3.5 opacity-40"} />
        </Link>
      </TableHead>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead col="status" label={t("pickups.table.status")} />
            <SortHead col="category" label={t("pickups.table.category")} />
            <SortHead col="quantity" label={t("pickups.table.quantity")} className="text-right" />
            <TableHead className="hidden md:table-cell">{t("pickups.table.location")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("pickups.table.driver")}</TableHead>
            <SortHead col="createdAt" label={t("pickups.table.createdAt")} className="hidden lg:table-cell" />
            <TableHead className="w-12 text-right">{t("pickups.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pickups.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <PickupStatusPill status={p.status} />
              </TableCell>
              <TableCell className="font-medium">
                {tCommon(`foodCategory.${p.category}`)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                {formatQuantity(p.quantity, p.quantityUnit, tCommon)}
              </TableCell>
              <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground md:table-cell">
                {p.address}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {p.volunteerId ? (
                  driverName(p.volunteerId) ?? t("pickups.table.assigned")
                ) : (
                  <span className="text-muted-foreground">
                    {t("pickups.table.unassigned")}
                  </span>
                )}
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
          ))}
        </TableBody>
      </Table>

      <AssignDialog
        pickup={assignFor}
        drivers={drivers}
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
  drivers,
  onClose,
  onAssigned,
}: {
  pickup: Pickup | null;
  drivers: Driver[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const t = useTranslations("admin");
  const [driverId, setDriverId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={!!pickup}
      onOpenChange={(o) => {
        if (!o) {
          setDriverId("");
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

        {drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pickups.assign.noDrivers")}
          </p>
        ) : (
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger>
              <SelectValue placeholder={t("pickups.assign.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
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
            disabled={!driverId || pending || !pickup}
            onClick={() => {
              if (!pickup) return;
              setErr(null);
              start(async () => {
                const res = await assignPickup(pickup.id, driverId);
                if (!res.ok) {
                  setErr(res.message ?? t("pickups.assign.errorMessage"));
                  toast.error(res.message ?? t("pickups.assign.errorMessage"));
                } else {
                  toast.success(t("pickups.assign.successMessage"));
                  onAssigned();
                }
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
