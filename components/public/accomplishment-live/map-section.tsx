"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ChevronRight, Layers, Map as MapIcon, X } from "lucide-react";
import { getMapStyle } from "@/features/map/config/map-styles";
import type { MapLine, PublicAccomplishment } from "@/features/accomplishment/public-types";
import { useMapLines } from "@/components/public/accomplishment-live/data";
import type { Selection } from "@/components/public/accomplishment-live/regions";
import { dayText, Empty, int, km, Meter, Panel, pctText, recordProgress, StatusPill } from "@/components/public/accomplishment-live/shared";

/** Validated pair (dataviz validator, light basemap); white casing gives the orange its contrast. */
const CLEANED = "#1d4ed8";
const REMAINING = "#ea7317";
const PH_BOUNDS: [[number, number], [number, number]] = [
  [116.8, 4.5],
  [126.8, 21.2],
];

type Basemap = "light" | "satellite";

function toGeoJson(lines: MapLine[]) {
  const runs: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
  const pins: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };
  for (const line of lines) {
    let pinned = false;
    for (const run of line.runs) {
      const [cleaned, ...flat] = run;
      const coordinates: [number, number][] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) coordinates.push([flat[i]!, flat[i + 1]!]);
      if (!coordinates.length) continue;
      if (!pinned) {
        pins.features.push({ type: "Feature", properties: { w: line.w, g: line.g ?? -1 }, geometry: { type: "Point", coordinates: coordinates[Math.floor(coordinates.length / 2)]! } });
        pinned = true;
      }
      if (coordinates.length < 2) continue;
      runs.features.push({ type: "Feature", properties: { w: line.w, c: cleaned }, geometry: { type: "LineString", coordinates } });
    }
  }
  return { runs, pins };
}

function boundsOf(lines: MapLine[]): [[number, number], [number, number]] | null {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const line of lines)
    for (const run of line.runs)
      for (let i = 1; i + 1 < run.length; i += 2) {
        w = Math.min(w, run[i]!);
        e = Math.max(e, run[i]!);
        s = Math.min(s, run[i + 1]!);
        n = Math.max(n, run[i + 1]!);
      }
  return Number.isFinite(w) ? [[w, s], [e, n]] : null;
}

