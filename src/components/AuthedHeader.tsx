// Shared authed chrome — slim header bar for /portal/* and /admin/* routes.
// Server component (like PublicHeader); LanguageSwitcher + ThemeToggle are the
// only client islands. Carries the LanguageSwitcher onto EVERY authed page so
// the locale can be switched from anywhere (I18N-02 / success criterion #4).
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/features/public/components/LanguageSwitcher";
import { ThemeToggle } from "@/features/public/components/ThemeToggle";

export async function AuthedHeader({ homeHref }: { homeHref: string }) {
  const t = await getTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href={homeHref} aria-label={t("appName")} className="flex items-center">
          <img
            src="/images/rajyash/logo.png"
            alt={t("appName")}
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserButton
            appearance={{ elements: { avatarBox: "size-8" } }}
            userProfileMode="modal"
          />
        </div>
      </div>
    </header>
  );
}
