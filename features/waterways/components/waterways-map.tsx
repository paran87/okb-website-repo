"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
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
import {
  OVERLAYS,
  URBS,
  type LngLatBounds,
  type OverlayId,
  type UrbCode,
} from "@/features/waterways/config";

export interface OverlayState {
  on: boolean;
  opacity: number;
}

interface WaterwaysMapProps {
  /** Tile URL template for the river layer (already carries the filters). */
  riverTilesUrl: string;
  overlays: Record<OverlayId, OverlayState>;
  highlight: FeatureCollection;
  floodPoints: Feature<Point>[];
  incidentPoints: Feature<Point>[];
  showFlood: boolean;
  showIncidents: boolean;
  fit: { bounds: LngLatBounds; key: number } | null;
  onIdentify: (lng: number, lat: number, zoom: number) => void;
  onPickBasin: (code: UrbCode) => void;
}

const origin = () => window.location.origin;
const tilesFor = (query: string) =>
  `${origin()}/api/waterways/tiles/{z}/{x}/{y}${query}`;
const rasterId = (id: string) => `ww-r-${id}`;
const POINT_OVERLAYS: OverlayId[] = ["springs", "sampling"];
const AREA_OVERLAYS = OVERLAYS.filter((o) => !POINT_OVERLAYS.includes(o.id));

/** Full-bleed map: DENR river tiles, hazard overlays, highlight and context points. */
export function WaterwaysMap(props: WaterwaysMapProps) {
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
      <WaterwaysLayers {...props} />
    </>
  );
}

