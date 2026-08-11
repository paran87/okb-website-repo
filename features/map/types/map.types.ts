import type { StyleSpecification } from "maplibre-gl";

/** Supported basemap style identifiers. */
export type MapStyleId = "dark" | "light" | "satellite" | "terrain";

/** Map lifecycle status. */
export type MapStatus = "idle" | "loading" | "ready" | "error";

/** Layer geometry / rendering kinds supported by the engine. */
export type LayerKind =
  | "point"
  | "line"
  | "polygon"
  | "raster"
  | "vector"
  | "heatmap"
  | "cluster"
  | "fill-extrusion"; // future 3D

/** Layer category for grouping in the layer panel. */
export type LayerCategory =
  | "basemap"
  | "incidents"
  | "critical-areas"
  | "flood-prone"
  | "roads"
  | "waterways"
  | "equipment"
  | "sensors"
  | "weather"
  | "projects"
  | "drainage"
  | "annotations"
  | "custom";

export interface MapStyleDefinition {
  id: MapStyleId;
  label: string;
  style: StyleSpecification;
  /** When true, style slot is reserved but not yet wired to tiles. */
  placeholder?: boolean;
}

export interface LayerLegendItem {
  id: string;
  label: string;
  color: string;
  shape?: "circle" | "square" | "line";
}

export interface LayerMetadata {
  description?: string;
  source?: string;
  updatedAt?: string;
  featureCount?: number;
  tags?: readonly string[];
}

/** Declarative layer configuration for the layer registry. */
export interface LayerConfig {
  id: string;
  sourceId: string;
  label: string;
  kind: LayerKind;
  category: LayerCategory;
  visible: boolean;
  opacity: number;
  order: number;
  /** GeoJSON URL or inline data key from mock registry. */
  dataKey?: string;
  metadata?: LayerMetadata;
  legend?: readonly LayerLegendItem[];
  /** MapLibre layer IDs managed by this config (clusters use multiple). */
  layerIds: readonly string[];
  interactive?: boolean;
  cluster?: boolean;
}

export interface MapEngineOptions {
  styleId?: MapStyleId;
  interactive?: boolean;
  showControls?: boolean;
  showLayerPanel?: boolean;
  showSearch?: boolean;
  showLegend?: boolean;
  showBasemapSwitcher?: boolean;
  /** When set, theme changes do not override the basemap style. */
  lockBasemap?: boolean;
  /** View preset used by the reset-view control. */
  resetViewPreset?: "national" | "ncr" | "philippines";
  /** Restrict panning to a geographic bounding box. */
  maxBounds?: [[number, number], [number, number]];
  /** Subset of basemap styles shown in the switcher. */
  basemapStyles?: readonly MapStyleId[];
  className?: string;
}

export type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  LineString,
  Polygon,
} from "geojson";

export type { LngLat, MapViewport, BoundingBox } from "@/types/geo";
