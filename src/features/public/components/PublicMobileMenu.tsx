"use client";

import { useState } from "react";
import Link from "next/link";
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

const NAV = [
  ["#how", "nav.how"],
  ["#impact", "nav.impact"],
  ["#about", "nav.about"],
  ["#contact", "nav.contact"],
] as const;

/** Mobile-only header menu — collapses nav + locale + theme + auth into a Sheet
 * so the public header never overflows on small screens. */
export function PublicMobileMenu() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("nav.how")} className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="text-primary">{t("brandName")}</SheetTitle>
        <nav className="flex flex-col gap-1">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
