import type { Feature, FeatureCollection, Point } from "geojson";
import type { LngLat } from "@/types/geo";

/** Marker visual tone aligned with design-system signal colors. */
export type MarkerTone =
  | "default"
  | "flood"
  | "critical"
  | "equipment"
  | "warning"
  | "success"
  | "offline";

/** Marker priority for operational sorting. */
export type MarkerPriority = "critical" | "high" | "medium" | "low";

export interface MarkerProperties {
  id: string;
  title: string;
  tone?: MarkerTone;
  priority?: MarkerPriority;
  status?: string;
  category?: string;
  pulse?: boolean;
  selected?: boolean;
  [key: string]: unknown;
}

export type MarkerFeature = Feature<Point, MarkerProperties>;
export type MarkerCollection = FeatureCollection<Point, MarkerProperties>;

export interface MarkerConfig {
  id: string;
  coordinates: LngLat;
  properties: MarkerProperties;
}

export interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string;
}
