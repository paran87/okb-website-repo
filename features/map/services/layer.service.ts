import type { Map as MapLibreMap, GeoJSONSource, AddLayerObject } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { LayerConfig } from "@/features/map/types";
import { geoJsonService } from "@/features/map/services/geojson.service";
import { MAP_LABEL_FONT } from "@/features/map/config/map-styles";
import { CLOUD_ICON_PREFIX, ensureCloudIcons } from "@/features/weather/lib/cloud-icons";
import type { MockGeoJsonRegistryKey } from "@/features/map/data/mock";

/** Circle size scales hard with zoom — tiny when zoomed out, clear when zoomed in. */
const ZOOM_CIRCLE_RADIUS: [
  "interpolate",
  ["linear"],
  ["zoom"],
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  1.5,
  6,
  2,
  8,
  3,
  10,
  4.5,
  12,
  6.5,
  15,
  10,
];

const ZOOM_CIRCLE_STROKE: [
  "interpolate",
  ["linear"],
  ["zoom"],
  number,
  number,
  number,
  number,
  number,
  number,
] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  0.5,
  10,
  1,
  15,
  1.75,
];

/** MapLibre paint/layout specs per layer kind. */
export function buildLayerSpecs(config: LayerConfig) {
  const { id, sourceId, kind } = config;

  switch (kind) {
    case "polygon":
      return [
        {
          id: `${id}-fill`,
          type: "fill" as const,
          source: sourceId,
          paint: {
            "fill-color": id.includes("weather-advisory")
              ? [
                  "match",
                  ["get", "advisoryLevel"],
                  "warning",
                  "#ea580c",
                  "alert",
                  "#eab308",
                  "watch",
                  "#14b8a6",
                  "monsoon",
                  "#7c3aed",
                  "#64748b",
                ]
              : id.includes("critical")
                ? "#7c3aed"
                : [
                    "match",
                    ["get", "riskLevel"],
                    "normal",
                    "#22c55e",
                    "flood-prone",
                    "#f97316",
                    "#f97316",
                  ],
            "fill-opacity": config.opacity,
          },
        },
        {
          id: `${id}-outline`,
          type: "line" as const,
          source: sourceId,
          paint: {
            "line-color": id.includes("weather-advisory")
              ? [
                  "match",
                  ["get", "advisoryLevel"],
                  "warning",
                  "#c2410c",
                  "alert",
                  "#ca8a04",
                  "watch",
                  "#0f766e",
                  "monsoon",
                  "#5b21b6",
                  "#475569",
                ]
              : id.includes("critical")
                ? "#6d28d9"
                : [
                    "match",
                    ["get", "riskLevel"],
                    "normal",
                    "#16a34a",
                    "flood-prone",
                    "#ea580c",
                    "#ea580c",
                  ],
            "line-width": 2,
            "line-opacity": Math.min(config.opacity + 0.3, 1),
          },
        },
      ];

    case "line":
      return [
        {
          id: `${id}-line`,
          type: "line" as const,
          source: sourceId,
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "closed"], true],
              "#dc2626",
              "#f59e0b",
            ],
            "line-width": 4,
            "line-opacity": config.opacity,
          },
        },
      ];

    case "point": {
      const isFloodProne =
        id.includes("flood-prone") || id.includes("deos");
      const isWeatherStation = id.includes("weather-station");
      if (isWeatherStation) {
        // PAGASA-style cloud icon + city/temperature label. Keeps the
        // "-circle" id so layerIds, popups and the radar overlay still resolve.
        return [
          {
            id: `${id}-circle`,
            type: "symbol" as const,
            source: sourceId,
            layout: {
              "icon-image": ["concat", CLOUD_ICON_PREFIX, ["get", "condition"]],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 7, 0.8, 10, 1, 14, 1.3],
              "icon-allow-overlap": true,
              "text-field": [
                "format",
                ["get", "name"],
                {},
                "\n",
                {},
                ["concat", ["to-string", ["get", "temperature"]], "°C"],
                { "font-scale": 0.9 },
              ],
              "text-size": ["interpolate", ["linear"], ["zoom"], 5.5, 9, 9, 11, 13, 13],
              "text-font": [...MAP_LABEL_FONT],
              "text-offset": [0, 1.4],
              "text-anchor": "top",
              "text-max-width": 7,
              "text-optional": true,
              "text-allow-overlap": false,
            },
            paint: {
              "icon-opacity": config.opacity,
              "text-color": "#0f172a",
              "text-halo-color": "rgba(255,255,255,0.95)",
              "text-halo-width": 2,
              "text-opacity": ["step", ["zoom"], 0, 5.5, 1],
            },
          } as AddLayerObject,
        ];
      }

      const specs: AddLayerObject[] = [
        {
          id: `${id}-circle`,
          type: "circle" as const,
          source: sourceId,
          paint: {
            "circle-radius": [...ZOOM_CIRCLE_RADIUS],
            "circle-color": isFloodProne
              ? [
                  "match",
                  ["get", "geocodeMethod"],
                  "road-lookup",
                  "#2563eb",
                  "#f97316",
                ]
              : "#22c55e",
            "circle-stroke-width": [...ZOOM_CIRCLE_STROKE],
            "circle-stroke-color": "#ffffff",
            "circle-opacity": config.opacity,
          },
        },
      ];

      if (isFloodProne) {
        // Highlight ring for the selected record; the page drives its filter.
        specs.push({
          id: `${id}-selected`,
          type: "circle" as const,
          source: sourceId,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-radius": 11,
            "circle-color": "#f97316",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#0f172a",
          },
        });
        specs.push({
          id: `${id}-labels`,
          type: "symbol" as const,
          source: sourceId,
          minzoom: 13,
          layout: {
            "text-field": ["to-string", ["get", "index"]],
            "text-size": 10,
            "text-font": [...MAP_LABEL_FONT],
            "text-offset": [0, -1.4],
            "text-anchor": "top",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#991b1b",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      }

      return specs;
    }

    case "cluster":
      return [
        {
          id: `${id}-clusters`,
          type: "circle" as const,
          source: sourceId,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": id.includes("incident")
              ? "#dc2626"
              : id.includes("flood-prone")
                ? "#f97316"
                : "#8b5cf6",
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              ["step", ["get", "point_count"], 8, 10, 11, 50, 14],
              8,
              ["step", ["get", "point_count"], 12, 10, 16, 50, 20],
              12,
              ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
              16,
              ["step", ["get", "point_count"], 20, 10, 26, 50, 32],
            ],
            "circle-opacity": config.opacity,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        },
        {
          id: `${id}-cluster-count`,
          type: "symbol" as const,
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4,
              9,
              12,
              11,
            ],
            "text-font": [...MAP_LABEL_FONT],
          },
          paint: { "text-color": "#ffffff" },
        },
        {
          id: `${id}-points`,
          type: "circle" as const,
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": [...ZOOM_CIRCLE_RADIUS],
            "circle-color": id.includes("incident")
              ? "#dc2626"
              : id.includes("flood-prone")
                ? "#f97316"
                : "#8b5cf6",
            "circle-stroke-width": [...ZOOM_CIRCLE_STROKE],
            "circle-stroke-color": "#ffffff",
            "circle-opacity": config.opacity,
          },
        },
      ];

    default:
      return [];
  }
}

