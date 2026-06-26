"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { getLatestPing } from "@/features/pickups/actions/pickupActions";
import { POLL_INTERVAL_MS } from "@/config/constants";
import { isStale, formatLastSeen } from "@/features/pickups/lib/staleness";

export interface LivePosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  createdAt: string;
}

/**
 * Viewer (donor/admin) live location for a pickup (TRK-02/03). Subscribes to Postgres
 * Changes (INSERT on location_pings filtered by pickup_id, RESEARCH §B). Because the
 * `accessToken` option does NOT authorise Realtime (§A), it calls authorizeRealtime
 * (setAuth) after subscribing and on visibilitychange. The .subscribe status drives a
 * 10s getLatestPing polling fallback (D-06) — also the safety net for Clerk-token
 * lapses (§A) and the path used until the deferred dashboard wiring lands. `active`
 * is the pickup-is-trackable gate (en_route|picked_up); when false the hook tears down.
 */
export function useLivePickupLocation(opts: {
  pickupId: string;
  active: boolean;
}): {
  position: LivePosition | null;
  stale: boolean;
  lastSeen: string | null;
  connection: "realtime" | "polling" | "idle";
} {
  const { supabase, authorizeRealtime } = useSupabaseBrowser();
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [connection, setConnection] = useState<"realtime" | "polling" | "idle">(
    "idle",
  );
  // Tick re-renders so the "Xs ago" label + stale flag recompute even without new pings.
  const [, setTick] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    const res = await getLatestPing(opts.pickupId);
    if (res.ok) {
      if (res.ping) setPosition(res.ping);
    } else if (res.code === "UNAUTHORIZED" || res.code === "FORBIDDEN") {
      // Session lapsed / no longer allowed — stop the loop instead of polling forever.
      stopPolling();
      setConnection("idle");
    }
  }, [opts.pickupId, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setConnection("polling");
    void pollOnce(); // immediate read so the marker isn't blank during reconnect
    pollRef.current = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
  }, [pollOnce]);

  useEffect(() => {
    if (!opts.active) {
      setConnection("idle");
      setPosition(null); // don't leak last coords into a future active session
      return;
    }

    let cancelled = false;
    void pollOnce(); // seed the marker immediately (works even before realtime authorises)

    const channel = supabase
      .channel(`pings:${opts.pickupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_pings",
          filter: `pickup_id=eq.${opts.pickupId}`,
        },
        (payload) => {
          const row = payload.new as {
            lat: number;
            lng: number;
            accuracy: number | null;
            created_at: string;
          };
          setPosition({
            lat: row.lat,
            lng: row.lng,
            accuracy: row.accuracy,
            createdAt: row.created_at,
          });
        },
      )
      .subscribe((status: string) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          stopPolling();
          setConnection("realtime");
        } else {
          startPolling(); // CHANNEL_ERROR | TIMED_OUT | CLOSED → fallback (RESEARCH §B)
        }
      });
    channelRef.current = channel;

    // Authorise the socket right after wiring the channel, and on tab focus regain (§A).
    void authorizeRealtime();
    const onVisible = () => {
      if (document.visibilityState === "visible") void authorizeRealtime();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Recompute "Xs ago"/stale on the same cadence even when pings keep coming.
    const labelTimer = setInterval(() => setTick((n) => n + 1), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(labelTimer);
      stopPolling();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    opts.active,
    opts.pickupId,
    supabase,
    authorizeRealtime,
    pollOnce,
    startPolling,
    stopPolling,
  ]);

  const stale = position ? isStale(position.createdAt) : false;
  const lastSeen = position ? formatLastSeen(position.createdAt) : null;
  return { position, stale, lastSeen, connection };
}