function WaterwaysLayers({
  riverTilesUrl,
  overlays,
  highlight,
  floodPoints,
  incidentPoints,
  showFlood,
  showIncidents,
  fit,
  onIdentify,
  onPickBasin,
}: WaterwaysMapProps) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [styleVersion, setStyleVersion] = useState(0);
  /** Bumps whenever the layer stack was rebuilt, so dependent effects re-apply. */
  const [applied, setApplied] = useState(0);

  const dataRef = useRef({ highlight, floodPoints, incidentPoints });
  dataRef.current = { highlight, floodPoints, incidentPoints };

  const basinPoints = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: URBS.map((u) => ({
        type: "Feature",
        properties: { code: u.code, name: u.name.replace(" River Basin", "") },
        geometry: {
          type: "Point",
          coordinates: [
            (u.bounds[0] + u.bounds[2]) / 2,
            (u.bounds[1] + u.bounds[3]) / 2,
          ],
        },
      })),
    }),
    [],
  );

  // Rebuild the layer stack after a basemap switch or when the river filters change.
  useEffect(() => {
    if (!map || status !== "ready") return;
    const rebuild = () => setStyleVersion((v) => v + 1);
    map.on("style.load", rebuild);
    return () => {
      map.off("style.load", rebuild);
    };
  }, [map, status]);

  useEffect(() => {
    if (!map || status !== "ready" || !map.isStyleLoaded()) return;
    const clear = (m: MapLibreMap) => {
      for (const layer of m.getStyle().layers ?? [])
        if (layer.id.startsWith("ww-")) m.removeLayer(layer.id);
      for (const id of Object.keys(m.getStyle().sources ?? {}))
        if (id.startsWith("ww-")) m.removeSource(id);
    };
    clear(map);

    const raster = (id: string, query: string, minzoom = 0) => {
      map.addSource(rasterId(id), {
        type: "raster",
        tiles: [tilesFor(query)],
        tileSize: 512,
        minzoom,
        maxzoom: 18,
        attribution: "DENR INREMP GDSS",
      });
      map.addLayer({
        id: rasterId(id),
        type: "raster",
        source: rasterId(id),
        paint: { "raster-fade-duration": 150 },
      });
    };
    for (const o of AREA_OVERLAYS) raster(o.id, `?o=${o.id}`);
    raster("rivers", riverTilesUrl);
    for (const o of OVERLAYS.filter((o) => POINT_OVERLAYS.includes(o.id)))
      raster(o.id, `?o=${o.id}`, 9);

    const data = dataRef.current;
    map.addSource("ww-highlight", { type: "geojson", data: data.highlight });
    map.addLayer({
      id: "ww-highlight-glow",
      type: "line",
      source: "ww-highlight",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#facc15",
        "line-opacity": 0.6,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          6,
          12,
          12,
          16,
          20,
        ],
        "line-blur": 3,
      },
    });
    map.addLayer({
      id: "ww-highlight-line",
      type: "line",
      source: "ww-highlight",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0f172a",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          1.8,
          12,
          3.2,
          16,
          6,
        ],
      },
    });

    map.addSource("ww-flood", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.floodPoints },
    });
    map.addLayer({
      id: "ww-flood-points",
      type: "circle",
      source: "ww-flood",
      paint: {
        "circle-color": "#7c3aed",
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          2.5,
          10,
          4.5,
          14,
          8,
        ],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
        "circle-opacity": 0.9,
      },
    });
    map.addSource("ww-incidents", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.incidentPoints },
    });
    map.addLayer({
      id: "ww-incident-points",
      type: "circle",
      source: "ww-incidents",
      paint: {
        "circle-color": "#e11d48",
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          3,
          10,
          5,
          14,
          8,
        ],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1.5,
      },
    });

    // Basin markers guide the eye at national zoom, where the rivers are hairlines.
    map.addSource("ww-basins", { type: "geojson", data: basinPoints });
    map.addLayer({
      id: "ww-basin-dots",
      type: "circle",
      source: "ww-basins",
      maxzoom: 9,
      paint: {
        "circle-color": "#0369a1",
        "circle-radius": 7,
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2.5,
      },
    });
    map.addLayer({
      id: "ww-basin-labels",
      type: "symbol",
      source: "ww-basins",
      maxzoom: 9,
      layout: {
        "text-field": ["get", "name"],
        "text-font": [...MAP_LABEL_FONT],
        "text-size": 12,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#0c4a6e",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    });
    setApplied((n) => n + 1);
  }, [map, status, styleVersion, riverTilesUrl, basinPoints]);

  // Visibility / opacity of the toggled layers.
  useEffect(() => {
    if (!map || status !== "ready" || applied === 0) return;
    for (const o of OVERLAYS) {
      const id = rasterId(o.id);
      if (!map.getLayer(id)) continue;
      map.setLayoutProperty(
        id,
        "visibility",
        overlays[o.id].on ? "visible" : "none",
      );
      map.setPaintProperty(id, "raster-opacity", overlays[o.id].opacity);
    }
    const vis = (id: string, on: boolean) =>
      map.getLayer(id) &&
      map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("ww-flood-points", showFlood);
    vis("ww-incident-points", showIncidents);
  }, [map, status, applied, overlays, showFlood, showIncidents]);

  // Push changed data into the existing sources.
  useEffect(() => {
    if (!map || applied === 0) return;
    const set = (id: string, data: FeatureCollection) =>
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set("ww-highlight", highlight);
    set("ww-flood", { type: "FeatureCollection", features: floodPoints });
    set("ww-incidents", {
      type: "FeatureCollection",
      features: incidentPoints,
    });
  }, [map, applied, highlight, floodPoints, incidentPoints]);

  // Click a basin marker to go there; click anywhere else to identify the river under it.
  useEffect(() => {
    if (!map || status !== "ready") return;
    const onClick = (event: MapMouseEvent) => {
      const marker = map.getLayer("ww-basin-dots")
        ? map.queryRenderedFeatures(event.point, {
            layers: ["ww-basin-dots"],
          })[0]
        : undefined;
      if (marker)
        return onPickBasin(String(marker.properties?.code) as UrbCode);
      onIdentify(event.lngLat.lng, event.lngLat.lat, map.getZoom());
    };
    const onMove = (event: MapMouseEvent) => {
      const overMarker =
        map.getLayer("ww-basin-dots") &&
        map.queryRenderedFeatures(event.point, { layers: ["ww-basin-dots"] })
          .length > 0;
      map.getCanvas().style.cursor = overMarker ? "pointer" : "crosshair";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [map, status, onIdentify, onPickBasin]);

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
          : { top: 110, bottom: 170, left: 30, right: 30 },
        maxZoom: 14,
        duration: 800,
      },
    );
  }, [map, status, fit]);

  return null;
}
