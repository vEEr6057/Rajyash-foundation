import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { ROUTES, RUN_SLOT_LABELS } from "@/config/constants";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import type { Run } from "@/server/db/schema";
import { RunStatusPill } from "./RunStatusPill";

export async function RunsTable({
  runs,
  stopCounts,
  driverNameById,
}: {
  runs: Run[];
  stopCounts: number[];
  driverNameById: Record<string, string>;
}) {
  const t = await getTranslations("admin");
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("runs.form.date")}</TableHead>
          <TableHead>{t("runs.form.slot")}</TableHead>
          <TableHead className="hidden sm:table-cell">{t("runs.form.driver")}</TableHead>
          <TableHead>{t("runs.stopCount")}</TableHead>
          <TableHead>{t("pickups.table.status")}</TableHead>
          <TableHead className="w-12 text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.length === 0 ? (
          <TableEmpty colSpan={6}>{t("runs.emptyState")}</TableEmpty>
        ) : (
          runs.map((run, i) => (
            <TableRow key={run.id}>
              <TableCell className="whitespace-nowrap font-medium">{fmt(run.runDate)}</TableCell>
              <TableCell>{RUN_SLOT_LABELS[run.slot]}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {run.driverId ? (
                  driverNameById[run.driverId] ?? "—"
                ) : (
                  <span className="text-warning">{t("runs.noDriver")}</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {stopCounts[i] ?? 0}
              </TableCell>
              <TableCell>
                <RunStatusPill status={run.status} />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={ROUTES.adminRun(run.id)}
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                  aria-label="Open run"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
