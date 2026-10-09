"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, MultiLineString, Point, Position } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import { MapEngine } from "@/features/map/components/map-engine";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { isLiveMap, useMapStore } from "@/features/map/store/map.store";

export interface FloodLineProps {
  key: string;
  color: string;
  /** Draw order: higher severity on top. */
  rank: number;
}

export type FloodLineFeature = Feature<MultiLineString, FloodLineProps>;
export type FloodPointFeature = Feature<Point, FloodLineProps>;

export interface FloodMapProps {
  lines: FloodLineFeature[];
  points: FloodPointFeature[];
  selectedKey: string | null;
  /** Frame these positions (changes of [focus.id] move the map), clear of panels over the map ([padding]). */
  focus: { id: number; positions: Position[]; padding?: Partial<Record<"top" | "right" | "bottom" | "left", number>> } | null;
  onSelect: (key: string | null) => void;
  /** Show the flooded-road layers (default true). */
  visible?: boolean;
  /** A pulsing red alert on each flooded location (Incidents map). */
  alerts?: boolean;
}

const expr = (e: unknown) => e as ExpressionSpecification;
const width = (scale: number) => expr(["interpolate", ["linear"], ["zoom"], 9, 2.5 * scale, 13, 5 * scale, 17, 10 * scale]);

const span = (a: Position, b: Position) => Math.hypot((b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0));
const lengthOf = (line: Position[]) => line.reduce((sum, p, i) => (i ? sum + span(line[i - 1] ?? p, p) : 0), 0);

/** The point halfway along a line. */
function halfway(line: Position[]): Position | null {
  let rest = lengthOf(line) / 2;
  for (let i = 1; i < line.length; i++) {
    const [a = [0, 0], b = [0, 0]] = [line[i - 1], line[i]];
    const d = span(a, b);
    if (d >= rest && d > 0) {
      const t = rest / d;
      return [(a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * t, (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * t];
    }
    rest -= d;
  }
  return line[0] ?? null;
}

/** Where a location's alert sits: halfway along its longest flooded road line, else at its point. */
function alertAnchors(lines: FloodLineFeature[], points: FloodPointFeature[]): Map<string, Position> {
  const anchors = new Map<string, Position>();
  for (const l of lines) {
    if (anchors.has(l.properties.key)) continue;
    const longest = l.geometry.coordinates.reduce<Position[]>((a, b) => (lengthOf(b) > lengthOf(a) ? b : a), []);
    const at = halfway(longest);
    if (at) anchors.set(l.properties.key, at);
  }
  for (const p of points) if (!anchors.has(p.properties.key)) anchors.set(p.properties.key, p.geometry.coordinates);
  return anchors;
}

/** The alert: a red disc with a white "!" and a pulsing ring, in a 40 px tap target. */
function alertElement(onTap: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.floodAlert = "";
  button.setAttribute("aria-label", "Flooded road: show details");
  button.className = "grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0";
  const ring = document.createElement("span");
  ring.className = "col-start-1 row-start-1 size-7 rounded-full bg-[#ef1c1c] opacity-60 motion-safe:animate-ping";
  const disc = document.createElement("span");
  disc.className =
    "col-start-1 row-start-1 grid size-7 place-items-center rounded-full bg-[#e41b1b] text-[18px] font-black leading-none text-white shadow-[0_0_0_2px_#fff,0_1px_5px_rgba(0,0,0,0.4)]";
  disc.textContent = "!";
  disc.setAttribute("aria-hidden", "true");
  button.append(ring, disc);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onTap();
  });
  return button;
}

/** Map of flooded roads (MapLibre). One map per page: it uses the shared map store. */
export function FloodMap(props: FloodMapProps) {
  return (
    <>
      <MapEngine
        initialView={NCR_MAP_VIEW}
        initialStyleId="light"
        initialLayers={[]}
        lockBasemap
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher={false}
        className="absolute inset-0 h-full w-full"
      />
      <FloodLayers {...props} />
    </>
  );
}

