"use client";

import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * Next's webpack dev server wraps a static image import as
 * `{ src, width, height }`; Turbopack (this project's `next dev --turbopack`)
 * hands back the plain URL string instead. Reading `.src` off that string is
 * `undefined`, which is exactly what makes `L.icon` throw "iconUrl not set in
 * Icon options" — normalize both shapes instead of assuming one.
 */
function assetSrc(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

const pinIcon = L.icon({
  iconUrl: assetSrc(markerIcon),
  iconRetinaUrl: assetSrc(markerIcon2x),
  shadowUrl: assetSrc(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPinPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: { lat: number; lng: number };
  onChange: (coordinates: { lat: number; lng: number }) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // isolate: Leaflet's panes/controls carry z-index up to 1000. Its own
      // container is position:relative with z-index:auto, which per spec
      // does NOT create a stacking context — so those z-indexes escape past
      // this box and render above app overlays like Select (z-[110]).
      // isolate contains them so they can never outrank anything outside.
      className="isolate overflow-hidden rounded-xl border border-surface-border"
    >
      <MapContainer
        center={[value.lat, value.lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-56 w-full sm:h-72"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
        <ClickToMove onMove={(lat, lng) => onChange({ lat, lng })} />
      </MapContainer>
    </div>
  );
}
