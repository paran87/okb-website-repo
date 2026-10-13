"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { PlacedArea } from "@/features/floodwatch/lib/place-areas";
import { MAP_LABEL_FONT } from "@/features/map/config/map-styles";
import { popupService } from "@/features/map/services/popup.service";
import { isLiveMap, useMapStore } from "@/features/map/store/map.store";

/** The flood-prone stretch of road (Flood Monitoring). */
export const FLOOD_PRONE_ROAD_COLOR = "#f97316";
/** The flood-prone area marker (Flood Monitoring). */
export const FLOOD_PRONE_AREA_COLOR = "#7c3aed";
/** Dashboard: each mapped area drawn as a road, distinct from live flood depths. */
export const FLOOD_PRONE_NETWORK_COLOR = "#1d4ed8";
/** Soft edge so the dashboard traces read as ribbons, not strokes. */
const FLOOD_PRONE_NETWORK_HALO = "#bfdbfe";

export type FloodProneAppearance = "markers" | "network";

const LINES = "fp-roads";
const POINTS = "fp-areas";
const LAYERS = ["fp-road-casing", "fp-road", "fp-area", "fp-area-label"] as const;
const TAPPABLE = ["fp-area", "fp-road"];

const expr = (e: unknown) => e as ExpressionSpecification;

interface AreaProps {
  title: string;
  description: string;
  status: string;
  province: string;
  deo: string;
  section: string;
}

/** The road name alone, for the small map label: "G. ARANETA AVE (S05322LZ), Florentino St." → "G. ARANETA AVE". */
const shortName = (road: string) => road.replace(/\s*\([^)]*\)/g, "").split(/[,;\n]/)[0]?.trim() || road.trim();

function propsOf({ area, section }: PlacedArea): AreaProps {
  const title = shortName(area.road) || "Flood-prone area";
  return {
    title,
    description: [area.road !== title ? area.road : "", area.limits, area.barangay, area.municipality]
      .filter((v) => v && v !== "—" && v !== "N/A")
      .join(" · "),
    status: area.needsReview ? "Flood-prone · location needs review" : "Flood-prone",
    province: area.province,
    deo: area.deo,
    section: section ?? "Not on the road network",
  };
}

/**
 * Flood Prone Areas (Floodwatch) on the map. Tapping an area or its stretch shows its details.
 *
 * "markers" draws a quarter of each road in orange plus a small violet dot (Flood Monitoring).
 * "network" draws every mapped area as a blue road trace, so the full list stays readable
 * instead of collapsing into cluster circles. A small dot is kept only where the area
 * could not be placed on a road.
 */
