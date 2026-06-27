"use client";

import { useState } from "react";
import { useLiveLocation } from "@/features/pickups/hooks/useLiveLocation";
import { recordPing } from "@/features/pickups/actions/pickupActions";
import { SharingLocationBanner } from "./SharingLocationBanner";

/**
 * Assigned-volunteer GPS capture (TRK-01). Wires useLiveLocation's throttled fixes to
 * the recordPing server action (D-05: the browser never anon-writes). Renders nothing
 * when inactive; permission denial never blocks status advance (best-effort, D-04).
 *
 * `active` comes from the server-rendered pickup.status, which won't update without a
 * navigation. So if the volunteer advances past picked_up while still on this page,
 * recordPing starts returning INACTIVE/FORBIDDEN — we latch `stopped` to tear the watch
 * down instead of pinging (and failing) every 30s forever.
 */
export function VolunteerTracker({
  pickupId,
  active,
}: {
  pickupId: string;
  active: boolean;
}) {
  const [stopped, setStopped] = useState(false);
  const effectiveActive = active && !stopped;

  const { perm } = useLiveLocation({
    active: effectiveActive,
    onFix: async (lat, lng, accuracy) => {
      const res = await recordPing(pickupId, lat, lng, accuracy);
      if (!res.ok && (res.code === "INACTIVE" || res.code === "FORBIDDEN")) {
        setStopped(true); // pickup no longer active server-side — stop sharing
      }
    },
  });

  if (!effectiveActive) return null;
  return <SharingLocationBanner perm={perm} />;
}
