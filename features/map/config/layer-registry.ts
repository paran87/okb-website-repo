import type { FeatureCollection } from "geojson";
import type { LayerConfig } from "@/features/map/types";

/** Mock GeoJSON data keys resolved by GeoJSONService. */
export type MockGeoJsonKey =
  | "incidents"
  | "critical-areas"
  | "flood-zones"
  | "deos-flood-prone-areas"
  | "roads"
  | "sensors"
  | "equipment";

/** Default operational layer registry (mock data, no API). */
export function createDefaultLayerRegistry(): LayerConfig[] {
  return [
    {
      id: "flood-zones",
      sourceId: "source-flood-zones",
      label: "Flood Zones",
      kind: "polygon",
      category: "flood-prone",
      visible: true,
      opacity: 0.45,
      order: 10,
      dataKey: "flood-zones",
      layerIds: ["flood-zones-fill", "flood-zones-outline"],
      interactive: true,
      legend: [
        { id: "fz-normal", label: "Normal", color: "#22c55e", shape: "square" },
        {
          id: "fz-flood-prone",
          label: "Flood-prone zone",
          color: "#f97316",
          shape: "square",
        },
      ],
      metadata: {
        description: "Mock flood-prone polygons for NCR",
        featureCount: 3,
      },
    },
    {
      id: "roads",
      sourceId: "source-roads",
      label: "Road Network",
      kind: "line",
      category: "roads",
      visible: true,
      opacity: 0.9,
      order: 20,
      dataKey: "roads",
      layerIds: ["roads-line"],
      interactive: true,
      legend: [
        { id: "rd1", label: "Road corridor", color: "#f59e0b", shape: "line" },
        { id: "rd2", label: "Closure", color: "#dc2626", shape: "line" },
      ],
    },
    {
      id: "critical-areas",
      sourceId: "source-critical-areas",
      label: "Critical Areas",
      kind: "polygon",
      category: "critical-areas",
      visible: true,
      opacity: 0.35,
      order: 30,
      dataKey: "critical-areas",
      layerIds: ["critical-areas-fill", "critical-areas-outline"],
      interactive: true,
      legend: [
        { id: "ca1", label: "Critical area", color: "#7c3aed", shape: "square" },
      ],
    },
    {
      id: "sensors",
      sourceId: "source-sensors",
      label: "Water Sensors",
      kind: "point",
      category: "sensors",
      visible: true,
      opacity: 1,
      order: 40,
      dataKey: "sensors",
      layerIds: ["sensors-circle"],
      interactive: true,
      legend: [
        { id: "sn1", label: "Sensor online", color: "#22c55e", shape: "circle" },
      ],
    },
    {
      id: "equipment",
      sourceId: "source-equipment",
      label: "Equipment",
      kind: "cluster",
      category: "equipment",
      visible: true,
      opacity: 1,
      order: 50,
      dataKey: "equipment",
      layerIds: [
        "equipment-clusters",
        "equipment-cluster-count",
        "equipment-points",
      ],
      interactive: true,
      cluster: true,
      legend: [
        { id: "eq1", label: "Deployed equipment", color: "#8b5cf6", shape: "circle" },
      ],
    },
    {
      id: "incidents",
      sourceId: "source-incidents",
      label: "Flood Incidents",
      kind: "cluster",
      category: "incidents",
      visible: true,
      opacity: 1,
      order: 60,
      dataKey: "incidents",
      layerIds: [
        "incidents-clusters",
        "incidents-cluster-count",
        "incidents-points",
      ],
      interactive: true,
      cluster: true,
      legend: [
        { id: "in1", label: "Active incident", color: "#dc2626", shape: "circle" },
      ],
    },
  ];
}

/** Flood Monitoring overview — flood zones, critical areas, and incidents only. */
export function createFloodOverviewLayerRegistry(): LayerConfig[] {
  return createDefaultLayerRegistry().filter(
    (layer) => !["roads", "sensors", "equipment"].includes(layer.id),
  );
}

/** Resolve GeoJSON for a data key (lazy import in service). */
export type GeoJsonLoader = () => Promise<FeatureCollection>;
