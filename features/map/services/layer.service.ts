import type { Map as MapLibreMap, GeoJSONSource, AddLayerObject } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { LayerConfig } from "@/features/map/types";
import { geoJsonService } from "@/features/map/services/geojson.service";
import type { MockGeoJsonRegistryKey } from "@/features/map/data/mock";

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
            "fill-color": id.includes("critical")
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
            "line-color": id.includes("critical")
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
      const specs: AddLayerObject[] = [
        {
          id: `${id}-circle`,
          type: "circle" as const,
          source: sourceId,
          paint: {
            "circle-radius": isFloodProne
              ? [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  4,
                  11,
                  6,
                  14,
                  8,
                  16,
                  10,
                ]
              : 7,
            "circle-color": isFloodProne ? "#f97316" : "#22c55e",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": config.opacity,
          },
        },
      ];

      if (isFloodProne) {
        specs.push({
          id: `${id}-labels`,
          type: "symbol" as const,
          source: sourceId,
          minzoom: 13,
          layout: {
            "text-field": ["to-string", ["get", "index"]],
            "text-size": 10,
            "text-font": ["Open Sans Bold"],
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
              "step",
              ["get", "point_count"],
              16,
              10,
              22,
              50,
              28,
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
            "text-size": 11,
            "text-font": ["Open Sans Bold"],
          },
          paint: { "text-color": "#ffffff" },
        },
        {
          id: `${id}-points`,
          type: "circle" as const,
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 8,
            "circle-color": id.includes("incident")
              ? "#dc2626"
              : id.includes("flood-prone")
                ? "#f97316"
                : "#8b5cf6",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": config.opacity,
          },
        },
      ];

    default:
      return [];
  }
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
  },

  ensureLayers(map: MapLibreMap, config: LayerConfig): void {
    const specs = buildLayerSpecs(config);
    for (const spec of specs) {
      if (map.getLayer(spec.id)) continue;
      map.addLayer({
        ...spec,
        layout: { visibility: config.visible ? "visible" : "none" },
      } as AddLayerObject);
    }
    this.applyVisibility(map, config);
    this.applyOpacity(map, config);
  },

  applyVisibility(map: MapLibreMap, config: LayerConfig): void {
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
