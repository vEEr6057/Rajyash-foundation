"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

  useEffect(() => {
    if (!pos) return;
    const ll: [number, number] = [pos.lat, pos.lng];
    if (ref.current) ref.current.setLatLng(ll); // move existing marker — no remount
    map.panTo(ll, { animate: true }); // gentle recenter
    // Deps intentionally narrowed to the coords (not the `pos` object) so a new
    // object identity each render doesn't re-pan; lat/lng cover every real move.
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
