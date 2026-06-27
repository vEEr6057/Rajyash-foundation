"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { interpolateLatLng } from "@/features/pickups/lib/interpolate";

// Fix default marker icons (Leaflet can't resolve them through the bundler).
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
}

// Ahmedabad default center.
const DEFAULT_CENTER: [number, number] = [23.0225, 72.5714];

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Live volunteer marker (TRK-02 / RESEARCH §E): moves via `setLatLng` on a stable
 * ref — NEVER remount/re-key, which would flicker and reset zoom. Dims when stale (D-07).
 */
function LiveMarker({
  pos,
  stale,
}: {
  pos: { lat: number; lng: number } | null;
  stale: boolean;
}) {
  const map = useMap();
  const ref = useRef<L.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const start = fromRef.current ?? pos; // first fix: no tween, snap into place
    const target = pos;
    const startTs = performance.now();
    const DURATION = 1200; // ms — smooth glide between 30s pings (TRK-02)

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / DURATION);
      const cur = interpolateLatLng(start, target, t);
      if (ref.current) ref.current.setLatLng([cur.lat, cur.lng]);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    map.panTo([target.lat, target.lng], { animate: true }); // gentle recenter
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Deps narrowed to coords (not the `pos` object) so a new object identity
    // each render doesn't restart the tween; lat/lng cover every real move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng, map]);

  if (!pos) return null;
  return (
    <Marker
      position={[pos.lat, pos.lng]}
      ref={(m) => {
        ref.current = m;
      }}
      opacity={stale ? 0.45 : 1}
    />
  );
}

export default function MapViewInner({
  markers = [],
  draggable = false,
  pin,
  onPinMove,
  height = 320,
  live = null,
  liveStale = false,
  destination = null,
  route = null,
}: {
  markers?: MapMarker[];
  draggable?: boolean;
  pin?: { lat: number; lng: number } | null;
  onPinMove?: (lat: number, lng: number) => void;
  height?: number;
  /** Live mode: the volunteer's current position (moves without remount). */
  live?: { lat: number; lng: number } | null;
  liveStale?: boolean;
  /** Live mode: the pickup destination marker (donor's stored lat/lng). */
  destination?: { lat: number; lng: number } | null;
  /** Live mode: the road/straight route from the volunteer to the destination. */
  route?: [number, number][] | null;
}) {
  const center: [number, number] = live
    ? [live.lat, live.lng]
    : destination
      ? [destination.lat, destination.lng]
      : pin
        ? [pin.lat, pin.lng]
        : markers[0]
          ? [markers[0].lat, markers[0].lng]
          : DEFAULT_CENTER;

  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-xl border border-border"
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {draggable && pin ? (
          <>
            <ClickToPlace onPick={(lat, lng) => onPinMove?.(lat, lng)} />
            <Marker
              position={[pin.lat, pin.lng]}
              draggable
              eventHandlers={{
                dragend(e) {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  onPinMove?.(p.lat, p.lng);
                },
              }}
            />
          </>
        ) : (
          <>
            {route && route.length > 1 && (
              <Polyline
                positions={route}
                pathOptions={{ color: "#C04E12", weight: 4, opacity: 0.7 }}
              />
            )}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} />
            )}
            <LiveMarker pos={live} stale={liveStale} />
            {markers.map((m) => (
              <Marker key={m.id} position={[m.lat, m.lng]} />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