/**
 * MapLibre rejects source and layer mutations while a style swap is in flight.
 * Every caller awaits GeoJSON between steps, so the basemap can be replaced
 * underneath them — and `mapService.setStyle` re-applies the whole registry on
 * `style.load` anyway, making a swap a no-op rather than a failure.
 */
function isStyleSwapError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Style is not done loading")
  );
}

/**
 * A removed map still answers method calls but has torn down its style, so it
 * throws from deep inside MapLibre. Callers await GeoJSON before touching the
 * map and it can be disposed meanwhile (navigation, retry, Strict Mode
 * remount), so every entry point has to re-check.
 */
function isMapUsable(map: MapLibreMap | null | undefined): map is MapLibreMap {
  return Boolean(map?.style);
}

/** Adds / updates / removes MapLibre sources and layers from registry configs. */
export const layerService = {
  async ensureSource(
    map: MapLibreMap,
    config: LayerConfig,
  ): Promise<void> {
    const dataKey = config.dataKey as MockGeoJsonRegistryKey | undefined;
    if (!dataKey) return;

    const data = await geoJsonService.get(dataKey);
    if (!isMapUsable(map)) return;

    try {
      const existing = map.getSource(config.sourceId);

      if (existing && existing.type === "geojson") {
        (existing as GeoJSONSource).setData(data);
        return;
      }

      map.addSource(config.sourceId, {
        type: "geojson",
        data,
        cluster: config.cluster ?? false,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        generateId: true,
      });
    } catch (error) {
      if (!isStyleSwapError(error)) throw error;
    }
  },

  ensureLayers(map: MapLibreMap, config: LayerConfig): void {
    if (!isMapUsable(map)) return;
    // A layer whose source was dropped by a style swap cannot be added yet.
    if (config.dataKey && !map.getSource(config.sourceId)) return;

    const specs = buildLayerSpecs(config);
    try {
      if (config.id.includes("weather-station")) ensureCloudIcons(map);
      for (const spec of specs) {
        if (map.getLayer(spec.id)) {
          // Refresh paint so zoom-scaled circle sizes apply after code updates
          // without requiring a full map remount.
          const paint = "paint" in spec ? spec.paint : undefined;
          if (paint) {
            for (const [key, value] of Object.entries(paint)) {
              map.setPaintProperty(spec.id, key, value);
            }
          }
          continue;
        }
        map.addLayer({
          ...spec,
          layout: {
            ...("layout" in spec ? spec.layout : undefined),
            visibility: config.visible ? "visible" : "none",
          },
        } as AddLayerObject);
      }
    } catch (error) {
      if (!isStyleSwapError(error)) throw error;
      return;
    }
    this.applyVisibility(map, config);
    this.applyOpacity(map, config);
  },

  applyVisibility(map: MapLibreMap, config: LayerConfig): void {
    if (!isMapUsable(map)) return;
    for (const layerId of config.layerIds) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(
        layerId,
        "visibility",
        config.visible ? "visible" : "none",
      );
    }
  },

  applyOpacity(map: MapLibreMap, config: LayerConfig): void {
    if (!isMapUsable(map)) return;
    for (const layerId of config.layerIds) {
      if (!map.getLayer(layerId)) continue;
      const type = map.getLayer(layerId)?.type;
      if (type === "fill") {
        map.setPaintProperty(layerId, "fill-opacity", config.opacity);
      } else if (type === "line") {
        map.setPaintProperty(layerId, "line-opacity", config.opacity);
      } else if (type === "circle") {
        map.setPaintProperty(layerId, "circle-opacity", config.opacity);
      }
    }
  },

  reorder(map: MapLibreMap, configs: readonly LayerConfig[]): void {
    if (!isMapUsable(map)) return;
    const sorted = [...configs].sort((a, b) => a.order - b.order);
    for (const config of sorted) {
      for (const layerId of config.layerIds) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId);
        }
      }
    }
  },

  remove(map: MapLibreMap, config: LayerConfig): void {
    if (!isMapUsable(map)) return;
    for (const layerId of config.layerIds) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    if (map.getSource(config.sourceId)) map.removeSource(config.sourceId);
  },

  getInteractiveLayerIds(configs: readonly LayerConfig[]): string[] {
    return configs
      .filter((c) => c.interactive && c.visible)
      .flatMap((c) => [...c.layerIds]);
  },

  collectLegend(configs: readonly LayerConfig[]) {
    return configs
      .filter((c) => c.visible && c.legend)
      .flatMap((c) => c.legend ?? []);
  },
};

export type { FeatureCollection };
