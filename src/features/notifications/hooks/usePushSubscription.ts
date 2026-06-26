"use client";
import { useCallback, useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push";
import {
  savePushSubscription,
  deletePushSubscription,
} from "../actions/notificationActions";
import { logger } from "@/lib/logger";

type PushState = "unsupported" | "default" | "granted" | "denied";

export function usePushSubscription() {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setState("unsupported");
      return;
    }
    if (Notification.permission !== "granted") {
      setState(Notification.permission as PushState);
      return;
    }
    // Permission granted is only "on" if an active subscription actually exists
    // (it may have been pruned/cleared). Otherwise show "default" so Enable re-subscribes.
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? "granted" : "default");
      } catch {
        setState("default");
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setBusy(true);
    try {
      await navigator.serviceWorker.register("/sw.js");
      // Wait for the SW to ACTIVATE — subscribing on a still-installing registration
      // throws "no active Service Worker". Race a timeout so a stuck SW doesn't hang `busy`.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready timeout")), 10_000),
        ),
      ]);
      const perm = await Notification.requestPermission();
      setState(perm as PushState);
      if (perm !== "granted") return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ) as BufferSource,
      });
      const j = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (j.endpoint && j.keys?.p256dh && j.keys?.auth) {
        await savePushSubscription({
          endpoint: j.endpoint,
          p256dh: j.keys.p256dh,
          auth: j.keys.auth,
        });
      }
    } catch (e) {
      logger.error("push enable failed", { err: String(e) });
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
    } catch (e) {
      logger.error("push disable failed", { err: String(e) });
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
