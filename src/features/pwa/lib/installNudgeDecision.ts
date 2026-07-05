/**
 * UX-17: pure visibility decision for the PWA install nudge, kept free of browser
 * APIs (localStorage/matchMedia/beforeinstallprompt live in useInstallPrompt) so it
 * can be unit-tested without mocking real browser events.
 */

// Show only from the 2nd signed-in visit onward — never on a brand-new session.
export const INSTALL_NUDGE_MIN_VISITS = 2;

// localStorage keys (shared with useInstallPrompt).
export const INSTALL_NUDGE_VISIT_COUNT_KEY = "fp:pwa:visitCount";
export const INSTALL_NUDGE_DISMISSED_KEY = "fp:pwa:installDismissed";
// sessionStorage key — guards against counting the same tab session twice
// (client-side navigation between portal/admin pages re-mounts the layout's
// hook without that being a new "visit").
export const INSTALL_NUDGE_SESSION_COUNTED_KEY = "fp:pwa:visitCountedThisSession";

export interface InstallNudgeVisibilityInput {
  /** Number of distinct signed-in visits recorded so far (including this one). */
  visitCount: number;
  /** Whether the user has ever dismissed the nudge (localStorage flag). */
  dismissed: boolean;
  /** Whether the app is already running installed (standalone display mode). */
  isStandalone: boolean;
}

/**
 * Whether the install nudge is eligible to show. Does NOT decide the Android-vs-iOS
 * variant (that depends on `beforeinstallprompt` capture / user agent — see
 * useInstallPrompt) — this only covers visit count, dismissal, and standalone.
 */
export function shouldShowInstallNudge({
  visitCount,
  dismissed,
  isStandalone,
}: InstallNudgeVisibilityInput): boolean {
  if (isStandalone) return false;
  if (dismissed) return false;
  return visitCount >= INSTALL_NUDGE_MIN_VISITS;
}
