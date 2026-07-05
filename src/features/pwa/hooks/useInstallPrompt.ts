"use client";

import { useCallback, useEffect, useState } from "react";
import {
  shouldShowInstallNudge,
  INSTALL_NUDGE_DISMISSED_KEY,
  INSTALL_NUDGE_SESSION_COUNTED_KEY,
  INSTALL_NUDGE_VISIT_COUNT_KEY,
} from "../lib/installNudgeDecision";

// Not yet in the DOM lib's Event union — Chrome/Edge/Samsung Internet only.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  const standaloneNav = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return window.matchMedia("(display-mode: standalone)").matches || standaloneNav === true;
}

// beforeinstallprompt never fires on iOS Safari — that's the only signal we have
// for "show the Share → Add to Home Screen hint instead of a native Install button".
function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

/**
 * UX-17: captures `beforeinstallprompt`, tracks signed-in visit count + dismissal in
 * storage, and reports whether/how the install nudge banner should render. SSR-safe —
 * all browser API reads happen after mount.
 */
export function useInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosSafari());
    setDismissed(window.localStorage.getItem(INSTALL_NUDGE_DISMISSED_KEY) === "1");

    // Count this as a visit at most once per tab session (sessionStorage guard) —
    // otherwise client-side navigation within the portal/admin shell would inflate
    // the count on every route change instead of once per real visit.
    const alreadyCountedThisSession =
      window.sessionStorage.getItem(INSTALL_NUDGE_SESSION_COUNTED_KEY) === "1";
    const storedCount = Number(
      window.localStorage.getItem(INSTALL_NUDGE_VISIT_COUNT_KEY) ?? "0",
    );
    const nextCount = alreadyCountedThisSession ? storedCount : storedCount + 1;
    if (!alreadyCountedThisSession) {
      window.localStorage.setItem(INSTALL_NUDGE_VISIT_COUNT_KEY, String(nextCount));
      window.sessionStorage.setItem(INSTALL_NUDGE_SESSION_COUNTED_KEY, "1");
    }
    setVisitCount(nextCount);
    setMounted(true);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const promptToInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(INSTALL_NUDGE_DISMISSED_KEY, "1");
    setDismissed(true);
  }, []);

  const eligible =
    mounted && shouldShowInstallNudge({ visitCount, dismissed, isStandalone });
  // Only worth showing if we can actually do something: fire the native prompt
  // (Chrome/Android, once captured) or point iOS Safari at the Share sheet.
  const canShow = eligible && (isIos || deferredPrompt !== null);

  return { canShow, isIos, promptToInstall, dismiss };
}
