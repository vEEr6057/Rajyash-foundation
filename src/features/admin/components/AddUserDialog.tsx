"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
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
import { ROLES, type Role } from "@/config/constants";
import { inviteUser } from "@/features/admin";

export function AddUserDialog() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function reset() {
    setEmail("");
    setRole("volunteer");
    setErr(null);
    setDone(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> {t("users.invite.button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.invite.title")}</DialogTitle>
          <DialogDescription>{t("users.invite.subtitle")}</DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="text-sm text-leaf-soft-foreground">
            {t("users.invite.sent", { email })}
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="invite-email">{t("users.invite.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">{t("users.invite.role")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tCommon(`role.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {role === "admin" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("users.invite.adminHint")}
                </p>
              )}
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
        )}

        <DialogFooter>
          {done ? (
            <DialogClose asChild>
              <Button>{tCommon("buttons.back")}</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="ghost">{tCommon("buttons.cancel")}</Button>
              </DialogClose>
              <Button
                disabled={!email || pending}
                onClick={() => {
                  setErr(null);
                  start(async () => {
                    const res = await inviteUser(email, role);
                    if (res.ok) setDone(true);
                    else setErr(res.message);
                  });
                }}
              >
                {pending ? tCommon("buttons.loading") : t("users.invite.send")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
