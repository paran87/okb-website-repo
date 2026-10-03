"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from "maplibre-gl";
import { MapEngine } from "@/features/map/components/map-engine";
import { PHILIPPINES_MAP_VIEW } from "@/features/map/config/default-view";
import {
  MAP_LABEL_FONT,
  WEATHER_BASEMAP_STYLES,
} from "@/features/map/config/map-styles";
import { useMapStore } from "@/features/map/store/map.store";
import type { Bounds } from "@/features/road-network/lib/geo";
import {
  CLASS_META,
  EXPRESSWAY_COLOR,
  type ExpresswayFeature,
  type RoadFeature,
} from "@/features/road-network/types";

export type Selection = { kind: "road" | "expressway"; id: number } | null;

interface RoadMapProps {
  roads: RoadFeature[];
  expressways: ExpresswayFeature[];
  /** Road ids that match the filters; null means "no filter active". */
  matchIds: number[] | null;
  showExpressways: boolean;
  /** Region / island filters, applied to expressways too. */
  expressFilter: { region: string | null; island: string | null };
  floodPoints: Feature<Point>[];
  incidentPoints: Feature<Point>[];
  showFlood: boolean;
  showIncidents: boolean;
  selected: Selection;
  selectedFeature: RoadFeature | ExpresswayFeature | null;
  fit: { bounds: Bounds; key: number } | null;
  onSelect: (selection: Selection) => void;
}

const expr = (e: unknown) => e as ExpressionSpecification;
const byClass = (values: Record<"P" | "S" | "T", number>) =>
  expr(["match", ["get", "cls"], "P", values.P, "S", values.S, values.T]);
const zoomWidth = (scale: number) =>
  expr([
    "interpolate",
    ["linear"],
    ["zoom"],
    5,
    byClass({
      P: CLASS_META.P.width * 0.45 * scale,
      S: CLASS_META.S.width * 0.25 * scale,
      T: CLASS_META.T.width * 0.2 * scale,
    }),
    9,
    byClass({
      P: CLASS_META.P.width * 0.9 * scale,
      S: CLASS_META.S.width * 0.7 * scale,
      T: CLASS_META.T.width * 0.6 * scale,
    }),
    13,
    byClass({
      P: CLASS_META.P.width * 1.8 * scale,
      S: CLASS_META.S.width * 1.6 * scale,
      T: CLASS_META.T.width * 1.5 * scale,
    }),
    17,
    byClass({
      P: CLASS_META.P.width * 3.2 * scale,
      S: CLASS_META.S.width * 3 * scale,
      T: CLASS_META.T.width * 2.8 * scale,
    }),
  ]);

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Full-bleed map of the national road network with filter-aware layers. */
export function RoadMap(props: RoadMapProps) {
  return (
    <>
      <MapEngine
        initialView={PHILIPPINES_MAP_VIEW}
        initialStyleId="light"
        initialLayers={[]}
        lockBasemap
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher
        basemapStyles={WEATHER_BASEMAP_STYLES}
        className="absolute inset-0 h-full w-full"
      />
      <RoadMapLayers {...props} />
    </>
  );
}

