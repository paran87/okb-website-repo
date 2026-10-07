"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, MultiLineString, Point, Position } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { MapEngine } from "@/features/map/components/map-engine";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { useMapStore } from "@/features/map/store/map.store";

export interface FloodLineProps {
  key: string;
  color: string;
  /** Draw order: higher severity on top. */
  rank: number;
}

export type FloodLineFeature = Feature<MultiLineString, FloodLineProps>;
export type FloodPointFeature = Feature<Point, FloodLineProps>;

interface FloodMapProps {
  lines: FloodLineFeature[];
  points: FloodPointFeature[];
  selectedKey: string | null;
  /** Frame these positions (changes of [focus.id] move the map). */
  focus: { id: number; positions: Position[] } | null;
  onSelect: (key: string | null) => void;
}

const expr = (e: unknown) => e as ExpressionSpecification;
const width = (scale: number) => expr(["interpolate", ["linear"], ["zoom"], 9, 2.5 * scale, 13, 5 * scale, 17, 10 * scale]);

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

function FloodLayers({ lines, points, selectedKey, focus, onSelect }: FloodMapProps) {
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
    if (!map || status !== "ready") return;
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
    if (!map || status !== "ready" || !map.isStyleLoaded()) return;
    sync(map);
    map.setFilter("fm-selected", expr(["==", ["get", "key"], selectedKey ?? ""]));
  }, [map, status, styleVersion, sync, selectedKey]);

  // Tap a flooded road or point to select it.
  useEffect(() => {
    if (!map || status !== "ready") return;
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
    const onClick = (event: MapMouseEvent) => onSelect((pick(event)?.properties?.key as string | undefined) ?? null);
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

  useEffect(() => {
    if (!map || status !== "ready" || !focus || focus.positions.length === 0) return;
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x = 0, y = 0] of focus.positions) {
      w = Math.min(w, x);
      s = Math.min(s, y);
      e = Math.max(e, x);
      n = Math.max(n, y);
    }
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 48, maxZoom: 16, duration: 600 },
    );
  }, [map, status, focus]);

  return null;
}
