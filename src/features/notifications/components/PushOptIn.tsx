"use client";
import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "../hooks/usePushSubscription";

export function PushOptIn() {
  const t = useTranslations("portal");
  const { state, busy, enable, disable } = usePushSubscription();

  if (state === "unsupported") return null; // quietly skip on unsupported browsers

  if (state === "granted") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-leaf/30 bg-leaf/10 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-leaf">
          <Bell className="size-4" /> {t("notifications.push.on")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void disable()}
        >
          <BellOff className="size-4" /> {t("notifications.push.turnOff")}
        </Button>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {t("notifications.push.blocked")}
      </p>
    );
  }

  // "default" — not yet asked
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {t("notifications.push.prompt")}
      </span>
      <Button size="sm" disabled={busy} onClick={() => void enable()}>
        <Bell className="size-4" /> {t("notifications.push.enable")}
      </Button>
    </div>
  );
}
