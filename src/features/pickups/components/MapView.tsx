"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MapViewInner from "./MapViewInner";

// react-leaflet needs `window` — load client-only (no SSR / no Worker render).
const Inner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => <div className="rj-skeleton h-[320px] w-full" />,
});

export type MapMarker = ComponentProps<typeof MapViewInner>["markers"];

export function MapView(props: ComponentProps<typeof MapViewInner>) {
  return <Inner {...props} />;
}
