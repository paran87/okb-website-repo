"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ExternalLink, MapPinned } from "lucide-react";
import { getMapStyle } from "@/features/map/config/map-styles";
import type { MapLine } from "@/features/accomplishment/public-types";
import { useMapLines } from "@/components/public/accomplishment-live/data";

const CLEANED = "#1d4ed8";
const REMAINING = "#ea7317";

function geometry(line: MapLine) {
  const features = line.runs.flatMap(([cleaned, ...flat]) => {
    const coordinates: [number, number][] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) coordinates.push([flat[i]!, flat[i + 1]!]);
    return coordinates.length >= 2 ? [{ type: "Feature" as const, properties: { c: cleaned }, geometry: { type: "LineString" as const, coordinates } }] : [];
  });
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features)
    for (const [x, y] of f.geometry.coordinates) {
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    }
  return { fc: { type: "FeatureCollection" as const, features }, bounds: [[w, s], [e, n]] as [[number, number], [number, number]], center: [(w + e) / 2, (s + n) / 2] as [number, number] };
}

/** Google Maps link: the traced line's centre, else a search for the name and place. */
export function googleMapsUrl(center: [number, number] | null, query: string): string {
  return center
    ? `https://www.google.com/maps/search/?api=1&query=${center[1].toFixed(6)},${center[0].toFixed(6)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Where one waterway is: its traced line (cleaned / remaining), or a map search when it has none. */
export function WaterwayMap({ name, place }: { name: string; place: string }) {
  const lines = useMapLines(true);
  const line = useMemo(() => lines.data?.find((l) => l.w === name) ?? null, [lines.data, name]);
  const geo = useMemo(() => (line ? geometry(line) : null), [line]);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!geo || !container.current || mapRef.current) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !container.current) return;
      const m = new maplibregl.Map({
        container: container.current,
        style: getMapStyle("light"),
        bounds: geo.bounds,
        fitBoundsOptions: { padding: 36, maxZoom: 16 },
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      m.on("load", () => {
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        m.addSource("line", { type: "geojson", data: geo.fc });
        m.addLayer({ id: "casing", type: "line", source: "line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9 } });
        m.addLayer({
          id: "line",
          type: "line",
          source: "line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["case", ["==", ["get", "c"], 1], CLEANED, REMAINING], "line-width": 5 },
        });
        setReady(true);
      });
      mapRef.current = m;
    });
    return () => {
      cancelled = true;
    };
  }, [geo]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  const mapsUrl = googleMapsUrl(geo?.center ?? null, `${name}, ${place}, Philippines`);

  if (lines.isLoading) return <div className="h-56 animate-pulse rounded-xl bg-[#d7dee8] sm:h-64" aria-label="Loading the map" />;

  if (!geo) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--dpwh-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-blue)]"
      >
        <MapPinned className="size-5 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
        <span className="min-w-0 flex-1">
          Find on Google Maps
          <span className="block text-xs font-normal text-[var(--dpwh-muted)]">This line has not been traced on the OKB map yet.</span>
        </span>
        <ExternalLink className="size-4 shrink-0" aria-hidden />
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white">
      <div className="relative h-56 sm:h-64">
        <div className="absolute inset-0">
          <div ref={container} className="size-full" />
        </div>
        {!ready ? <div className="absolute inset-0 animate-pulse bg-[#e3e8ef]" aria-hidden /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs text-[var(--dpwh-muted)]">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: CLEANED }} aria-hidden /> Cleaned
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: REMAINING }} aria-hidden /> Not yet cleaned
        </span>
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-9 items-center gap-1 font-bold text-[var(--dpwh-blue)]">
          Google Maps <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
