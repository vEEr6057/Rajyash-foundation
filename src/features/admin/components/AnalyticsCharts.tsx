"use client";

// Recharts touches the DOM at import time, so it must never be evaluated on the
// server/Worker (Next server-renders client components otherwise). Loading the
// chart impl via next/dynamic with ssr:false guarantees it only runs in the
// browser. A "use client" boundary is required for ssr:false to be allowed.
import dynamic from "next/dynamic";

export type { DonutSlice, BarDatum } from "./AnalyticsChartsImpl";

const TrendFallback = () => <div className="h-[260px]" />;
TrendFallback.displayName = "TrendFallback";
const SquareFallback = () => <div className="h-[220px]" />;
SquareFallback.displayName = "SquareFallback";

export const DeliveriesTrendChart = dynamic(
  () => import("./AnalyticsChartsImpl").then((m) => m.DeliveriesTrendChart),
  { ssr: false, loading: TrendFallback },
);

export const StatusDonut = dynamic(
  () => import("./AnalyticsChartsImpl").then((m) => m.StatusDonut),
  { ssr: false, loading: SquareFallback },
);

export const TopBar = dynamic(
  () => import("./AnalyticsChartsImpl").then((m) => m.TopBar),
  { ssr: false, loading: SquareFallback },
);
