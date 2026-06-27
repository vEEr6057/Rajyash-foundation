"use client";

import { useCallback, useMemo } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { env } from "@/config/env";

/**
 * Browser Supabase client for Live Tracking (TRK-02), authorised by Clerk's NATIVE
 * third-party integration (no JWT template — that flow was deprecated 2025-04-01,
 * RESEARCH §A). READ/SUBSCRIBE ONLY: the anon key + RLS gate every read; the browser
 * never writes pings (that's the recordPing server action).
 *
 * CRITICAL (RESEARCH §A gotcha): the `accessToken` option authorises PostgREST/Storage
 * but NOT the Realtime socket. The viewer hook (useLivePickupLocation) MUST call
 * `authorizeRealtime()` (supabase.realtime.setAuth) after creating the client and again
 * on every token refresh, or every channel silently fails RLS and receives ZERO events.
 * Until the deferred Clerk↔Supabase dashboard wiring + the `role:"authenticated"` claim
 * land, the token isn't accepted and the viewer runs on the polling fallback — degraded,
 * not broken.
 */
export function useSupabaseBrowser(): {
  supabase: SupabaseClient;
  /** Push the current Clerk token to the Realtime socket (call after subscribe + on refresh). */
  authorizeRealtime: () => Promise<string | null>;
} {
  const { session } = useSession();

  // Stable per session identity — re-create only if the session object changes.
  const supabase = useMemo(
    () =>
      createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          async accessToken() {
            return (await session?.getToken()) ?? null; // native integration — no template
          },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      ),
    [session],
  );

  // useCallback so the reference is stable across renders — the viewer hook lists it
  // as a useEffect dependency; an unstable ref would tear down + re-subscribe the
  // Realtime channel on every parent re-render (channel churn / leak).
  const authorizeRealtime = useCallback(async (): Promise<string | null> => {
    const token = (await session?.getToken()) ?? null;
    if (token) await supabase.realtime.setAuth(token);
    return token;
  }, [supabase, session]);

  return { supabase, authorizeRealtime };
}
