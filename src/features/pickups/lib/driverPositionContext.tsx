"use client";

import { createContext, useContext } from "react";
import type { LatLng } from "@/lib/routing";

/**
 * UX-2: shares the driver's one-shot geolocation fix across every board
 * card's DistanceChip. Only DistanceAwareBoardList calls getCurrentPosition
 * (once, for the whole board) — cards read the result from here instead of
 * each requesting their own fix. `null` = no fix yet / denied / unsupported
 * (chips render nothing in that case).
 */
export const DriverPositionContext = createContext<LatLng | null>(null);

export function useDriverPosition(): LatLng | null {
  return useContext(DriverPositionContext);
}