/** Every traced waterway: cleaned and remaining stretches (WaterwayVsCoordinates). */
export function MapSection({
  data,
  focus,
  onOpenWaterway,
  onUntraced,
  recordFor,
  length,
}: {
  data: PublicAccomplishment;
  focus: { name: string; id: number } | null;
  onOpenWaterway: (name: string) => void;
  onUntraced?: (name: string) => void;
  /** The dashboard record behind a traced line (status, volumes, length). */
  recordFor?: (name: string) => Selection | null;
  /** Length cleaned and planned, in metres, for the strip above the map. */
  length?: { done: number; plan: number };
}) {
  const query = useMapLines(true);
  const lines = useMemo(() => query.data ?? [], [query.data]);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("light");
  const [region, setRegion] = useState("all");
  const [picked, setPicked] = useState<MapLine | null>(null);
  const pickedRef = useRef<MapLine | null>(null);
  pickedRef.current = picked;
  const geo = useMemo(() => toGeoJson(lines), [lines]);
  const byName = useMemo(() => new Map(lines.map((l) => [l.w, l])), [lines]);
  const regions = useMemo(() => [...new Set(lines.map((l) => l.r).filter(Boolean))].sort(), [lines]);

  const addLayers = useCallback(
    (m: MapLibreMap) => {
      if (m.getSource("okb-runs")) return;
      m.addSource("okb-runs", { type: "geojson", data: geo.runs });
      m.addSource("okb-pins", { type: "geojson", data: geo.pins });
      m.addLayer({
        id: "okb-selected-glow",
        type: "line",
        source: "okb-runs",
        filter: ["==", ["get", "w"], pickedRef.current?.w ?? ""],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#fcd116", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 8, 14, 20], "line-opacity": 0.95, "line-blur": 1.5 },
      });
      m.addLayer({ id: "okb-runs-casing", type: "line", source: "okb-runs", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 8], "line-opacity": 0.9 } });
      m.addLayer({
        id: "okb-runs",
        type: "line",
        source: "okb-runs",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["case", ["==", ["get", "c"], 1], CLEANED, REMAINING], "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.6, 14, 5] },
      });
      m.addLayer({
        id: "okb-pins",
        type: "circle",
        source: "okb-pins",
        maxzoom: 11,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.5, 10, 6],
          "circle-color": "#002855",
          "circle-stroke-color": "#fcd116",
          "circle-stroke-width": 1.5,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 9, 1, 11, 0],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 9, 1, 11, 0],
        },
      });
    },
    [geo],
  );

  // Create the map once the lines are in.
  useEffect(() => {
    if (!lines.length || !container.current || mapRef.current) return;
    let cancelled = false;
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !container.current) return;
      const m = new maplibregl.Map({
        container: container.current,
        style: getMapStyle("light"),
        bounds: boundsOf(lines) ?? PH_BOUNDS,
        fitBoundsOptions: { padding: 32 },
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      m.on("style.load", () => addLayers(m));
      m.once("load", () => {
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        setReady(true);
      });
      const pick = (e: MapLayerMouseEvent) => {
        const name = e.features?.[0]?.properties?.w as string | undefined;
        const line = name ? byName.get(name) : undefined;
        if (!line) return;
        setPicked(line);
        // Zoom to the whole waterway, leaving room for the information panel.
        const b = boundsOf([line]);
        const narrow = container.current ? container.current.clientWidth < 640 : false;
        if (b) m.fitBounds(b, { padding: { top: 60, left: 48, right: narrow ? 48 : 340, bottom: narrow ? 220 : 60 }, maxZoom: 16, duration: 800 });
      };
      for (const layer of ["okb-runs", "okb-pins"]) {
        m.on("click", layer, pick);
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }
      mapRef.current = m;
    });
    return () => {
      cancelled = true;
    };
  }, [lines, addLayers, byName]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !container.current) return;
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [ready]);

  // Keep the data current after a refresh.
  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m) return;
    (m.getSource("okb-runs") as GeoJSONSource | undefined)?.setData(geo.runs);
    (m.getSource("okb-pins") as GeoJSONSource | undefined)?.setData(geo.pins);
  }, [ready, geo]);

  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m || !m.getLayer("okb-selected-glow")) return;
    m.setFilter("okb-selected-glow", ["==", ["get", "w"], picked?.w ?? ""]);
  }, [ready, picked]);

  const fit = useCallback((subset: MapLine[], maxZoom = 14) => {
    const b = boundsOf(subset);
    if (!b || !mapRef.current) return;
    const narrow = container.current ? container.current.clientWidth < 640 : false;
    const selected = subset.length === 1;
    mapRef.current.fitBounds(b, { padding: selected ? { top: 60, left: 48, right: narrow ? 48 : 340, bottom: narrow ? 220 : 60 } : 48, maxZoom, duration: 800 });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (region === "all") fit(lines, 7);
    else fit(lines.filter((l) => l.r === region), 13);
  }, [ready, region, lines, fit]);

  useEffect(() => {
    if (!ready || !focus) return;
    const line = byName.get(focus.name);
    if (line) {
      fit([line], 16);
      setPicked(line);
    } else if (!query.isLoading) {
      onUntraced?.(focus.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus, byName, fit]);

  const c = data.coordinates;
  const cleanedPct = c.points ? (100 * c.cleaned) / c.points : null;

  return (
    <Panel
      title="Traced waterways"
      icon={MapIcon}
      bodyClassName="p-0"
      action={
        regions.length ? (
          <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Zoom to a region" className="h-9 max-w-[9.5rem] rounded-lg border border-[var(--dpwh-border)] bg-white px-2 text-xs font-semibold text-[var(--dpwh-text)]">
            <option value="all">Whole country</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : null
      }
    >
      {length && length.plan > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-[#e3e8ef] bg-[#f6f8fb] px-4 py-2.5">
          <p className="text-sm text-[var(--dpwh-muted)]">
            <span className="font-display text-xl font-bold text-[var(--dpwh-blue-dark)]">{km(length.done)}</span> cleaned of{" "}
            <span className="font-semibold text-[var(--dpwh-text)]">{km(length.plan)}</span> planned
          </p>
          <Meter pct={(100 * length.done) / length.plan} className="h-2 min-w-24 flex-1" label="Length cleaned" />
          <span className="font-display text-lg font-bold text-[var(--dpwh-blue-dark)]">{pctText((100 * length.done) / length.plan, 0)}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#e3e8ef] px-4 py-2 text-xs text-[var(--dpwh-muted)]">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
          <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: CLEANED }} aria-hidden /> Cleaned
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
          <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: REMAINING }} aria-hidden /> Not yet cleaned
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-[var(--dpwh-text)]">
          <span className="size-2.5 rounded-full border border-[#fcd116] bg-[#002855]" aria-hidden /> Waterway (zoomed out)
        </span>
        <span className="sm:ml-auto">
          {int(c.waterways)} waterways traced · {int(c.cleaned)} of {int(c.points)} points cleaned ({pctText(cleanedPct, 0)})
        </span>
      </div>
      <div className="relative h-[68vh] min-h-[420px] sm:h-[620px]">
        {query.isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#e8edf3]">
            <span className="size-10 animate-spin rounded-full border-2 border-[#c3cedb] border-t-[var(--dpwh-orange)]" aria-label="Loading the map" />
          </div>
        ) : query.error || !lines.length ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Empty>{query.error ? "The map could not be loaded. Try again in a moment." : "No traced waterways yet."}</Empty>
          </div>
        ) : null}
        <div className="absolute inset-0">
          <div ref={container} className="size-full" />
        </div>
        <button
          type="button"
          onClick={() => {
            const next = basemap === "light" ? "satellite" : "light";
            setBasemap(next);
            mapRef.current?.setStyle(getMapStyle(next));
          }}
          aria-label={basemap === "light" ? "Show satellite view" : "Show street map"}
          className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-lg border border-black/10 bg-white text-[var(--dpwh-blue-dark)] shadow-md"
        >
          <Layers className="size-5" aria-hidden />
        </button>
        {picked ? (
          <div className="absolute inset-x-2 bottom-2 z-10 rounded-xl border-t-4 border-[var(--dpwh-orange)] bg-white p-3 shadow-xl sm:left-auto sm:right-3 sm:w-80">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold uppercase leading-tight tracking-wide text-[var(--dpwh-blue-dark)]">{picked.w}</p>
                <p className="truncate text-xs text-[var(--dpwh-muted)]">{[picked.r, picked.s].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={() => setPicked(null)} aria-label="Close" className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--dpwh-muted)] hover:bg-[#f3f6fa]">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {(() => {
              const sel = recordFor?.(picked.w) ?? null;
              const w = sel?.record;
              const pct = w ? recordProgress(w, data.scale) : picked.g;
              return (
                <>
                  {w && sel ? <StatusPill w={w} scale={data.scale} className="mt-2" /> : null}
                  <div className="mt-2 flex items-center gap-3">
                    <Meter pct={pct} className="flex-1" />
                    <span className="font-display text-xl font-bold text-[var(--dpwh-blue-dark)]">{pctText(pct, 0)}</span>
                  </div>
                  {w ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpwh-muted)]">Silt removed</dt>
                        <dd className="font-semibold text-[var(--dpwh-text)]">{w.v !== null ? `${int(w.v)} m³` : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpwh-muted)]">Planned</dt>
                        <dd className="font-semibold text-[var(--dpwh-text)]">{w.p !== null ? `${int(w.p)} m³` : "—"}</dd>
                      </div>
                      {w.al !== null || w.pl !== null ? (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpwh-muted)]">Length cleaned</dt>
                          <dd className="font-semibold text-[var(--dpwh-text)]">
                            {w.al !== null ? km(w.al) : "—"}
                            {w.pl ? ` of ${km(w.pl)}` : ""}
                          </dd>
                        </div>
                      ) : null}
                      {w.o ? (
                        <div className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpwh-muted)]">Office</dt>
                          <dd className="truncate font-semibold text-[var(--dpwh-text)]">{w.o}</dd>
                        </div>
                      ) : null}
                      {w.lu ? (
                        <div className="col-span-2">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--dpwh-muted)]">Last field update</dt>
                          <dd className="font-semibold text-[var(--dpwh-text)]">{dayText(w.lu)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </>
              );
            })()}
            <button
              type="button"
              onClick={() => onOpenWaterway(picked.w)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-[var(--dpwh-blue-dark)] text-sm font-bold text-white hover:bg-[var(--dpwh-blue)]"
            >
              Details and photos <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
