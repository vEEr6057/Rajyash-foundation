"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/config/constants";
import {
  setUserRole,
  deactivateUser,
  reactivateUser,
} from "@/features/admin";
import type { Profile } from "@/server/db/schema";

const SELECT =
  "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

export function UserRow({
  user,
  currentAdminId,
}: {
  user: Profile;
  currentAdminId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isSelf = user.id === currentAdminId;
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {user.name}
          {isSelf && (
            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {user.email ?? "—"} · {user.role} ·{" "}
          {deactivated ? "Deactivated" : "Active"}
        </span>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>

      {isSelf ? (
        <span className="text-xs text-muted-foreground">Your account</span>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <select
              className={SELECT}
              defaultValue={user.role}
              disabled={pending}
              aria-label={`Role for ${user.name}`}
              onChange={(e) => run(() => setUserRole(user.id, e.target.value as Role))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">
              applies on next sign-in
            </span>
          </div>
          {deactivated ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => reactivateUser(user.id))}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => deactivateUser(user.id))}
            >
              Deactivate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
