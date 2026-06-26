// src/features/public/components/PublicFooter.tsx
// Server component — public landing footer with tagline, nav links, contact, language switcher.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/config/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function PublicFooter() {
  const t = await getTranslations("landing");
  const commonT = await getTranslations("common");

  return (
    <footer
      id="contact"
      className="border-t border-border bg-card py-12 px-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* Tagline + language */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="font-display text-lg font-bold text-primary">
              {t("brandName")}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("footTagline")}
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            {/* Explore links */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("footExplore")}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <Link href="#how" className="hover:text-foreground transition-colors">
                    {t("nav.how")}
                  </Link>
                </li>
                <li>
                  <Link href="#impact" className="hover:text-foreground transition-colors">
                    {t("nav.impact")}
                  </Link>
                </li>
                <li>
                  <Link href="#about" className="hover:text-foreground transition-colors">
                    {t("nav.about")}
                  </Link>
                </li>
                <li>
                  <Link href={ROUTES.signIn} className="hover:text-foreground transition-colors">
                    {t("signin")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("footContact")}
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <a
                    href={`mailto:${commonT("footer.email")}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {commonT("footer.email")}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${commonT("footer.phone")}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {commonT("footer.phone")}
                  </a>
                </li>
                <li>{t("footAddr")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("footRights")}</p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">{t("footMade")}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