/** The flooded-road layers, on whichever map the page shows (Incidents map or Dashboard map). */
export function FloodLayers({ lines, points, selectedKey, focus, onSelect, visible = true, alerts = false }: FloodMapProps) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [styleVersion, setStyleVersion] = useState(0);
  const applied = useRef(new Map<string, unknown>());

  const linesFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: [...lines].sort((a, b) => a.properties.rank - b.properties.rank) }),
    [lines],
  );
  const pointsFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: [...points].sort((a, b) => a.properties.rank - b.properties.rank) }),
    [points],
  );

  const sync = useCallback(
    (m: MapLibreMap) => {
      for (const [id, data] of [
        ["fm-lines", linesFc],
        ["fm-points", pointsFc],
      ] as const) {
        const existing = m.getSource(id);
        if (!existing) {
          m.addSource(id, { type: "geojson", data });
          applied.current.set(id, data);
        } else if (applied.current.get(id) !== data) {
          (existing as GeoJSONSource).setData(data);
          applied.current.set(id, data);
        }
      }
      const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => {
        if (!m.getLayer(layer.id)) m.addLayer(layer);
      };
      add({
        id: "fm-selected",
        type: "line",
        source: "fm-lines",
        layout: { "line-cap": "round", "line-join": "round" },
        filter: expr(["==", ["get", "key"], ""]),
        paint: { "line-color": "#facc15", "line-opacity": 0.6, "line-width": width(3.2), "line-blur": 2 },
      });
      add({
        id: "fm-casing",
        type: "line",
        source: "fm-lines",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-opacity": 0.9, "line-width": width(1.7) },
      });
      add({
        id: "fm-line",
        type: "line",
        source: "fm-lines",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": width(1) },
      });
      add({
        id: "fm-point",
        type: "circle",
        source: "fm-points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": expr(["interpolate", ["linear"], ["zoom"], 9, 5, 14, 9]),
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
    },
    [linesFc, pointsFc],
  );

  useEffect(() => {
    if (!isLiveMap(map) || status !== "ready") return;
    const rebuild = () => {
      applied.current.clear();
      setStyleVersion((v) => v + 1);
    };
    map.on("style.load", rebuild);
    return () => {
      map.off("style.load", rebuild);
    };
  }, [map, status]);

  useEffect(() => {
    if (!isLiveMap(map) || status !== "ready") return;
    const apply = () => {
      // Another part of the page may still be adding its layers (Dashboard): wait until the style is ready.
      if (!isLiveMap(map)) return true;
      if (!map.isStyleLoaded()) return false;
      sync(map);
      map.setFilter("fm-selected", expr(["==", ["get", "key"], selectedKey ?? ""]));
      for (const id of ["fm-selected", "fm-casing", "fm-line", "fm-point"]) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
      return true;
    };
    if (apply()) return;
    const retry = () => {
      if (apply()) {
        map.off("styledata", retry);
        map.off("idle", retry);
      }
    };
    map.on("styledata", retry);
    map.on("idle", retry);
    return () => {
      map.off("styledata", retry);
      map.off("idle", retry);
    };
  }, [map, status, styleVersion, sync, selectedKey, visible]);

  // Tap a flooded road or point to select it.
  useEffect(() => {
    if (!isLiveMap(map) || status !== "ready") return;
    const pick = (event: MapMouseEvent) => {
      const { x, y } = event.point;
      const layers = ["fm-point", "fm-line"].filter((id) => map.getLayer(id));
      return map.queryRenderedFeatures(
        [
          [x - 10, y - 10],
          [x + 10, y + 10],
        ],
        { layers },
      )[0];
    };
    const onClick = (event: MapMouseEvent) => {
      // A tap on an alert selects its location (the alert's own handler).
      if ((event.originalEvent.target as Element | null)?.closest?.("[data-flood-alert]")) return;
      onSelect((pick(event)?.properties?.key as string | undefined) ?? null);
    };
    const onMove = (event: MapMouseEvent) => {
      map.getCanvas().style.cursor = pick(event) ? "pointer" : "";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [map, status, onSelect]);

  // Pulsing red alerts on the flooded locations (HTML markers, above the roads).
  useEffect(() => {
    if (!alerts || !visible || !isLiveMap(map) || status !== "ready") return;
    let cancelled = false;
    const markers: Marker[] = [];
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !isLiveMap(map)) return;
      for (const [key, at] of alertAnchors(lines, points)) {
        const marker = new maplibregl.Marker({ element: alertElement(() => onSelect(key)), anchor: "center" })
          .setLngLat([at[0] ?? 0, at[1] ?? 0])
          .addTo(map);
        markers.push(marker);
      }
    });
    return () => {
      cancelled = true;
      for (const m of markers) m.remove();
    };
  }, [map, status, alerts, visible, lines, points, onSelect]);

  useEffect(() => {
    if (!isLiveMap(map) || status !== "ready" || !focus || focus.positions.length === 0) return;
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x = 0, y = 0] of focus.positions) {
      w = Math.min(w, x);
      s = Math.min(s, y);
      e = Math.max(e, x);
      n = Math.max(n, y);
    }
    // Room for a panel over the map, when the map is big enough for it.
    const pad = { top: 48, right: 48, bottom: 48, left: 48, ...focus.padding };
    const { clientWidth: cw, clientHeight: ch } = map.getContainer();
    const fits = pad.left + pad.right < cw - 40 && pad.top + pad.bottom < ch - 40;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: fits ? pad : 48, maxZoom: 16, duration: 600 },
    );
  }, [map, status, focus]);

  return null;
}
