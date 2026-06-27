// Minimal push-only service worker (Phase 4). Full PWA SW is Phase 7.
// Served from the site root (public/sw.js -> /sw.js) for app-wide scope (Pitfall P8).

// Activate a new SW immediately so a deploy doesn't strand users on the old one.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = {};
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "Food Rescue", {
      body: d.body || "",
      data: { url: d.url || "/portal/dashboard" },
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    "/portal/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        // Focus an existing tab on that url if open, else open a new one.
        for (const w of wins) {
          if (w.url.includes(url) && "focus" in w) return w.focus();
        }
        return clients.openWindow(url);
      }),
  );
});
