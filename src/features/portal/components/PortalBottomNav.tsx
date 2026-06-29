"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Plus, PackageOpen, LayoutList } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";

type Item = { href: string; labelKey: string; icon: typeof Home };

const ITEMS: Record<"donor" | "volunteer", Item[]> = {
  donor: [
    { href: ROUTES.portalDashboard, labelKey: "home", icon: Home },
    { href: ROUTES.newPickup, labelKey: "post", icon: Plus },
    { href: ROUTES.donorPickups, labelKey: "pickups", icon: PackageOpen },
  ],
  volunteer: [
    { href: ROUTES.portalDashboard, labelKey: "home", icon: Home },
    { href: ROUTES.volunteerBoard, labelKey: "board", icon: LayoutList },
  ],
};

/**
 * Mobile bottom navigation for portal roles (donor/volunteer) — thumb-zone,
 * one-tap, always visible. Hidden on lg+ (desktop uses the header). Driver has a
 * single screen, so no bottom nav. Honors the bottom safe-area inset.
 */
export function PortalBottomNav({ role }: { role: "donor" | "volunteer" | "driver" | "admin" }) {
  const t = useTranslations("portal");
  const pathname = usePathname();
  const path = pathname.replace(/^\/(en|gu|hi)(?=\/|$)/, "") || "/";

  if (role !== "donor" && role !== "volunteer") return null;
  const items = ITEMS[role];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, labelKey, icon: Icon }) => {
          const active = href === ROUTES.portalDashboard ? path === href : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {t(`nav.${labelKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