function RoadMapLayers({
  roads,
  expressways,
  matchIds,
  showExpressways,
  expressFilter,
  floodPoints,
  incidentPoints,
  showFlood,
  showIncidents,
  selected,
  selectedFeature,
  fit,
  onSelect,
}: RoadMapProps) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [styleVersion, setStyleVersion] = useState(0);
  const applied = useRef(new Map<string, unknown>());

  const roadsFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: roads }),
    [roads],
  );
  const expressFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: expressways }),
    [expressways],
  );
  const floodFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: floodPoints }),
    [floodPoints],
  );
  const incidentFc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features: incidentPoints }),
    [incidentPoints],
  );
  const selectedFc = useMemo<FeatureCollection>(
    () =>
      selectedFeature
        ? { type: "FeatureCollection", features: [selectedFeature] }
        : EMPTY,
    [selectedFeature],
  );

  /** Create sources (once per style) and push new data only when it changed. */
  const syncSources = useCallback(
    (m: MapLibreMap) => {
      const sources: [string, FeatureCollection][] = [
        ["rn-roads", roadsFc],
        ["rn-express", expressFc],
        ["rn-flood", floodFc],
        ["rn-incidents", incidentFc],
        ["rn-selected", selectedFc],
      ];
      for (const [id, data] of sources) {
        const existing = m.getSource(id);
        if (!existing) {
          m.addSource(id, { type: "geojson", data });
          applied.current.set(id, data);
        } else if (applied.current.get(id) !== data) {
          (existing as GeoJSONSource).setData(data);
          applied.current.set(id, data);
        }
      }
    },
    [roadsFc, expressFc, floodFc, incidentFc, selectedFc],
  );

  const ensureLayers = useCallback((m: MapLibreMap) => {
    const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => {
      if (!m.getLayer(layer.id)) m.addLayer(layer);
    };
    add({
      id: "rn-dim",
      type: "line",
      source: "rn-roads",
      layout: { visibility: "none" },
      paint: {
        "line-color": "#64748b",
        "line-opacity": 0.25,
        "line-width": zoomWidth(0.6),
      },
    });
    add({
      id: "rn-casing",
      type: "line",
      source: "rn-roads",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-opacity": 0.85,
        "line-width": zoomWidth(1.7),
      },
    });
    add({
      id: "rn-line",
      type: "line",
      source: "rn-roads",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": expr([
          "match",
          ["get", "cls"],
          "P",
          CLASS_META.P.color,
          "S",
          CLASS_META.S.color,
          CLASS_META.T.color,
        ]),
        "line-width": zoomWidth(1),
      },
    });
    add({
      id: "rn-express-casing",
      type: "line",
      source: "rn-express",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0f172a",
        "line-width": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          2.6,
          9,
          4.4,
          13,
          7,
          17,
          11,
        ]),
      },
    });
    add({
      id: "rn-express-line",
      type: "line",
      source: "rn-express",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": EXPRESSWAY_COLOR,
        "line-width": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          1.4,
          9,
          2.6,
          13,
          4.4,
          17,
          7,
        ]),
      },
    });
    add({
      id: "rn-labels",
      type: "symbol",
      source: "rn-roads",
      minzoom: 10.5,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": [...MAP_LABEL_FONT],
        "text-size": 11,
        "symbol-spacing": 320,
        "text-max-angle": 40,
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    });
    add({
      id: "rn-selected-glow",
      type: "line",
      source: "rn-selected",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#facc15",
        "line-opacity": 0.55,
        "line-width": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          7,
          12,
          14,
          17,
          24,
        ]),
        "line-blur": 3,
      },
    });
    add({
      id: "rn-selected-line",
      type: "line",
      source: "rn-selected",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0f172a",
        "line-width": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          2,
          12,
          4,
          17,
          7,
        ]),
      },
    });
    add({
      id: "rn-flood-points",
      type: "circle",
      source: "rn-flood",
      layout: { visibility: "none" },
      paint: {
        "circle-color": "#7c3aed",
        "circle-radius": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          2,
          10,
          4,
          14,
          7,
        ]),
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
        "circle-opacity": 0.9,
      },
    });
    add({
      id: "rn-incident-points",
      type: "circle",
      source: "rn-incidents",
      layout: { visibility: "none" },
      paint: {
        "circle-color": "#e11d48",
        "circle-radius": expr([
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          3,
          10,
          5,
          14,
          8,
        ]),
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1.5,
      },
    });
  }, []);

  // Build everything once the map is ready, and again after a basemap switch.
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
    syncSources(map);
    ensureLayers(map);

    const filter = matchIds
      ? expr(["in", ["get", "id"], ["literal", matchIds]])
      : null;
    for (const id of ["rn-casing", "rn-line", "rn-labels"])
      map.setFilter(id, filter);
    const expressParts: unknown[] = [];
    if (expressFilter.region)
      expressParts.push(["==", ["get", "region"], expressFilter.region]);
    if (expressFilter.island)
      expressParts.push(["==", ["get", "island"], expressFilter.island]);
    const expressExpr = expressParts.length
      ? expr(["all", ...expressParts])
      : null;
    map.setFilter("rn-express-casing", expressExpr);
    map.setFilter("rn-express-line", expressExpr);
    const vis = (id: string, on: boolean) =>
      map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("rn-dim", matchIds !== null);
    vis("rn-express-casing", showExpressways);
    vis("rn-express-line", showExpressways);
    vis("rn-flood-points", showFlood);
    vis("rn-incident-points", showIncidents);
  }, [
    map,
    status,
    styleVersion,
    syncSources,
    ensureLayers,
    matchIds,
    showExpressways,
    expressFilter,
    showFlood,
    showIncidents,
  ]);

  // Click to select; pointer cursor over roads.
  useEffect(() => {
    if (!map || status !== "ready") return;
    const pick = (event: MapMouseEvent) => {
      const { x, y } = event.point;
      const layers = ["rn-line", "rn-express-line"].filter(
        (id) =>
          map.getLayer(id) &&
          map.getLayoutProperty(id, "visibility") !== "none",
      );
      return map.queryRenderedFeatures(
        [
          [x - 6, y - 6],
          [x + 6, y + 6],
        ],
        { layers },
      )[0];
    };
    const onClick = (event: MapMouseEvent) => {
      const hit = pick(event);
      if (!hit) return onSelect(null);
      onSelect({
        kind: hit.layer.id === "rn-express-line" ? "expressway" : "road",
        id: Number(hit.properties?.id),
      });
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

  // Frame the requested area, leaving room for the floating panels on desktop.
  useEffect(() => {
    if (!map || status !== "ready" || !fit) return;
    const wide = window.innerWidth >= 1024;
    const [w, s, e, n] = fit.bounds;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      {
        padding: wide
          ? { top: 80, bottom: 60, left: 380, right: 340 }
          : { top: 110, bottom: 160, left: 30, right: 30 },
        maxZoom: 15,
        duration: 700,
      },
    );
  }, [map, status, fit]);

  void selected;
  return null;
}
