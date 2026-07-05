"use client";

import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * UX-17: dismissible PWA install nudge for signed-in portal/admin shells (never
 * public pages — mount it only in an authed layout). Renders nothing until the
 * hook decides it's eligible (2nd+ visit, not dismissed, not already installed)
 * AND there's something to actually do (captured `beforeinstallprompt` on
 * Chrome/Android, or the iOS Safari "Add to Home Screen" hint).
 */
export function InstallNudgeBanner() {
  const t = useTranslations("common");
  const { canShow, isIos, promptToInstall, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2.5 text-sm">
      <Download className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t("pwa.installTitle")}</p>
        {isIos && (
          <p className="text-xs text-muted-foreground">{t("pwa.iosHint")}</p>
        )}
      </div>
      {!isIos && (
        <Button size="sm" onClick={promptToInstall}>
          {t("pwa.installButton")}
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("pwa.dismissAriaLabel")}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
