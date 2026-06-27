// src/features/public/components/ThemeToggle.tsx
// Client component — in-page header light/dark toggle (design has light+dark).
// Uses next-themes (class strategy) so it flips <html class="dark">; our globals.css
// defines .dark tokens. Mount-guarded to avoid hydration mismatch (server has no theme).
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("landing");
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the theme after mount — render a stable placeholder
  // until then so SSR and first client render match (no hydration warning).
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const base =
    "inline-flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground transition-colors hover:bg-surface-2";

  if (!mounted) {
    // Placeholder with identical box so layout doesn't shift; aria-hidden until live.
    return (
      <span
        className={cn(base, className)}
        aria-hidden="true"
        suppressHydrationWarning
      >
        <Sun className="size-[18px]" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("themeLight") : t("themeDark")}
      aria-pressed={isDark}
      title={isDark ? t("themeLight") : t("themeDark")}
      className={cn(base, "cursor-pointer", className)}
    >
      {isDark ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </button>
  );
}