export function FloodProneRoadsLayer({
  placed,
  visible = true,
  appearance = "markers",
}: {
  placed: PlacedArea[];
  visible?: boolean;
  appearance?: FloodProneAppearance;
}) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [styleVersion, setStyleVersion] = useState(0);
  const applied = useRef(new Map<string, unknown>());

  const lines = useMemo<FeatureCollection<LineString, AreaProps>>(
    () => ({
      type: "FeatureCollection",
      // Feature ids are the area's index in [placed], shared by its stretch and its marker.
      features: placed.flatMap((p, id) =>
        p.line ? [{ type: "Feature" as const, id, geometry: { type: "LineString" as const, coordinates: p.line }, properties: propsOf(p) }] : [],
      ),
    }),
    [placed],
  );
  const points = useMemo<FeatureCollection<Point, AreaProps>>(
    () => ({
      type: "FeatureCollection",
      features: placed.map((p, id) => ({ type: "Feature", id, geometry: { type: "Point", coordinates: p.at }, properties: propsOf(p) })),
    }),
    [placed],
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
    const sync = (m: MapLibreMap) => {
      for (const [id, data] of [
        [LINES, lines],
        [POINTS, points],
      ] as const) {
        const source = m.getSource(id);
        if (!source) m.addSource(id, { type: "geojson", data, tolerance: 1, buffer: 32 });
        else if (applied.current.get(id) !== data) (source as GeoJSONSource).setData(data);
        applied.current.set(id, data);
      }
      // Under the flooded roads from the received reports, when they are on the map.
      const before = m.getLayer("fm-selected") ? "fm-selected" : undefined;
      const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => {
        if (!m.getLayer(layer.id)) m.addLayer(layer, before);
      };
      const network = appearance === "network";
      add({
        id: "fp-road-casing",
        type: "line",
        source: LINES,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: network
          ? {
              "line-color": FLOOD_PRONE_NETWORK_HALO,
              "line-opacity": 0.95,
              "line-blur": 0.4,
              "line-width": expr(["interpolate", ["linear"], ["zoom"], 8, 3.4, 11, 5, 15, 8]),
            }
          : {
              "line-color": "#ffffff",
              "line-opacity": 0.85,
              "line-width": expr(["interpolate", ["linear"], ["zoom"], 6, 2.5, 11, 5, 15, 9]),
            },
      });
      add({
        id: "fp-road",
        type: "line",
        source: LINES,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": network ? FLOOD_PRONE_NETWORK_COLOR : FLOOD_PRONE_ROAD_COLOR,
          "line-opacity": network ? 0.92 : 1,
          "line-width": network
            ? expr(["interpolate", ["linear"], ["zoom"], 8, 1.5, 11, 2.2, 15, 3.6])
            : expr(["interpolate", ["linear"], ["zoom"], 6, 1.5, 11, 3, 15, 6]),
        },
      });
      add({
        id: "fp-area",
        type: "circle",
        source: POINTS,
        // On the dashboard the road trace is the area. A dot remains only for a place that
        // never landed on the road network, so that row is still on the map.
        ...(network ? { filter: ["==", ["get", "section"], "Not on the road network"] as const } : {}),
        paint: network
          ? {
              "circle-color": FLOOD_PRONE_NETWORK_COLOR,
              "circle-radius": 3,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.25,
            }
          : {
              "circle-color": FLOOD_PRONE_AREA_COLOR,
              "circle-radius": expr(["interpolate", ["linear"], ["zoom"], 5, 2, 10, 3, 14, 4.5, 17, 6]),
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": expr(["interpolate", ["linear"], ["zoom"], 5, 0.75, 12, 1.5]),
            },
      });
      add({
        id: "fp-area-label",
        type: "symbol",
        source: POINTS,
        minzoom: 13,
        layout: {
          "text-field": ["get", "title"],
          "text-font": [...MAP_LABEL_FONT],
          "text-size": expr(["interpolate", ["linear"], ["zoom"], 13, 9, 17, 11]),
          "text-anchor": "top",
          "text-offset": [0, 0.6],
          "text-max-width": 9,
          "text-optional": true,
        },
        paint: {
          "text-color": network ? "#1e3a8a" : "#5b21b6",
          "text-halo-color": "rgba(255,255,255,0.95)",
          "text-halo-width": 1.5,
        },
      });
    };
    const apply = () => {
      if (!isLiveMap(map)) return true;
      if (!map.isStyleLoaded()) return false;
      sync(map);
      for (const id of LAYERS) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
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
  }, [map, status, styleVersion, lines, points, visible, appearance]);

  // Tap an area or its stretch of road for its details.
  useEffect(() => {
    if (!isLiveMap(map) || status !== "ready") return;
    const pick = (event: MapMouseEvent) => {
      const { x, y } = event.point;
      const layers = TAPPABLE.filter((id) => map.getLayer(id));
      if (!layers.length) return undefined;
      // A generous box: the markers are small, taps need ~40 px.
      return map.queryRenderedFeatures(
        [
          [x - 14, y - 14],
          [x + 14, y + 14],
        ],
        { layers },
      )[0];
    };
    const onClick = (event: MapMouseEvent) => {
      // A tap on a flood alert or a flooded road (received reports) opens that instead.
      if ((event.originalEvent.target as Element | null)?.closest?.("[data-flood-alert]")) return;
      const reports = ["fm-point", "fm-line"].filter((id) => map.getLayer(id));
      if (reports.length && map.queryRenderedFeatures(event.point, { layers: reports }).length) return;
      const hit = pick(event);
      if (!hit) return;
      const point = points.features[Number(hit.id)];
      if (!point) return;
      const [lng = 0, lat = 0] = point.geometry.coordinates;
      const feature: Feature<Point, AreaProps> = point;
      // After the map's own click handling, which closes the popup on taps outside its layers.
      window.setTimeout(() => {
        if (!isLiveMap(map)) return;
        const at = map.project([lng, lat]);
        useMapStore.getState().setPopup(popupService.createState(feature, [lng, lat], { x: at.x, y: at.y }));
      }, 0);
    };
    const onMove = (event: MapMouseEvent) => {
      if (pick(event)) map.getCanvas().style.cursor = "pointer";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [map, status, points]);

  return null;
}
