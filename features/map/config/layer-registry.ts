import type { FeatureCollection } from "geojson";
import type { LayerConfig } from "@/features/map/types";

/** Mock GeoJSON data keys resolved by GeoJSONService. */
export type MockGeoJsonKey =
  | "incidents"
  | "flood-zones"
  | "deos-flood-prone-areas"
  | "floodwatch-areas"
  | "roads"
  | "sensors";

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
          color: "#7c3aed",
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

/**
 * Flood Monitoring overview — flood-prone zones plus active incidents, which
 * are the NCR Critical Areas records (DEOS 2026 list).
 */
export function createFloodOverviewLayerRegistry(): LayerConfig[] {
  const base = createDefaultLayerRegistry().filter(
    (layer) =>
      !["roads", "sensors", "incidents", "flood-zones"].includes(
        layer.id,
      ),
  );
  const floodwatchAreas: LayerConfig = {
    id: "floodwatch-areas",
    sourceId: "source-floodwatch-areas",
    label: "Flood Prone Areas (Floodwatch)",
    kind: "cluster",
    category: "flood-prone",
    visible: true,
    opacity: 1,
    order: 10,
    dataKey: "floodwatch-areas",
    layerIds: [
      "floodwatch-areas-clusters",
      "floodwatch-areas-cluster-count",
      "floodwatch-areas-points",
    ],
    interactive: true,
    cluster: true,
    legend: [
      { id: "fw-area", label: "Flood-prone area", color: "#7c3aed", shape: "circle" },
    ],
    metadata: {
      description: "Flood Prone Areas tab — Floodwatch national list",
      source: "Floodwatch",
    },
  };
  const ncrIncidents: LayerConfig = {
    id: "ncr-incidents",
    sourceId: "source-ncr-incidents",
    label: "Active Incidents (NCR Critical Areas)",
    kind: "cluster",
    category: "incidents",
    visible: true,
    opacity: 1,
    order: 60,
    dataKey: "deos-flood-prone-areas",
    layerIds: [
      "ncr-incidents-clusters",
      "ncr-incidents-cluster-count",
      "ncr-incidents-points",
    ],
    interactive: true,
    cluster: true,
    legend: [
      { id: "ncr-in", label: "Active incident", color: "#dc2626", shape: "circle" },
    ],
    metadata: {
      description: "NCR Critical Areas — DEOS Updated Flood Prone Areas 2026",
      source: "DEOS Updated Flood Prone Areas 2026",
      featureCount: 123,
    },
  };
  return [...base, floodwatchAreas, ncrIncidents];
}

/** Resolve GeoJSON for a data key (lazy import in service). */
export type GeoJsonLoader = () => Promise<FeatureCollection>;
