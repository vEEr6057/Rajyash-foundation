"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  TableEmpty,
} from "@/components/ui/table";
import { ROLES, type Role } from "@/config/constants";
import { setUserRole, deactivateUser, reactivateUser } from "@/features/admin";
import type { Profile } from "@/server/db/schema";

const SELECT = "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

function Row({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deactivated = !!user.deactivatedAt;

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message ?? tCommon("toast.error"));
      else {
        toast.success(okMsg);
        router.refresh();
      }
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.name}
        {isSelf && <span className="ml-1 text-xs text-muted-foreground">{t("users.you")}</span>}
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {user.email ?? "—"}
      </TableCell>
      <TableCell>
        {isSelf ? (
          <Badge variant="primary">{tCommon(`role.${user.role}`)}</Badge>
        ) : (
          <select
            className={SELECT}
            defaultValue={user.role}
            disabled={pending}
            aria-label={`Role for ${user.name}`}
            onChange={(e) => run(() => setUserRole(user.id, e.target.value as Role), tCommon("toast.updated"))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tCommon(`role.${r}`)}
              </option>
            ))}
          </select>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={deactivated ? "destructive" : "success"}>
          {deactivated ? t("users.statusDeactivated") : t("users.statusActive")}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">{t("users.yourAccount")}</span>
        ) : deactivated ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reactivateUser(user.id), tCommon("toast.done"))}>
            {t("users.actions.reactivate")}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
            {t("users.actions.deactivate")}
          </Button>
        )}
      </TableCell>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tCommon("confirm.deactivateTitle", { name: user.name })}
        description={tCommon("confirm.deactivateBody")}
        confirmLabel={tCommon("confirm.deactivateConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={() => {
          run(() => deactivateUser(user.id), tCommon("toast.done"));
          setConfirmOpen(false);
        }}
      />
    </TableRow>
  );
}

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: Profile[];
  currentAdminId: string;
}) {
  const t = useTranslations("admin");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("users.table.name")}</TableHead>
          <TableHead className="hidden sm:table-cell">{t("users.table.email")}</TableHead>
          <TableHead>{t("users.table.role")}</TableHead>
          <TableHead>{t("users.table.status")}</TableHead>
          <TableHead className="text-right">{t("users.table.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableEmpty colSpan={5}>{t("users.noUsers")}</TableEmpty>
        ) : (
          users.map((u) => <Row key={u.id} user={u} isSelf={u.id === currentAdminId} />)
        )}
      </TableBody>
    </Table>
  );
}
