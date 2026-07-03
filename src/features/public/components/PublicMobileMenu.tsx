"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/config/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

// Mirrors PublicHeader's desktop NAV — every anchor must exist on the homepage:
// #programs + #impact (LandingPage sections), #contact (PublicFooter). The old
// "#about" target had no matching section id and scrolled nowhere.
const NAV = [
  ["#programs", "nav.whatWeDo"],
  ["#impact", "nav.impact"],
  [ROUTES.becomeVolunteer, "nav.volunteer"],
  ["#contact", "nav.contact"],
] as const;

/** Mobile-only header menu — collapses nav + locale + theme + auth into a Sheet
 * so the public header never overflows on small screens. */
export function PublicMobileMenu({
  dashboardHref,
}: {
  dashboardHref?: string | null;
}) {
  const t = useTranslations("landing");
  const tNav = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("menuOpen")} className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="text-primary">{t("brandName")}</SheetTitle>
        <nav className="flex flex-col gap-1" aria-label={t("navAria")}>
          {NAV.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="mt-auto flex flex-col gap-2">
          {dashboardHref ? (
            <div className="flex items-center justify-between gap-2">
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className={buttonVariants({ className: "flex-1" })}
              >
                {tNav("nav.dashboard")}
              </Link>
              <UserButton
                appearance={{ elements: { avatarBox: "size-9" } }}
                userProfileMode="modal"
              />
            </div>
          ) : (
            <>
              <Link
                href={ROUTES.signIn}
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("signin")}
              </Link>
              <Link
                href={ROUTES.becomeVolunteer}
                onClick={() => setOpen(false)}
                className={buttonVariants({})}
              >
                {t("becomeVol")}
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
