"use client";

import type { GeoPermission } from "@/features/pickups/hooks/useLiveLocation";

/**
 * Volunteer-facing tracking state (TRK-01 / D-04). Granted → a reassuring "sharing"
 * banner with the rj-dot-live pulse + the privacy promise (trail deleted on delivery).
 * Denied/unsupported → a muted "off, the pickup still works" note (best-effort consent).
 */
export function SharingLocationBanner({ perm }: { perm: GeoPermission }) {
  if (perm === "granted") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-leaf-soft bg-leaf-soft px-3 py-2 text-sm text-leaf-soft-foreground">
        <span
          className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright"
          aria-hidden="true"
        />
        <span className="font-medium">Sharing your location</span>
        <span className="opacity-80">· deleted when you mark delivered</span>
      </div>
    );
  }
  if (perm === "denied" || perm === "unsupported") {
    return (
      <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Location sharing is off — the pickup still works normally.
      </div>
    );
  }
  return null; // "prompt" → no banner until the first fix/decision
}
