"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { setLocaleCookieAction } from "../actions/setLocale";
import type { Locale } from "@/i18n/request";

// Script-appropriate labels for each locale pill.
const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  gu: "ગુ", // Gujarati script label
  hi: "हि", // Devanagari script label
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  // RESEARCH §Pitfall 3: useLocale() reads the server-set cookie value;
  // never use navigator.language (causes hydration mismatch).
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(next: Locale) {
    if (next === locale) return; // already selected — no-op
    startTransition(async () => {
      await setLocaleCookieAction(next);
      // Re-runs Server Components with new NEXT_LOCALE cookie
      // (RESEARCH §Pattern 2 — revalidatePath + router.refresh() combination).
      router.refresh();
    });
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("nav.language")}
    >
      {(["en", "gu", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleLocaleChange(l)}
          disabled={isPending}
          aria-pressed={locale === l}
          // ≥44px tap target (a11y): the button box is the hit area; the visible pill
          // (inner span) keeps its compact size so the header doesn't bloat.
          className={cn(
            "group inline-flex min-h-11 min-w-11 items-center justify-center rounded",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span
            className={cn(
              "rounded px-2 py-0.5 text-sm font-medium transition-colors",
              locale === l
                ? "bg-primary text-white"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {LOCALE_LABELS[l]}
          </span>
        </button>
      ))}
    </div>
  );
}
