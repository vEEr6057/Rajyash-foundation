"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabaseBrowser } from "@/lib/supabase/browser";
import { getLatestRunPing } from "@/features/runs/actions/runPingActions";
import { POLL_INTERVAL_MS } from "@/config/constants";
import { isStale, formatLastSeen } from "@/features/pickups/lib/staleness";
import type { LivePosition } from "@/features/pickups/hooks/useLivePickupLocation";

export type { LivePosition } from "@/features/pickups/hooks/useLivePickupLocation";

/**
 * Viewer (coordinator/volunteer) live driver location for a run (TRK-05). Mirrors
 * useLivePickupLocation: Postgres Changes (INSERT on run_pings filtered by run_id) +
 * a 10s getLatestRunPing polling fallback, with Clerk-token realtime authorise on
 * subscribe + visibilitychange. `active` is the run-is-trackable gate.
 */
export function useLiveRunLocation(opts: { runId: string; active: boolean }): {
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
    const res = await getLatestRunPing(opts.runId);
    if (res.ok) {
      if (res.ping) setPosition(res.ping);
    } else if (res.code === "UNAUTHORIZED" || res.code === "FORBIDDEN") {
      stopPolling();
      setConnection("idle");
    }
  }, [opts.runId, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setConnection("polling");
    void pollOnce();
    pollRef.current = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
  }, [pollOnce]);

  useEffect(() => {
    if (!opts.active) {
      setConnection("idle");
      setPosition(null);
      return;
    }

    let cancelled = false;
    void pollOnce();

    const channel = supabase
      .channel(`run-pings:${opts.runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "run_pings",
          filter: `run_id=eq.${opts.runId}`,
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
          startPolling();
        }
      });
    channelRef.current = channel;

    void authorizeRealtime();
    const onVisible = () => {
      if (document.visibilityState === "visible") void authorizeRealtime();
    };
    document.addEventListener("visibilitychange", onVisible);
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
    opts.runId,
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
