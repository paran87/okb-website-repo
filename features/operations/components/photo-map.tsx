"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Layers, MapPinOff } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/features/map/config/map-styles";
import { cn } from "@/utils/cn";

type Basemap = "light" | "satellite";

function markerElement(label: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col items-center";
  root.style.pointerEvents = "none";
  const pill = document.createElement("span");
  pill.className =
    "mb-1 max-w-[180px] truncate rounded-full bg-[#c2410c] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md";
  pill.textContent = label;
  const pin = document.createElement("span");
  pin.innerHTML =
    '<svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 37s13-12.4 13-22A13 13 0 0 0 2 15c0 9.6 13 22 13 22Z" fill="#c2410c" stroke="white" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="white"/></svg>';
  root.append(pill, pin);
  return root;
}

/** Street / satellite map centered on one photo's geotag. */
export function PhotoMap({
  lat,
  lng,
  label,
  className,
  style,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("light");
  const [ready, setReady] = useState(false);
  const hasPoint = lat !== null && lng !== null;

  // Create the map once.
  useEffect(() => {
    if (!hasPoint || !container.current || map.current) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !container.current) return;
      const m = new maplibregl.Map({
        container: container.current,
        style: getMapStyle("light"),
        center: [lng, lat],
        zoom: 15,
        attributionControl: { compact: true },
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      // Start with the attribution collapsed to its (i) button; it covers the map on phones.
      m.once("load", () =>
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"),
      );
      marker.current = new maplibregl.Marker({ element: markerElement(label), anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(m);
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Position and label updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPoint]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  // Follow the selected photo.
  useEffect(() => {
    if (!ready || !map.current || !marker.current || lat === null || lng === null) return;
    marker.current.setLngLat([lng, lat]);
    const pill = marker.current.getElement().firstElementChild;
    if (pill) pill.textContent = label;
    map.current.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 15), duration: 700 });
  }, [ready, lat, lng, label]);

  // The container is resized by the phone layout's drag handle.
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => map.current?.resize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("relative", className)} style={style}>
      {/* maplibre-gl.css makes the map element position: relative, so it fills a positioned wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} className="size-full" />
      </div>
      {!hasPoint ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
          <MapPinOff className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-caption text-muted-foreground">
            No coordinates could be read from this photo&apos;s GPS stamp.
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const next = basemap === "light" ? "satellite" : "light";
          setBasemap(next);
          map.current?.setStyle(getMapStyle(next));
        }}
        aria-label={basemap === "light" ? "Show satellite view" : "Show street map"}
        className="absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-lg border border-black/10 bg-white text-slate-700 shadow-md"
      >
        <Layers className="size-5" aria-hidden />
      </button>
    </div>
  );
}
