"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
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

export default function MapViewInner({
  markers = [],
  draggable = false,
  pin,
  onPinMove,
  height = 320,
}: {
  markers?: MapMarker[];
  draggable?: boolean;
  pin?: { lat: number; lng: number } | null;
  onPinMove?: (lat: number, lng: number) => void;
  height?: number;
}) {
  const center: [number, number] = pin
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
          markers.map((m) => <Marker key={m.id} position={[m.lat, m.lng]} />)
        )}
      </MapContainer>
    </div>
  );
}
