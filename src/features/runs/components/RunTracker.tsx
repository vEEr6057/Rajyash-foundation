"use client";

import { useState } from "react";
import { useLiveLocation } from "@/features/pickups/hooks/useLiveLocation";
import { recordRunPing } from "@/features/runs/actions/runPingActions";
import { SharingLocationBanner } from "@/features/pickups/components/SharingLocationBanner";

/**
 * Assigned-driver GPS capture for a run (TRK-05). Mirrors VolunteerTracker: wires
 * useLiveLocation's throttled fixes to recordRunPing; latches `stopped` when the run
 * is no longer active server-side so it stops pinging instead of failing forever.
 */
export function RunTracker({ runId, active }: { runId: string; active: boolean }) {
  const [stopped, setStopped] = useState(false);
  const effectiveActive = active && !stopped;

  const { perm } = useLiveLocation({
    active: effectiveActive,
    onFix: async (lat, lng, accuracy) => {
      const res = await recordRunPing(runId, lat, lng, accuracy);
      if (!res.ok && (res.code === "INACTIVE" || res.code === "FORBIDDEN")) {
        setStopped(true);
      }
    },
  });

  if (!effectiveActive) return null;
  return <SharingLocationBanner perm={perm} />;
}
