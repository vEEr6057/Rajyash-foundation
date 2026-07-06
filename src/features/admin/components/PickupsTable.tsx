"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { PickupStatusPill } from "@/features/pickups";
import { formatQuantity } from "@/features/pickups";
import { assignPickup, assignPickupsBulk } from "../actions/adminActions";
import { ROUTES } from "@/config/constants";
import type { Pickup } from "@/server/db/schema";

type Driver = { id: string; name: string };
type SortKey = "status" | "category" | "quantity" | "createdAt";

// UX-12: same statuses the existing per-row Assign already allows.
const ASSIGNABLE_STATUS: Pickup["status"] = "requested";

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

  // UX-12: bulk selection — only assignable (requested) rows can ever be selected.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const assignableIds = pickups
    .filter((p) => p.status === ASSIGNABLE_STATUS)
    .map((p) => p.id);
  const allSelected = assignableIds.length > 0 && assignableIds.every((id) => selected.has(id));
  const someSelected = assignableIds.some((id) => selected.has(id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  // Drop any selected id that's no longer on the page (e.g. after a refresh) so
  // the selection count never quietly outlives its rows.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => assignableIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickups]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(assignableIds));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span>{t("pickups.bulkAssign.selected", { count: selected.size })}</span>
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            <UserPlus /> {t("pickups.bulkAssign.button")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {tCommon("buttons.cancel")}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                checked={allSelected}
                onChange={toggleAll}
                disabled={assignableIds.length === 0}
                aria-label={t("pickups.bulkAssign.selectAll")}
              />
            </TableHead>
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
                {p.status === ASSIGNABLE_STATUS && (
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input accent-primary"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={t("pickups.bulkAssign.selectRow")}
                  />
                )}
              </TableCell>
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
                    {/* UX-14: admin's own detail page (History with actor + time),
                        not the shared donor/driver/volunteer portal view. */}
                    <DropdownMenuItem onClick={() => router.push(ROUTES.adminPickup(p.id))}>
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

      <BulkAssignDialog
        open={bulkOpen}
        pickupIds={[...selected]}
        drivers={drivers}
        onClose={() => setBulkOpen(false)}
        onDone={(result) => {
          setBulkOpen(false);
          if (result.failed.length === 0) {
            toast.success(
              t("pickups.bulkAssign.allAssigned", { count: result.assigned.length }),
            );
            setSelected(new Set());
          } else {
            toast(
              t("pickups.bulkAssign.partialResult", {
                assigned: result.assigned.length,
                failed: result.failed.length,
              }),
            );
            // Failed rows (already claimed/assigned elsewhere) stay selected so the
            // admin can see exactly what didn't go through; assigned ones clear.
            setSelected(new Set(result.failed.map((f) => f.id)));
          }
          router.refresh();
        }}
      />
    </>
  );
}

/** Shared driver picker — used by both the single AssignDialog and BulkAssignDialog. */
function DriverSelect({
  drivers,
  value,
  onChange,
}: {
  drivers: Driver[];
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("admin");
  if (drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("pickups.assign.noDrivers")}</p>
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
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

        <DriverSelect drivers={drivers} value={driverId} onChange={setDriverId} />

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

/**
 * UX-12: bulk assign — ONE dialog for the whole selection. On submit it calls
 * assignPickupsBulk, which runs each pickup through the same atomic per-row
 * path as the single-row assign; per-id success/failure comes back in one
 * result so the caller (PickupsTable) can toast a summary and keep only the
 * failed rows selected.
 */
function BulkAssignDialog({
  open,
  pickupIds,
  drivers,
  onClose,
  onDone,
}: {
  open: boolean;
  pickupIds: string[];
  drivers: Driver[];
  onClose: () => void;
  onDone: (result: {
    assigned: string[];
    failed: { id: string; reason: string }[];
  }) => void;
}) {
  const t = useTranslations("admin");
  const [driverId, setDriverId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
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
          <DialogTitle>
            {t("pickups.bulkAssign.title", { count: pickupIds.length })}
          </DialogTitle>
          <DialogDescription>{t("pickups.assign.label")}</DialogDescription>
        </DialogHeader>

        <DriverSelect drivers={drivers} value={driverId} onChange={setDriverId} />

        {err && <p className="text-sm text-destructive">{err}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("pickups.filters.clearButton")}</Button>
          </DialogClose>
          <Button
            disabled={!driverId || pending || pickupIds.length === 0}
            onClick={() => {
              setErr(null);
              start(async () => {
                const res = await assignPickupsBulk(pickupIds, driverId);
                if (!res.ok) {
                  setErr(res.message ?? t("pickups.assign.errorMessage"));
                  toast.error(res.message ?? t("pickups.assign.errorMessage"));
                } else {
                  onDone({ assigned: res.assigned, failed: res.failed });
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
