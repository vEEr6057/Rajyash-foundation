"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/config/constants";
import type { Notification } from "@/server/db/schema";

export function NotificationFeed({
  items,
  onItemClick,
}: {
  items: Notification[];
  onItemClick: (n: Notification) => void;
}) {
  const t = useTranslations("portal");
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t("notifications.empty")}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => {
        const unread = !n.readAt;
        // <span> (not <div>) so it's valid inside both <a> and <button>.
        const body = (
          <span
            className={`flex flex-col gap-0.5 px-4 py-3 ${unread ? "bg-primary/5" : ""}`}
          >
            <span className="text-sm font-medium">{n.title}</span>
            <span className="text-xs text-muted-foreground">{n.body}</span>
          </span>
        );
        return (
          <li key={n.id}>
            {n.pickupId ? (
              <Link
                href={ROUTES.pickup(n.pickupId)}
                className="block"
                onClick={() => onItemClick(n)}
              >
                {body}
              </Link>
            ) : (
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => onItemClick(n)}
              >
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
