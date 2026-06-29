"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { ROLES, type Role } from "@/config/constants";
import { setUserRole, deactivateUser, reactivateUser } from "@/features/admin";
import type { Profile } from "@/server/db/schema";

const SELECT = "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

function Row({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const deactivated = !!user.deactivatedAt;

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.message ?? "Failed");
      else router.refresh();
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
            onChange={(e) => run(() => setUserRole(user.id, e.target.value as Role))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tCommon(`role.${r}`)}
              </option>
            ))}
          </select>
        )}
        {err && <span className="block text-xs text-destructive">{err}</span>}
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
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reactivateUser(user.id))}>
            {t("users.actions.reactivate")}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deactivateUser(user.id))}>
            {t("users.actions.deactivate")}
          </Button>
        )}
      </TableCell>
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
