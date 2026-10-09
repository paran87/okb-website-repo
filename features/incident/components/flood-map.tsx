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
  /** A location was tapped; [area] is the place tapped when the location is drawn in more than one. */
  onSelect: (key: string | null, area?: Position[]) => void;
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

/** Lines of one location this far apart (degrees, ~550 m) are separate places, each with its own alert. */
const PLACE_GAP = 0.005;

type Box = [number, number, number, number];
const boxOf = (line: Position[]): Box =>
  line.reduce<Box>(
    ([w, s, e, n], [x = 0, y = 0]) => [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
const near = (a: Box, b: Box, gap = PLACE_GAP) =>
  a[0] - gap <= b[2] && b[0] - gap <= a[2] && a[1] - gap <= b[3] && b[1] - gap <= a[3];

export interface AlertSpot {
  key: string;
  /** Where the alert sits. */
  at: Position;
  /** The flooded road lines of this place (what a tap frames). */
  area: Position[];
}

/**
 * One alert per separate place of each location: a location drawn in two places (the same road names in two
 * cities) gets an alert at each. The alert sits where the roads meet when that is in the place, else halfway
 * along the place's longest flooded line; a location with only a point gets its alert there.
 */
export function alertSpots(lines: FloodLineFeature[], points: FloodPointFeature[]): AlertSpot[] {
  const pointOf = new Map(points.map((p) => [p.properties.key, p.geometry.coordinates]));
  const byKey = new Map<string, Position[][]>();
  for (const l of lines) byKey.set(l.properties.key, [...(byKey.get(l.properties.key) ?? []), ...l.geometry.coordinates]);
  const spots: AlertSpot[] = [];
  for (const [key, parts] of byKey) {
    // Group the lines into places (lines whose extents are within PLACE_GAP of each other).
    const groups: { box: Box; parts: Position[][] }[] = [];
    for (const part of parts.filter((x) => x.length > 1)) {
      let box = boxOf(part);
      let members = [part];
      for (let i = groups.length - 1; i >= 0; i--) {
        const g = groups[i];
        if (!g || !near(g.box, box)) continue;
        box = [Math.min(g.box[0], box[0]), Math.min(g.box[1], box[1]), Math.max(g.box[2], box[2]), Math.max(g.box[3], box[3])];
        members = [...g.parts, ...members];
        groups.splice(i, 1);
      }
      groups.push({ box, parts: members });
    }
    const point = pointOf.get(key);
    for (const g of groups) {
      const longest = g.parts.reduce<Position[]>((a, b) => (lengthOf(b) > lengthOf(a) ? b : a), []);
      const crossing = point && near(g.box, boxOf([point]), 0) ? point : null;
      const at = crossing ?? halfway(longest);
      if (at) spots.push({ key, at, area: g.parts.flat() });
    }
  }
  for (const [key, at] of pointOf) if (!byKey.has(key)) spots.push({ key, at, area: [at] });
  return spots;
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
      for (const { key, at, area } of alertSpots(lines, points)) {
        const marker = new maplibregl.Marker({ element: alertElement(() => onSelect(key, area)), anchor: "center" })
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
