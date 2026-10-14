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
const LOCATION = "#9333ea";

type Lnglat = [number, number];

/** Where a line not traced on the OKB map is, from OpenStreetMap (lib/config/coverage-geo.json). */
export interface FallbackGeo {
  lines: Lnglat[][];
  point?: Lnglat;
  note?: string;
}

type Feature =
  | { type: "Feature"; properties: { c: number }; geometry: { type: "LineString"; coordinates: Lnglat[] } }
  | { type: "Feature"; properties: { c: number }; geometry: { type: "Point"; coordinates: Lnglat } };

/** c: 1 cleaned, 0 not yet cleaned (traced runs); 2 location only (fallback). */
function geometry(line: MapLine | null, fallback: FallbackGeo | undefined) {
  const features: Feature[] = line
    ? line.runs.flatMap(([cleaned, ...flat]) => {
        const coordinates: Lnglat[] = [];
        for (let i = 0; i + 1 < flat.length; i += 2) coordinates.push([flat[i]!, flat[i + 1]!]);
        return coordinates.length >= 2 ? [{ type: "Feature" as const, properties: { c: cleaned === 1 ? 1 : 0 }, geometry: { type: "LineString" as const, coordinates } }] : [];
      })
    : [
        ...(fallback?.lines ?? []).map((coordinates) => ({ type: "Feature" as const, properties: { c: 2 }, geometry: { type: "LineString" as const, coordinates } })),
        ...(fallback?.point ? [{ type: "Feature" as const, properties: { c: 2 }, geometry: { type: "Point" as const, coordinates: fallback.point } }] : []),
      ];
  if (!features.length) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features)
    for (const [x, y] of f.geometry.type === "Point" ? [f.geometry.coordinates] : f.geometry.coordinates) {
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    }
  // A point on the line itself (the vertex nearest the middle) so the Google Maps pin lands on it, not beside it.
  const mid: Lnglat = [(w + e) / 2, (s + n) / 2];
  let center = mid;
  let best = Infinity;
  for (const f of features)
    for (const p of f.geometry.type === "Point" ? [f.geometry.coordinates] : f.geometry.coordinates) {
      const d = (p[0] - mid[0]) ** 2 + (p[1] - mid[1]) ** 2;
      if (d < best) [best, center] = [d, p];
    }
  return {
    fc: { type: "FeatureCollection" as const, features },
    bounds: [[w, s], [e, n]] as [Lnglat, Lnglat],
    center,
    traced: !!line,
    pinOnly: features.every((f) => f.geometry.type === "Point"),
  };
}

/** Google Maps link: the traced line's centre, else a search for the name and place. */
export function googleMapsUrl(center: [number, number] | null, query: string): string {
  return center
    ? `https://www.google.com/maps/search/?api=1&query=${center[1].toFixed(6)},${center[0].toFixed(6)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Where one waterway is: its traced line (cleaned / remaining), else its OpenStreetMap location (fallback), else a
 * map search.
 */
export function WaterwayMap({ name, place, fallback }: { name: string; place: string; fallback?: FallbackGeo }) {
  const lines = useMapLines(true);
  const line = useMemo(() => lines.data?.find((l) => l.w === name) ?? null, [lines.data, name]);
  const geo = useMemo(() => (lines.isLoading ? null : geometry(line, fallback)), [lines.isLoading, line, fallback]);
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
        fitBoundsOptions: { padding: 36, maxZoom: geo.pinOnly ? 14 : 16 },
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
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": ["match", ["get", "c"], 1, CLEANED, 2, LOCATION, REMAINING], "line-width": 5 },
        });
        m.addLayer({
          id: "pin",
          type: "circle",
          source: "line",
          filter: ["==", ["geometry-type"], "Point"],
          paint: { "circle-color": LOCATION, "circle-radius": 9, "circle-stroke-color": "#fff", "circle-stroke-width": 3 },
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
        {geo.traced ? (
          <>
            <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
              <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: CLEANED }} aria-hidden /> Cleaned
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
              <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: REMAINING }} aria-hidden /> Not yet cleaned
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
            <span className={geo.pinOnly ? "size-3 rounded-full" : "h-1.5 w-4 rounded-full"} style={{ backgroundColor: LOCATION }} aria-hidden />
            {geo.pinOnly ? "Approximate location" : "Location"}
            <span className="font-normal text-[var(--dpwh-muted)]">· OpenStreetMap</span>
          </span>
        )}
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-9 items-center gap-1 font-bold text-[var(--dpwh-blue)]">
          Google Maps <ExternalLink className="size-3.5" aria-hidden />
        </a>
        {!geo.traced && fallback?.note ? <p className="w-full pb-1">{fallback.note}</p> : null}
      </div>
    </div>
  );
}
