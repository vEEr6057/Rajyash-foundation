"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationFeed } from "./NotificationFeed";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("portal");
  const { items, unreadCount, markAll, markOne } = useNotifications();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${t("notifications.title")}${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-semibold">{t("notifications.title")}</span>
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={unreadCount === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              {t("notifications.markAllRead")}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <NotificationFeed
              items={items}
              onItemClick={(n) => {
                if (!n.readAt) markOne.mutate(n.id);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
