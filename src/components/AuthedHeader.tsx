// Shared authed chrome — slim header bar for /portal/* and /admin/* routes.
// Server component (like PublicHeader); LanguageSwitcher + ThemeToggle are the
// only client islands. Carries the LanguageSwitcher onto EVERY authed page so
// the locale can be switched from anywhere (I18N-02 / success criterion #4).
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/features/public/components/LanguageSwitcher";
import { ThemeToggle } from "@/features/public/components/ThemeToggle";

export async function AuthedHeader({ homeHref }: { homeHref: string }) {
  const t = await getTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
        <Link
          href={homeHref}
          className="flex flex-col leading-tight"
          aria-label={t("appName")}
        >
          <span className="font-display text-base font-bold text-primary">
            {t("appName")}
          </span>
          <span className="text-xs text-muted-foreground">{t("appTagline")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
