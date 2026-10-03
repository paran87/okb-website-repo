import type { Feature, LineString, MultiLineString } from "geojson";

export type RoadClass = "P" | "S" | "T";

export interface RoadProps {
  id: number;
  name: string;
  cls: RoadClass;
  island: string;
  region: string;
  province: string;
  deo: string;
  /** Section length in meters. */
  len: number;
  section: string;
  route: string;
  roadId: string;
  district: string;
  remarks: string;
}

export interface ExpresswayProps {
  id: number;
  name: string;
  way: string;
  island: string;
  region: string;
  len: number;
  route: string;
  status: string;
  project: string;
}

export type RoadFeature = Feature<LineString | MultiLineString, RoadProps>;
export type ExpresswayFeature = Feature<
  LineString | MultiLineString,
  ExpresswayProps
>;

export interface RoadFilters {
  query: string;
  island: string;
  region: string;
  province: string;
  deo: string;
  classes: Record<RoadClass, boolean>;
}

export const CLASS_META: Record<
  RoadClass,
  { label: string; color: string; width: number }
> = {
  P: { label: "Primary", color: "#dc2626", width: 2.4 },
  S: { label: "Secondary", color: "#2563eb", width: 1.8 },
  T: { label: "Tertiary", color: "#16a34a", width: 1.4 },
};

export const EXPRESSWAY_COLOR = "#f59e0b";
export const ALL = "all";

export const DEFAULT_FILTERS: RoadFilters = {
  query: "",
  island: ALL,
  region: ALL,
  province: ALL,
  deo: ALL,
  classes: { P: true, S: true, T: true },
};
