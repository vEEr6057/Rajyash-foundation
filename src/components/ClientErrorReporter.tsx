"use client";

import { useEffect } from "react";

/**
 * Browser-error reporter (production-discipline §3, Sentry-fallback). Registers
 * window error + unhandledrejection handlers and posts each to /api/client-error so
 * volunteers' phone-browser failures land in Workers Logs. Renders nothing.
 *
 * Caps: max 5 reports per page load and a per-message dedupe — an error loop must
 * not become a self-inflicted request flood.
 */
const MAX_REPORTS = 5;

export function ClientErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();

    const report = (message: string, stack?: string, source?: string) => {
      if (sent >= MAX_REPORTS || seen.has(message)) return;
      seen.add(message);
      sent++;
      const body = JSON.stringify({
        message,
        stack,
        source,
        url: window.location.href,
      });
      // keepalive so reports survive navigations; failures are deliberately ignored —
      // error reporting must never itself become an error source.
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => {
      report(e.message ?? "unknown error", e.error?.stack, "window.onerror");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(
        r instanceof Error ? r.message : String(r),
        r instanceof Error ? r.stack : undefined,
        "unhandledrejection",
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
