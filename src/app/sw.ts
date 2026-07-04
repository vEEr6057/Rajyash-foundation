// app/sw.ts — Serwist service worker source
// Compiled to public/sw.js at build time by @serwist/next (withSerwist plugin).
// public/sw.js is gitignored and regenerated on every build — do not edit it directly.
//
// SECURITY (T-7-04-02): authed/dynamic routes excluded from precache via the `exclude`
// patterns in next.config.ts withSerwistInit (portal, admin, api, __clerk).
// Only the public shell and static assets are ever cached.
//
// ORDERING (RESEARCH Pattern 3, Assumption A2): push + notificationclick handlers MUST be
// registered BEFORE serwist.addEventListeners() so that Serwist's own install/activate
// listeners do not pre-empt push event delivery.
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// ── Phase 4 push handlers (VERBATIM from docs/design/imported/phase4-push-sw.reference.js) ──
// Merged here so the Serwist precache SW retains push notification support.
// Behavior is identical to the original public/sw.js (Phase 4 push-only SW).

self.addEventListener("push", (event) => {
  let d: { title?: string; body?: string; url?: string } = {};
  try {
    d = event.data ? (event.data.json() as typeof d) : {};
  } catch {
    d = {};
  }
  event.waitUntil(
    self.registration.showNotification(d.title ?? "Food Porter", {
      body: d.body ?? "",
      data: { url: d.url ?? "/portal/dashboard" },
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string =
    (event.notification.data &&
      (event.notification.data as { url?: string }).url) ||
    "/portal/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins: readonly WindowClient[]) => {
        // Focus an existing tab on that URL if open, else open a new one.
        for (const w of wins) {
          if (w.url.includes(url) && "focus" in w) return w.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});

// ── Serwist precache + runtime caching ────────────────────────────────────────
// push/notificationclick handlers above are registered before this — safe event ordering.
// skipWaiting + clientsClaim: new SW takes control immediately on deploy (same behaviour
// as the Phase 4 install/activate handlers it replaces).
// authed routes are excluded from __SW_MANIFEST via `exclude` in next.config.ts.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
