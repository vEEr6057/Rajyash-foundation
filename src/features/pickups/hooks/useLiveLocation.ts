"use client";

import { useEffect, useRef, useState } from "react";
import { PING_INTERVAL_MS } from "@/config/constants";

export type GeoPermission = "prompt" | "granted" | "denied" | "unsupported";

/**
 * TRK-01 / D-04: volunteer GPS capture. watchPosition (high accuracy), throttled to
 * one onFix per ~PING_INTERVAL_MS, active ONLY while the caller says so (pickup is
 * en_route|picked_up AND the viewer is the assigned volunteer). Consent is
 * best-effort: denial/unsupported never blocks the rescue loop — it only flips `perm`
 * so the UI can show a "tracking off" banner. Foreground-tab only (mobile browsers
 * suspend background tabs — which is exactly why the stale indicator exists).
 */
export function useLiveLocation(opts: {
  active: boolean;
  onFix: (lat: number, lng: number, accuracy: number) => void;
}): { perm: GeoPermission } {
  const [perm, setPerm] = useState<GeoPermission>("prompt");
  const lastWrite = useRef(0);
  // Keep the latest onFix without re-subscribing the watch every render.
  const onFixRef = useRef(opts.onFix);
  onFixRef.current = opts.onFix;

  useEffect(() => {
    if (!opts.active) return;
    lastWrite.current = 0; // fresh active session — never throttle its first fix
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPerm("unsupported");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPerm("granted");
        const now = Date.now();
        if (now - lastWrite.current < PING_INTERVAL_MS) return; // throttle to ~30s
        lastWrite.current = now;
        onFixRef.current(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPerm("denied");
        // POSITION_UNAVAILABLE / TIMEOUT: keep watching; non-blocking.
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 27_000 },
    );
    return () => navigator.geolocation.clearWatch(id); // cleanup on unmount / active→false
  }, [opts.active]);

  return { perm };
}
